import 'package:flutter/material.dart';
import './setting_body.dart';

class MyHomeHeader extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final VoidCallback? onSettingsPressed;

  const MyHomeHeader({
    super.key,
    this.title,
    this.onSettingsPressed,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      automaticallyImplyLeading: false,
      title: Text(title ?? 'マイページ'),
      centerTitle: false,
      backgroundColor: Colors.blue,
      actions: [
        IconButton(
          icon: const Icon(Icons.settings),
          tooltip: '設定',
onPressed: onSettingsPressed ?? () {
  showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: "設定",
    barrierColor: Colors.black54,
    transitionDuration: const Duration(milliseconds: 500),
    pageBuilder: (context, animation, secondaryAnimation) => const SizedBox.shrink(),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(parent: animation, curve: Curves.easeInOut);

      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: Align(
          alignment: Alignment.centerRight,
          child: FractionallySizedBox(
            widthFactor: 0.85,
            child: Material(
              color: Colors.white,
              elevation: 16,
              // ✅ SettingHeaderは使わず、SettingBody(onBackPressed: ...) にする
              child: SettingBody(
                onBackPressed: () {
                  Navigator.of(context).pop();
                },
              ),
            ),
          ),
        ),
      );
    },
  );
},

        ),
      ],
    );
  }
}
