import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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
  Future<void> _fetchAddressFromZipCode() async {
    final zip = widget.zipCodeController.text.trim();
    if (zip.isEmpty) return;

    final uri = Uri.parse('https://zipcloud.ibsnet.co.jp/api/search?zipcode=$zip');
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      final response = await http.get(uri);
      final result = json.decode(response.body);

      if (result['results'] != null && result['results'].isNotEmpty) {
        final address = result['results'][0];
        if (mounted) {
          setState(() {
            widget.provinceController.text = address['address1'] ?? '';
            widget.cityController.text = '${address['address2'] ?? ''}${address['address3'] ?? ''}';
          });
        }
      } else {
        if (mounted) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(content: Text('該当する住所が見つかりませんでした')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('住所検索に失敗しました: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: widget.zipCodeController,
          decoration: const InputDecoration(labelText: '郵便番号'),
        ),
        TextButton(
          onPressed: _fetchAddressFromZipCode,
          child: const Text('郵便番号から住所を検索'),
        ),
        TextFormField(
          controller: widget.provinceController,
          decoration: const InputDecoration(labelText: '都道府県'),
        ),
        TextFormField(
          controller: widget.cityController,
          decoration: const InputDecoration(labelText: '市区町村'),
        ),
        TextFormField(
          controller: widget.address1Controller,
          decoration: const InputDecoration(labelText: '住所1'),
        ),
        TextFormField(
          controller: widget.address2Controller,
          decoration: const InputDecoration(labelText: '住所2'),
        ),
      ],
    );
  }
  }