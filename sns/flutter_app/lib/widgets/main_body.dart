import 'package:flutter/material.dart';

class MainBody extends StatelessWidget {
  final Widget? child;
  final EdgeInsetsGeometry padding;

  const MainBody({
    super.key,
    this.child,
    this.padding = const EdgeInsets.all(16.0),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      child: child ?? const Center(child: Text('Main content goes here')),
    );
  }
}
