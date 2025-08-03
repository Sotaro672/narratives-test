import 'package:flutter/material.dart';

/// 赤文字で注意文を表示する汎用ラベル
class WarningText extends StatelessWidget {
  final String text;

  const WarningText(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.red,
        fontWeight: FontWeight.bold,
        fontSize: 14,
      ),
    );
  }
}

/// 汎用のPDF保存ボタン（ボタン押下時に外部から保存処理を呼び出す）
class PdfSaveButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool saved;

  const PdfSaveButton({
    super.key,
    required this.onPressed,
    required this.saved,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: saved ? null : onPressed,
      icon: const Icon(Icons.picture_as_pdf),
      label: Text(saved ? '保存済み' : 'PDFで保存'),
      style: ElevatedButton.styleFrom(
        backgroundColor: saved ? Colors.grey : Colors.blue,
      ),
    );
  }
}
