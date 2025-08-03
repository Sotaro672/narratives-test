import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class PasswordUpdateBody extends StatelessWidget {
  const PasswordUpdateBody({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmNewPasswordController = TextEditingController();

    if (user == null || user.email == null) {
      return const Center(child: Text('ユーザー情報が取得できません'));
    }

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: currentPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: '現在のパスワード'),
            ),
            TextField(
              controller: newPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: '新しいパスワード'),
            ),
            TextField(
              controller: confirmNewPasswordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: '新しいパスワード（確認）'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () async {
                final currentPassword = currentPasswordController.text.trim();
                final newPassword = newPasswordController.text.trim();
                final confirmPassword = confirmNewPasswordController.text.trim();

                if (newPassword != confirmPassword) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('パスワードが一致しません')),
                  );
                  return;
                }

                try {
                  final cred = EmailAuthProvider.credential(
                    email: user.email!,
                    password: currentPassword,
                  );
                  await user.reauthenticateWithCredential(cred);
                  await user.updatePassword(newPassword);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('パスワードを更新しました')),
                    );
                    Navigator.of(context).pop();
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('更新に失敗しました: $e')),
                    );
                  }
                }
              },
              child: const Text('更新'),
            ),
          ],
        ),
      ),
    );
  }
}
