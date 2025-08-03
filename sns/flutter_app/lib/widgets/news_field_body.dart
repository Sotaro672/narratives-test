import 'package:flutter/material.dart';

class NewsFieldBody extends StatelessWidget {
  const NewsFieldBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        'ここにニュースを表示',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
    );
  }
}
