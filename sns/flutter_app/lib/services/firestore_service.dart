import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';

Future<void> registerUserWithAddress({
  required String firstName,
  required String firstNameKatakana,
  required String lastName,
  required String lastNameKatakana,
  required String email,
  String role = 'user',
  // 住所情報
  required String country,
  required String zipCode,
  required String province,
  required String city,
  required String address1,
  String? address2,
}) async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) return;

  final userId = user.uid;
  final timestamp = FieldValue.serverTimestamp();

  // ユーザープロフィール情報
  final userData = {
    'user_id': userId,
    'first_name': firstName,
    'first_name_katakana': firstNameKatakana,
    'last_name': lastName,
    'last_name_katakana': lastNameKatakana,
    'email_address': email,
    'role': role,
    'created_at': timestamp,
    'updated_at': timestamp,
  };

  // 配送先住所情報
  final shippingAddressId = const Uuid().v4();
  final addressData = {
    'shipping_address_id': shippingAddressId,
    'user_id': userId,
    'country': country,
    'zip_code': zipCode,
    'province': province,
    'city': city,
    'address1': address1,
    'address2': address2 ?? '',
    'created_at': timestamp,
    'updated_at': timestamp,
  };

  final firestore = FirebaseFirestore.instance;

  // 並列書き込み
  await Future.wait([
    firestore.collection('users').doc(userId).set(userData),
    firestore.collection('shipping_addresses').doc(shippingAddressId).set(addressData),
  ]);
}
