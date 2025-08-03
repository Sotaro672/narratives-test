import 'package:flutter/material.dart';

class NewsFieldHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;

  const NewsFieldHeader({super.key, required this.title});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text(title),
      centerTitle: true,
      automaticallyImplyLeading: false,
      backgroundColor: Colors.blue,
    );
  }
}
