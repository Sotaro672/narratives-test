import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../screens/auth_screen.dart';

class SettingBody extends StatelessWidget {
  final VoidCallback? onBackPressed;
  final VoidCallback? onInquiryPressed;
  final VoidCallback? onEmailUpdatePressed;
  final VoidCallback? onPasswordUpdatePressed;
  final VoidCallback? onProfileEditPressed;
  final VoidCallback? onPolicyPressed;
  final VoidCallback? onAccountDeletePressed;

  const SettingBody({
    super.key,
    this.onBackPressed,
    this.onInquiryPressed,
    this.onEmailUpdatePressed,
    this.onPasswordUpdatePressed,
    this.onProfileEditPressed,
    this.onPolicyPressed,
    this.onAccountDeletePressed,
  });

  void _signOut(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const AuthScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            children: [
              ListTile(
                leading: const Icon(Icons.contact_support),
                title: const Text('お問い合わせ'),
                onTap: onInquiryPressed,
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.email_outlined),
                title: const Text('メールアドレス変更'),
                onTap: onEmailUpdatePressed,
              ),
              ListTile(
                leading: const Icon(Icons.lock_outline),
                title: const Text('パスワード変更'),
                onTap: onPasswordUpdatePressed,
              ),
              ListTile(
                leading: const Icon(Icons.person),
                title: const Text('個人情報編集'),
                onTap: onProfileEditPressed,
              ),
              ListTile(
                leading: const Icon(Icons.description),
                title: const Text('利用規約'),
                onTap: onPolicyPressed,
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('サインアウト'),
                onTap: () => _signOut(context),
              ),
              ListTile(
                leading: const Icon(Icons.delete_forever),
                title: const Text('アカウント削除'),
                textColor: Colors.red,
                iconColor: Colors.red,
                onTap: onAccountDeletePressed,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
