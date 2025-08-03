import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String userId;
  final String firstName;
  final String firstNameKatakana;
  final String lastName;
  final String lastNameKatakana;
  final String emailAddress;
  final String role;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserModel({
    required this.userId,
    required this.firstName,
    required this.firstNameKatakana,
    required this.lastName,
    required this.lastNameKatakana,
    required this.emailAddress,
    this.role = 'user',
    this.createdAt,
    this.updatedAt,
  });

  /// Firestore からデータを取得して UserModel に変換
  factory UserModel.fromDocument(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return UserModel(
      userId: data['user_id'] ?? '',
      firstName: data['first_name'] ?? '',
      firstNameKatakana: data['first_name_katakana'] ?? '',
      lastName: data['last_name'] ?? '',
      lastNameKatakana: data['last_name_katakana'] ?? '',
      emailAddress: data['email_address'] ?? '',
      role: data['role'] ?? 'user',
      createdAt: (data['created_at'] as Timestamp?)?.toDate(),
      updatedAt: (data['updated_at'] as Timestamp?)?.toDate(),
    );
  }

  /// Firestore に保存する形式に変換
  Map<String, dynamic> toMap() {
    return {
      'user_id': userId,
      'first_name': firstName,
      'first_name_katakana': firstNameKatakana,
      'last_name': lastName,
      'last_name_katakana': lastNameKatakana,
      'email_address': emailAddress,
      'role': role,
      'created_at': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
      'updated_at': updatedAt != null ? Timestamp.fromDate(updatedAt!) : FieldValue.serverTimestamp(),
    };
  }
}
