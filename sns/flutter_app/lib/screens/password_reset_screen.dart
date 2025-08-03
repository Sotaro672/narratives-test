import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'auth_screen.dart'; // ← 画面遷移用

class PasswordResetScreen extends StatefulWidget {
  const PasswordResetScreen({super.key});

  @override
  State<PasswordResetScreen> createState() => _PasswordResetScreenState();
}

class _PasswordResetScreenState extends State<PasswordResetScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _emailSent = false;

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('メールアドレスを入力してください')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      if (mounted) {
        setState(() {
          _emailSent = true;
        });
      }
    } on FirebaseAuthException catch (e) {
      String message = 'リセットに失敗しました';
      if (e.code == 'user-not-found') {
        message = 'このメールアドレスのユーザーが見つかりません';
      } else if (e.code == 'invalid-email') {
        message = '無効なメールアドレスです';
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('パスワードを再設定')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            if (!_emailSent) ...[
              const Text(
                '登録済みのメールアドレスを入力してください。\nパスワードリセット用のリンクを送信します。',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'メールアドレス',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _resetPassword,
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text('リセットリンクを送信'),
              ),
            ] else ...[
              const Icon(Icons.email, size: 60),
              const SizedBox(height: 24),
              const Text(
                'パスワードリセットメールを送信しました。\nメールをご確認ください。',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                  );
                },
                child: const Text('サインイン画面に戻る'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
