import 'package:flutter/material.dart';

class CommonFooter extends StatefulWidget {
  final VoidCallback? onSettingsPressed;
  final VoidCallback? onHomePressed;
  final VoidCallback? onAvatarPressed; // ✅ アバタータップ用

  const CommonFooter({
    super.key,
    this.onSettingsPressed,
    this.onHomePressed,
    this.onAvatarPressed,
  });

  @override
  State<CommonFooter> createState() => _CommonFooterState();
}

class _CommonFooterState extends State<CommonFooter> {
  @override
  Widget build(BuildContext context) {
    return BottomAppBar(
      color: Colors.blue,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          // 🏠 ホームボタン
          IconButton(
            icon: const Icon(Icons.home, color: Colors.white),
            onPressed: widget.onHomePressed,
          ),

          // 👤 マイページボタン（アバター代替）
          IconButton(
            icon: const Icon(Icons.person, color: Colors.white),
            onPressed: widget.onAvatarPressed,
            tooltip: 'マイページ',
          ),
        ],
      ),
    );
  }
}
