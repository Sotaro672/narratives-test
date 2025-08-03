// C:\Users\caota\narratives-test\flutter_app\lib\screens\avatar_registry_screen.dart
import 'package:flutter/material.dart';
import 'main_screen.dart';
import '../models/avatar.dart';
import '../models/wallet.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'dart:typed_data'; 

class AvatarRegistryScreen extends StatefulWidget {
  const AvatarRegistryScreen({super.key});

  @override
  State<AvatarRegistryScreen> createState() => _AvatarRegistryScreenState();
}

class _AvatarRegistryScreenState extends State<AvatarRegistryScreen> {
  final _avatarNameController = TextEditingController();
  final _iconUrlController = TextEditingController();
  final _bioController = TextEditingController();
  final _linkController = TextEditingController();
  File? _iconImage;

  @override
  void dispose() {
    _avatarNameController.dispose();
    _iconUrlController.dispose();
    _bioController.dispose();
    _linkController.dispose();
    super.dispose();
  }

  /// Solanaの鍵ペアを生成して公開鍵を Base58 形式で返す
  Future<String> _generateSolanaKeyPair() async {
    final algorithm = Ed25519();
    final keyPair = await algorithm.newKeyPair();
    final publicKey = await keyPair.extractPublicKey();
    final publicKeyBytes = publicKey.bytes;
    
    // Base58エンコーディング（簡易実装）
    return _base58Encode(Uint8List.fromList(publicKeyBytes));
  }

  /// Base58エンコーディングの簡易実装
  String _base58Encode(Uint8List bytes) {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    BigInt num = BigInt.zero;
    
    for (int byte in bytes) {
      num = num * BigInt.from(256) + BigInt.from(byte);
    }
    
    String result = '';
    while (num > BigInt.zero) {
      final remainder = num % BigInt.from(58);
      result = '${alphabet[remainder.toInt()]}$result';
      num = num ~/ BigInt.from(58);
    }
    
    // 先頭の0バイトに対応する'1'を追加
    for (int byte in bytes) {
      if (byte == 0) {
        result = '1$result';
      } else {
        break;
      }
    }
    
    return result;
  }

  Future<void> _submit() async {
    final avatarName = _avatarNameController.text.trim();
    final bio = _bioController.text.trim();
    final link = _linkController.text.trim();

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    String iconUrl = '';
    if (_iconImage != null) {
      final uploadedUrl = await _uploadAvatarImage(_iconImage!, user.uid);
      if (uploadedUrl != null) {
        iconUrl = uploadedUrl;
      }
    }

    // Solanaの公開鍵を生成
    final solanaPublicKey = await _generateSolanaKeyPair();

    // Solanaウォレットを作成（公開鍵をwalletAddressとして使用）
    final wallet = Wallet(
      walletAddress: solanaPublicKey,
      userId: user.uid,
      status: WalletStatus.hot,
      balance: 0,
      createdAt: DateTime.now(),
    );

    // ウォレットをFirestoreに保存
    await FirebaseFirestore.instance
        .collection('wallets')
        .doc(wallet.walletAddress)
        .set(wallet.toJson());

    final avatar = Avatar(
      avatarId: '',
      userId: user.uid,
      avatarName: avatarName,
      iconUrl: iconUrl,
      bio: bio,
      link: link,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(), 
      iconStoragePath: '',
    );

    // Firestoreへ登録
    final docRef = FirebaseFirestore.instance.collection('avatars').doc();
    await docRef.set(avatar.toMap()..['avatar_id'] = docRef.id);

    // 登録後にMainScreenへ遷移
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainScreen()),
      );
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _iconImage = File(pickedFile.path);
        _iconUrlController.text = pickedFile.path; // 一時的にパスを保存
      });
    }
  }

  Future<String?> _uploadAvatarImage(File imageFile, String userId) async {
  try {
    // 1. GraphQL API から署名付きURLを取得
    final fileName = 'avatar_icons/$userId/icon.png';

final response = await http.post(
  Uri.parse('https://narratives-api-765852113927.asia-northeast1.run.app/query'), 
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    "query": '''
      mutation GetSignedUrl(\$filename: String!) {
        getAvatarUploadUrl(filename: \$filename) {
          signedUrl
          publicUrl
        }
      }
    ''',
    "variables": {
      "filename": fileName
    }
  }),
);
    if (response.statusCode != 200) {
      debugPrint('署名URL取得失敗: ${response.body}');
      return null;
    }

    final json = response.body;
    final Map<String, dynamic> jsonMap = jsonDecode(json);
    final signedUrl = jsonMap['data']['getAvatarUploadUrl']['signedUrl'];
    final publicUrl = jsonMap['data']['getAvatarUploadUrl']['publicUrl'];

    final imageBytes = await imageFile.readAsBytes();
    final uploadRes = await http.put(
      Uri.parse(signedUrl),
      headers: {'Content-Type': 'image/png'},
      body: imageBytes,
    );

    if (uploadRes.statusCode == 200) {
      return publicUrl;
    } else {
      debugPrint('アップロード失敗: ${uploadRes.body}');
      return null;
    }
  } catch (e) {
    debugPrint('アップロード中の例外: $e');
    return null;
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('アバター登録')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _avatarNameController,
              decoration: const InputDecoration(labelText: 'アバター名'),
            ),
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                height: 120,
                width: 120,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(60),
                ),
                child: _iconImage != null
                    ? ClipOval(child: Image.file(_iconImage!, fit: BoxFit.cover))
                    : const Icon(Icons.add_a_photo, size: 48, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 8),
            const Text('アイコン画像をアップロード'),
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
              onPressed: _submit,
              child: const Text('登録'),
            ),
          ],
        ),
      ),
    );
  }
}
