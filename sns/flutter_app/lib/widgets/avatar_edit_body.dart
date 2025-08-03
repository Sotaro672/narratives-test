// lib/widgets/avatar_edit_body.dart
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart'; // kIsWeb
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;

import '../models/avatar.dart';
import '../main.dart'; // graphQLClientProvider が定義されているファイル

class AvatarEditBody extends ConsumerStatefulWidget {
  const AvatarEditBody({super.key});

  @override
  ConsumerState<AvatarEditBody> createState() => _AvatarEditBodyState();
}

class _AvatarEditBodyState extends ConsumerState<AvatarEditBody> {
  final _avatarNameController = TextEditingController();
  final _iconUrlController = TextEditingController();
  final _bioController = TextEditingController();
  final _linkController = TextEditingController();

  File? _iconImage;
  Uint8List? _webImageBytes; // Web用
  String? _avatarDocId;
  String? _existingStoragePath;
  String? _currentAvatarImageUrl; // 現在のアバター画像URL

  @override
  void initState() {
    super.initState();
    _loadAvatar();
  }

  Future<void> _loadAvatar() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    // Firestoreからアバター情報を取得
    final query = await FirebaseFirestore.instance
        .collection('avatars')
        .where('user_id', isEqualTo: user.uid)
        .limit(1)
        .get();

    if (query.docs.isNotEmpty) {
      final doc = query.docs.first;
      final data = doc.data();
      final avatar = Avatar.fromMap(data);

      setState(() {
        _avatarDocId = doc.id;
        _avatarNameController.text = avatar.avatarName;
        _iconUrlController.text = avatar.iconUrl;
        _bioController.text = avatar.bio;
        _linkController.text = avatar.link;
        _existingStoragePath = avatar.iconStoragePath;
      });

      // GraphQLで現在のアバター画像URLを取得
      await _fetchCurrentAvatarImage();
    }
  }

  // GraphQLで現在のアバター画像URLを取得
  Future<void> _fetchCurrentAvatarImage() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final filename = 'avatar_icons/${user.uid}/icon.png';

    try {
      final client = ref.read(graphQLClientProvider);

      final result = await client.query(
        QueryOptions(
          document: gql('''
            query GetAvatarPublicUrl(\$filename: String!) {
              getAvatarPublicUrl(filename: \$filename)
            }
          '''),
          variables: {'filename': filename},
          fetchPolicy: FetchPolicy.networkOnly, // キャッシュを無視
        ),
      );

      if (!result.hasException && result.data != null) {
        final url = result.data?['getAvatarPublicUrl'];
        if (url != null && mounted) {
          setState(() {
            _currentAvatarImageUrl = '$url?ts=${DateTime.now().millisecondsSinceEpoch}';
          });
          debugPrint('📸 Current avatar URL loaded: $_currentAvatarImageUrl');
        }
      } else {
        debugPrint('❌ GraphQL エラー: ${result.exception}');
      }
    } catch (e) {
      debugPrint('❌ アバター画像取得エラー: $e');
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      if (kIsWeb) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          _webImageBytes = bytes;
          _iconUrlController.text = 'web_image_selected';
        });
      } else {
        setState(() {
          _iconImage = File(pickedFile.path);
          _iconUrlController.text = pickedFile.path;
        });
      }
    }
  }

  Future<Map<String, String>?> _uploadAvatarImage({required String userId}) async {
    try {
      final fileName = 'avatar_icons/$userId/icon.png';
      final baseUrl = 'https://narratives-api-765852113927.asia-northeast1.run.app';
      final url = '$baseUrl/query';

      final requestBody = jsonEncode({
        "query": '''
          mutation GetSignedUrl(\$filename: String!) {
            getAvatarUploadUrl(filename: \$filename) {
              signedUrl
              publicUrl
            }
          }
        ''',
        "variables": {
          "filename": fileName,
        }
      });

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: requestBody,
      );

      final Map<String, dynamic> jsonMap = jsonDecode(response.body);
      if (jsonMap.containsKey('errors')) {
        debugPrint('GraphQL Errors: ${jsonMap['errors']}');
        return null;
      }

      final uploadData = jsonMap['data']['getAvatarUploadUrl'];
      final signedUrl = uploadData['signedUrl'];
      final publicUrl = uploadData['publicUrl'];

      final imageBytes = kIsWeb
          ? _webImageBytes
          : await _iconImage?.readAsBytes();

      if (imageBytes == null) return null;

      final uploadRes = await http.put(
        Uri.parse(signedUrl),
        headers: {'Content-Type': 'image/png'},
        body: imageBytes,
      );

      if (uploadRes.statusCode == 200) {
        return {
          'publicUrl': publicUrl,
          'storagePath': fileName,
        };
      } else {
        debugPrint('Upload failed: ${uploadRes.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Upload error: $e');
      return null;
    }
  }

  Future<void> _update() async {
    final avatarName = _avatarNameController.text.trim();
    final bio = _bioController.text.trim();
    final link = _linkController.text.trim();
    String iconUrl = _iconUrlController.text.trim();
    String iconStoragePath = _existingStoragePath ?? '';

    final user = FirebaseAuth.instance.currentUser;
    if (user == null || _avatarDocId == null) return;

    bool imageUploaded = false;

    if (_iconImage != null || _webImageBytes != null) {
      final uploadResult = await _uploadAvatarImage(userId: user.uid);
      if (uploadResult != null) {
        iconUrl = uploadResult['publicUrl']!;
        iconStoragePath = uploadResult['storagePath']!;
        _iconUrlController.text = iconUrl;
        imageUploaded = true;
      }
    }

    final updatedAvatar = Avatar(
      avatarId: _avatarDocId!,
      userId: user.uid,
      avatarName: avatarName,
      iconUrl: iconUrl,
      iconStoragePath: iconStoragePath,
      bio: bio,
      link: link,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await FirebaseFirestore.instance
        .collection('avatars')
        .doc(_avatarDocId)
        .update(updatedAvatar.toMap());

    // 画像がアップロードされた場合、新しい画像URLを取得
    if (imageUploaded) {
      setState(() {
        _iconImage = null;
        _webImageBytes = null;
      });
      await _fetchCurrentAvatarImage();
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('更新しました')),
      );
    }
  }

  @override
  void dispose() {
    _avatarNameController.dispose();
    _iconUrlController.dispose();
    _bioController.dispose();
    _linkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 画像表示の優先順位:
    // 1. 新しく選択された画像 (_iconImage, _webImageBytes)
    // 2. Googleアカウントのアバター画像 (_googlePhotoUrl)
    // 3. GraphQLで取得した現在のアバター画像 (_currentAvatarImageUrl)
    // 4. Firestoreに保存されているURL (_iconUrlController.text)
    // 5. デフォルト画像
    
    ImageProvider? imageProvider;
    Widget? avatarChild;

    if (_iconImage != null) {
      // 新しく選択されたファイル画像
      imageProvider = FileImage(_iconImage!);
    } else if (_webImageBytes != null) {
      // 新しく選択されたWeb画像
      imageProvider = MemoryImage(_webImageBytes!);
    } else if (_currentAvatarImageUrl != null && _currentAvatarImageUrl!.isNotEmpty) {
      // GraphQLで取得した現在のアバター画像
      imageProvider = NetworkImage(_currentAvatarImageUrl!);
    } else if (_iconUrlController.text.startsWith('http')) {
      // Firestoreに保存されているURL
      imageProvider = NetworkImage(_iconUrlController.text);
    } else {
      // デフォルトアイコン
      avatarChild = const Icon(Icons.person, size: 60, color: Colors.white);
    }    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              // 現在の画像状態を表示
              Container(
                padding: const EdgeInsets.all(8.0),
                margin: const EdgeInsets.only(bottom: 16.0),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8.0),
                ),
                child: Column(
                  children: [
                    const Text(
                      '現在のアバター画像',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.grey[300],
                      backgroundImage: imageProvider,
                      child: avatarChild,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _getImageStatusText(),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: _pickImage,
                icon: const Icon(Icons.image),
                label: const Text('アイコン画像を変更'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _avatarNameController,
                decoration: const InputDecoration(labelText: 'アバター名'),
              ),
              TextField(
                controller: _bioController,
                decoration: const InputDecoration(labelText: '自己紹介文'),
                maxLines: 3,
              ),
              TextField(
                controller: _linkController,
                decoration: const InputDecoration(labelText: '外部リンク'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _update,
                child: const Text('更新'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getImageStatusText() {
    if (_iconImage != null || _webImageBytes != null) {
      return '新しい画像が選択されています';
    } else if (_currentAvatarImageUrl != null && _currentAvatarImageUrl!.isNotEmpty) {
      return '登録済みのアバター画像';
    } else if (_iconUrlController.text.startsWith('http')) {
      return 'Firestore保存URL';
    } else {
      return 'デフォルト画像';
    }
  }
}
