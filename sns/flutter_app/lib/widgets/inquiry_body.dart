import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class InquiryBody extends StatefulWidget {
  const InquiryBody({super.key});

  @override
  State<InquiryBody> createState() => _InquiryBodyState();
}

class _InquiryBodyState extends State<InquiryBody> {
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isSending = false;

  Future<void> _submitInquiry() async {
    final title = _titleController.text.trim();
    final message = _messageController.text.trim();
    final user = FirebaseAuth.instance.currentUser;

    if (title.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('件名と内容を入力してください')),
      );
      return;
    }

    setState(() {
      _isSending = true;
    });

    try {
      await FirebaseFirestore.instance.collection('inquiries').add({
        'user_id': user?.uid ?? 'anonymous',
        'email': user?.email ?? 'anonymous',
        'title': title,
        'message': message,
        'created_at': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('お問い合わせを送信しました')),
        );
        _titleController.clear();
        _messageController.clear();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('送信に失敗しました: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(labelText: '件名'),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: TextField(
              controller: _messageController,
              maxLines: null,
              expands: true,
              decoration: const InputDecoration(
                labelText: 'お問い合わせ内容',
                border: OutlineInputBorder(),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSending ? null : _submitInquiry,
              child: _isSending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('送信'),
            ),
          ),
        ],
      ),
    );
  }
}
