import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '/widgets/zip_code_address_fields.dart';
import '../models/shipping_address.dart';

class ProfileEditBody extends StatefulWidget {
  const ProfileEditBody({super.key});

  @override
  State<ProfileEditBody> createState() => _ProfileEditBodyState();
}

class _ProfileEditBodyState extends State<ProfileEditBody> {
  final _formKey = GlobalKey<FormState>();

  final _lastNameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameKanaController = TextEditingController();
  final _firstNameKanaController = TextEditingController();

  final _zipCodeController = TextEditingController();
  final _provinceController = TextEditingController();
  final _cityController = TextEditingController();
  final _address1Controller = TextEditingController();
  final _address2Controller = TextEditingController();

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
    
    if (userDoc.exists) {
      final data = userDoc.data()!;
      _lastNameController.text = data['last_name'] ?? '';
      _firstNameController.text = data['first_name'] ?? '';
      _lastNameKanaController.text = data['last_name_katakana'] ?? '';
      _firstNameKanaController.text = data['first_name_katakana'] ?? '';
    }

    // ShippingAddressモデルを使用して配送先住所を取得
    final shippingAddress = await ShippingAddress.getByUserId(user.uid);
    if (shippingAddress != null) {
      _zipCodeController.text = shippingAddress.zipCode;
      _provinceController.text = shippingAddress.province;
      _cityController.text = shippingAddress.city;
      _address1Controller.text = shippingAddress.address1;
      _address2Controller.text = shippingAddress.address2;
    }
  }

  Future<void> _submitUpdate() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // ユーザー情報の更新
      await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
        'last_name_katakana': _lastNameKanaController.text.trim(),
        'updated_at': FieldValue.serverTimestamp(),
      });

      // ShippingAddressモデルを使用して配送先住所を更新
      final shippingAddress = ShippingAddress(
        userId: user.uid,
        zipCode: _zipCodeController.text.trim(),
        province: _provinceController.text.trim(),
        city: _cityController.text.trim(),
        address1: _address1Controller.text.trim(),
        address2: _address2Controller.text.trim(),
      );

      await ShippingAddress.saveOrUpdate(shippingAddress);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('更新が完了しました')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('更新に失敗しました: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: ListView(
          children: [
            TextFormField(
              controller: _lastNameController,
              readOnly: true,
              decoration: const InputDecoration(labelText: '苗字'),
            ),
            TextFormField(
              controller: _lastNameKanaController,
              decoration: const InputDecoration(labelText: '苗字（カナ）'),
              validator: (value) => (value == null || value.isEmpty) ? '入力してください' : null,
            ),
            TextFormField(
              controller: _firstNameController,
              readOnly: true,
              decoration: const InputDecoration(labelText: '名前:変更不可'),
            ),
            TextFormField(
              controller: _firstNameKanaController,
              readOnly: true,
              decoration: const InputDecoration(labelText: '名前（カナ）：変更不可'),
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 8),
            const Text('配送先住所', style: TextStyle(fontWeight: FontWeight.bold)),
            ZipCodeAddressFields(
              zipCodeController: _zipCodeController,
              provinceController: _provinceController,
              cityController: _cityController,
              address1Controller: _address1Controller,
              address2Controller: _address2Controller,
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else
              ElevatedButton(
                onPressed: _submitUpdate,
                child: const Text('更新する'),
              ),
          ],
        ),
      ),
    );
  }
}
