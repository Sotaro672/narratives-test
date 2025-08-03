import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'shipping_address_screen.dart';
import 'auth_screen.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key});

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  Timer? _timer;
  bool _isResending = false;

  @override
  void initState() {
    super.initState();
    _startEmailVerificationCheck();
  }

  void _startEmailVerificationCheck() {
    _timer = Timer.periodic(const Duration(seconds: 5), (_) async {
      final user = FirebaseAuth.instance.currentUser;
      await user?.reload();
      if (user != null && user.emailVerified && mounted) {
        _timer?.cancel();
        if (mounted) {
          final navigator = Navigator.of(context);
          navigator.pushReplacement(
            MaterialPageRoute(
              builder: (_) => const ShippingAddressScreen(),
            ),
          );
        }
      }
    });
  }

  Future<void> _resendVerificationEmail() async {
    final user = FirebaseAuth.instance.currentUser;
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    
    setState(() => _isResending = true);
    try {
      await user?.sendEmailVerification();
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(content: Text('確認メールを再送信しました')),
        );
      }
    } catch (e) {
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('送信に失敗しました: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('メール認証が必要です')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.mark_email_unread_outlined, size: 60),
            const SizedBox(height: 24),
            const Text(
              '確認メールを送信しました。\n\nメールに記載されたリンクから認証を完了してください。\n（迷惑メールフォルダもご確認ください）',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isResending ? null : _resendVerificationEmail,
              child: _isResending
                  ? const SizedBox(
                      width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('確認メールを再送信'),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () async {
                final navigator = Navigator.of(context);
                await FirebaseAuth.instance.signOut();
                if (mounted) {
                  navigator.pushReplacement(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                  );
                }
              },
              child: const Text('ログイン画面に戻る'),
            ),
          ],
        ),
      ),
    );
  }
}
