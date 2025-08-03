import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'avatar_registry_screen.dart';
import '../models/shipping_address.dart';

class ShippingAddressScreen extends StatefulWidget {
  const ShippingAddressScreen({super.key});

  @override
  State<ShippingAddressScreen> createState() => _ShippingAddressScreenState();
}

class _ShippingAddressScreenState extends State<ShippingAddressScreen> {
  final _formKey = GlobalKey<FormState>();
  final _zipCodeController = TextEditingController();
  final _provinceController = TextEditingController();
  final _cityController = TextEditingController();
  final _address1Controller = TextEditingController();
  final _address2Controller = TextEditingController();

  @override
  void dispose() {
    _zipCodeController.dispose();
    _provinceController.dispose();
    _cityController.dispose();
    _address1Controller.dispose();
    _address2Controller.dispose();
    super.dispose();
  }

  Future<void> _submitAddress() async {
    if (!_formKey.currentState!.validate()) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ユーザーが認証されていません')),
        );
      }
      return;
    }

    try {
      // ShippingAddressモデルを作成
      final shippingAddress = ShippingAddress(
        userId: user.uid,
        zipCode: _zipCodeController.text.trim(),
        province: _provinceController.text.trim(),
        city: _cityController.text.trim(),
        address1: _address1Controller.text.trim(),
        address2: _address2Controller.text.trim(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Firestoreに保存または更新
      await ShippingAddress.saveOrUpdate(shippingAddress);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('配送先住所を保存しました')),
        );
        // アバター登録画面に遷移
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AvatarRegistryScreen()),
        );
      }
    } catch (e) {
      debugPrint('住所保存エラー: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存に失敗しました: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('配送先住所'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Expanded(
                child: ZipCodeAddressFields(
                  zipCodeController: _zipCodeController,
                  provinceController: _provinceController,
                  cityController: _cityController,
                  address1Controller: _address1Controller,
                  address2Controller: _address2Controller,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitAddress,
                  child: const Text('保存'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ZipCodeAddressFields extends StatefulWidget {
  final TextEditingController zipCodeController;
  final TextEditingController provinceController;
  final TextEditingController cityController;
  final TextEditingController address1Controller;
  final TextEditingController address2Controller;

  const ZipCodeAddressFields({
    super.key,
    required this.zipCodeController,
    required this.provinceController,
    required this.cityController,
    required this.address1Controller,
    required this.address2Controller,
  });

  @override
  State<ZipCodeAddressFields> createState() => _ZipCodeAddressFieldsState();
}

class _ZipCodeAddressFieldsState extends State<ZipCodeAddressFields> {
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _fetchAddressFromZip(String zipCode) async {
    try {
      final response = await http.get(
        Uri.parse('https://zipcloud.ibsnet.co.jp/api/search?zipcode=$zipCode'),
      );
      final data = json.decode(response.body);
      if (data['results'] != null && data['results'].isNotEmpty) {
        final result = data['results'][0];
        setState(() {
          widget.provinceController.text = result['address1'];
          widget.cityController.text = '${result['address2']}${result['address3']}';
        });
      } else {
        _showError('住所が見つかりませんでした');
      }
    } catch (_) {
      _showError('住所検索に失敗しました');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextFormField(
          controller: widget.zipCodeController,
          decoration: InputDecoration(
            labelText: '郵便番号',
            suffixIcon: IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {
                final zip = widget.zipCodeController.text.replaceAll('-', '');
                if (zip.length == 7) {
                  _fetchAddressFromZip(zip);
                } else {
                  _showError('7桁の郵便番号を入力してください');
                }
              },
            ),
          ),
          keyboardType: TextInputType.number,
          validator: (value) => (value == null || value.isEmpty)
              ? '入力してください'
              : null,
        ),
        TextFormField(
          controller: widget.provinceController,
          decoration: const InputDecoration(labelText: '都道府県'),
          validator: (value) => (value == null || value.isEmpty)
              ? '入力してください'
              : null,
        ),
        TextFormField(
          controller: widget.cityController,
          decoration: const InputDecoration(labelText: '市区町村'),
          validator: (value) => (value == null || value.isEmpty)
              ? '入力してください'
              : null,
        ),
        TextFormField(
          controller: widget.address1Controller,
          decoration: const InputDecoration(labelText: '住所1'),
          validator: (value) => (value == null || value.isEmpty)
              ? '入力してください'
              : null,
        ),
        TextFormField(
          controller: widget.address2Controller,
          decoration: const InputDecoration(labelText: '住所2（任意）'),
        ),
      ],
    );
  }
}
