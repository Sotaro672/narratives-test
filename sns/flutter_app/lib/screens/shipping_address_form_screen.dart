import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '/widgets/zip_code_address_fields.dart';
import 'avatar_registry_screen.dart';

class ShippingAddressFormScreen extends StatefulWidget {
  const ShippingAddressFormScreen({super.key});

  @override
  State<ShippingAddressFormScreen> createState() => _ShippingAddressFormScreenState();
}

class _ShippingAddressFormScreenState extends State<ShippingAddressFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _zipCodeController = TextEditingController();
  final _provinceController = TextEditingController();
  final _cityController = TextEditingController();
  final _address1Controller = TextEditingController();
  final _address2Controller = TextEditingController();

  bool _isLoading = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final docRef = FirebaseFirestore.instance.collection('shipping_addresses').doc();
      await docRef.set({
        'shipping_address_id': docRef.id,
        'user_id': user.uid,
        'country': 'JP',
        'zip_code': _zipCodeController.text.trim(),
        'province': _provinceController.text.trim(),
        'city': _cityController.text.trim(),
        'address1': _address1Controller.text.trim(),
        'address2': _address2Controller.text.trim(),
        'created_at': FieldValue.serverTimestamp(),
        'updated_at': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AvatarRegistryScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存に失敗しました: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _zipCodeController.dispose();
    _provinceController.dispose();
    _cityController.dispose();
    _address1Controller.dispose();
    _address2Controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('配送先の住所登録')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              children: [
                ZipCodeAddressFields(
                  zipCodeController: _zipCodeController,
                  provinceController: _provinceController,
                  cityController: _cityController,
                  address1Controller: _address1Controller,
                  address2Controller: _address2Controller,
                ),
                const SizedBox(height: 24),
                if (_isLoading)
                  const CircularProgressIndicator()
                else
                  ElevatedButton(
                    onPressed: _submit,
                    child: const Text('登録'),
                  ),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const AvatarRegistryScreen()),
                    );
                  },
                  child: const Text('スキップ'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
