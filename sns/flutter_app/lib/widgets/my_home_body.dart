// flutter_app/lib/widgets/my_home_body.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/gcs_service.dart';

class MyHomePageBody extends ConsumerStatefulWidget {
  final VoidCallback? onEditPressed;

  const MyHomePageBody({super.key, this.onEditPressed});

  @override
  ConsumerState<MyHomePageBody> createState() => _MyHomePageBodyState();
}

class _MyHomePageBodyState extends ConsumerState<MyHomePageBody> {
  String? avatarIconUrl;

  @override
  void initState() {
    super.initState();
    _fetchAvatarIcon();
  }

  Future<void> _fetchAvatarIcon() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    await _fetchCloudStorageAvatar();
  }

  Future<void> _fetchCloudStorageAvatar() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      // Google Cloud Storageから直接画像URLを取得
      final downloadUrl = GcsService.getAvatarIconUrl(user.uid);
      
      if (downloadUrl != null) {
        // オブジェクトが存在するかチェック
        final exists = await GcsService.objectExists('avatar_icons/${user.uid}/icon.png');
        
        if (exists) {
          debugPrint('📸 Google Cloud Storage URL: $downloadUrl');
          
          if (mounted) {
            setState(() {
              avatarIconUrl = '$downloadUrl?ts=${DateTime.now().millisecondsSinceEpoch}';
            });
          }
        } else {
          debugPrint('ℹ️ アバター画像が見つかりません');
        }
      }
    } catch (e) {
      debugPrint('❌ Google Cloud Storage エラー: $e');
      // ファイルが存在しない場合は何もしない（デフォルトアバターを表示）
    }
  }

  @override
Widget build(BuildContext context) {
  if (avatarIconUrl != null) {
    debugPrint('👀 表示URL: $avatarIconUrl');
  }

  return SingleChildScrollView(
    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircleAvatar(
          radius: 40,
          backgroundColor: Colors.grey[300],
          backgroundImage: avatarIconUrl != null 
              ? NetworkImage(avatarIconUrl!) 
              : null,
          child: avatarIconUrl == null 
              ? const Icon(Icons.person, size: 40, color: Colors.white)
              : null,
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: widget.onEditPressed,
          icon: const Icon(Icons.edit),
          label: const Text('アバターを編集'),
        ),
      ],
    ),
  );
}

}