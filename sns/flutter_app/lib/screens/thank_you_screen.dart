import 'package:flutter/material.dart';
import 'auth_screen.dart';

class ThankYouScreen extends StatelessWidget {
  const ThankYouScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // 物理・ソフト戻る無効
      child: Scaffold(
        appBar: AppBar(
          title: const Text('ご利用ありがとうございました'),
          automaticallyImplyLeading: false, // 戻るアイコン非表示
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 64),
              const SizedBox(height: 24),
              const Text(
                'アカウント削除が完了しました。\nご利用ありがとうございました。',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                    (route) => false, // すべての履歴を消す
                  );
                },
                child: const Text('ログイン画面に戻る'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}