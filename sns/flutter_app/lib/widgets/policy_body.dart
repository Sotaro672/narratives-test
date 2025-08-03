import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

class PolicyBody extends StatefulWidget {
  const PolicyBody({super.key});

  @override
  State<PolicyBody> createState() => _PolicyBodyState();
}

class _PolicyBodyState extends State<PolicyBody> {
  String _policyText = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPolicyText();
  }

  Future<void> _loadPolicyText() async {
    try {
      final text = await rootBundle.loadString('lib/assets/policy.txt');
      setState(() {
        _policyText = text;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _policyText = '利用規約を読み込めませんでした。';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        child: Text(
          _policyText,
          style: const TextStyle(fontSize: 14),
        ),
      ),
    );
  }
}
