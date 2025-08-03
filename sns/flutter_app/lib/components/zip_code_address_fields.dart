import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
  bool _isSearching = false;

  Future<void> _searchAddress() async {
    final zip = widget.zipCodeController.text.replaceAll('-', '').trim();
    if (zip.isEmpty || zip.length != 7) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('7桁の郵便番号を入力してください')),
        );
      }
      return;
    }

    setState(() => _isSearching = true);

    try {
      final uri = Uri.parse('https://zipcloud.ibsnet.co.jp/api/search?zipcode=$zip');
      final response = await http.get(uri);

      final data = json.decode(response.body);
      if (data['results'] != null && data['results'].isNotEmpty) {
        final result = data['results'][0];
        widget.provinceController.text = result['address1'] ?? '';
        widget.cityController.text = result['address2'] ?? '';
        widget.address1Controller.text = result['address3'] ?? '';
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('住所が見つかりませんでした')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('検索に失敗しました: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: widget.zipCodeController,
                decoration: const InputDecoration(labelText: '郵便番号'),
                keyboardType: TextInputType.number,
                validator: (value) =>
                    (value == null || value.isEmpty) ? '郵便番号を入力してください' : null,
              ),
            ),
            const SizedBox(width: 8),
            _isSearching
                ? const CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _searchAddress,
                    child: const Text('検索'),
                  ),
          ],
        ),
        TextFormField(
          controller: widget.provinceController,
          decoration: const InputDecoration(labelText: '都道府県'),
          validator: (value) =>
              (value == null || value.isEmpty) ? '都道府県を入力してください' : null,
        ),
        TextFormField(
          controller: widget.cityController,
          decoration: const InputDecoration(labelText: '市区町村'),
          validator: (value) =>
              (value == null || value.isEmpty) ? '市区町村を入力してください' : null,
        ),
        TextFormField(
          controller: widget.address1Controller,
          decoration: const InputDecoration(labelText: '住所1'),
          validator: (value) =>
              (value == null || value.isEmpty) ? '住所1を入力してください' : null,
        ),
        TextFormField(
          controller: widget.address2Controller,
          decoration: const InputDecoration(labelText: '住所2（任意）'),
        ),
      ],
    );
  }
}
