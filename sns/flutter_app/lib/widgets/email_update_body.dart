import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class EmailUpdateBody extends StatefulWidget {
  const EmailUpdateBody({super.key});

  @override
  State<EmailUpdateBody> createState() => _EmailUpdateBodyState();
}

class _EmailUpdateBodyState extends State<EmailUpdateBody> {
  final currentEmailController = TextEditingController();
  final passwordController = TextEditingController();
  final newEmailController = TextEditingController();

  @override
  void dispose() {
    currentEmailController.dispose();
    passwordController.dispose();
    newEmailController.dispose();
    super.dispose();
  }

  Future<void> _updateEmail() async {
    final user = FirebaseAuth.instance.currentUser;
    final currentEmail = currentEmailController.text.trim();
    final password = passwordController.text.trim();
    final newEmail = newEmailController.text.trim();

    if (user == null) return;

    if (newEmail == currentEmail) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('新しいメールアドレスが現在と同じです')),
      );
      return;
    }

    try {
      final cred = EmailAuthProvider.credential(email: currentEmail, password: password);
      await user.reauthenticateWithCredential(cred);
      await user.verifyBeforeUpdateEmail(newEmail);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('確認メールを送信しました。')),
      );
      Navigator.of(context).pop(); // 成功したら戻る
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('更新に失敗しました: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: currentEmailController,
              decoration: const InputDecoration(labelText: '現在のメールアドレス'),
            ),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'パスワード'),
            ),
            TextField(
              controller: newEmailController,
              decoration: const InputDecoration(labelText: '新しいメールアドレス'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _updateEmail,
              child: const Text('更新'),
            ),
          ],
        ),
      ),
    );
  }
}
