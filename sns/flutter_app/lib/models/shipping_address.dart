import 'package:cloud_firestore/cloud_firestore.dart';

class ShippingAddress {
  final String? documentId;
  final String userId;
  final String zipCode;
  final String province;
  final String city;
  final String address1;
  final String address2;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ShippingAddress({
    this.documentId,
    required this.userId,
    required this.zipCode,
    required this.province,
    required this.city,
    required this.address1,
    this.address2 = '',
    this.createdAt,
    this.updatedAt,
  });

  /// Firestore からデータを取得して ShippingAddress に変換
  factory ShippingAddress.fromDocument(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ShippingAddress(
      documentId: doc.id,
      userId: data['user_id'] ?? '',
      zipCode: data['zip_code'] ?? '',
      province: data['province'] ?? '',
      city: data['city'] ?? '',
      address1: data['address1'] ?? '',
      address2: data['address2'] ?? '',
      createdAt: (data['created_at'] as Timestamp?)?.toDate(),
      updatedAt: (data['updated_at'] as Timestamp?)?.toDate(),
    );
  }

  /// Firestore に保存する形式に変換
  Map<String, dynamic> toMap() {
    final now = DateTime.now();
    return {
      'user_id': userId,
      'zip_code': zipCode,
      'province': province,
      'city': city,
      'address1': address1,
      'address2': address2,
      'created_at': createdAt != null ? Timestamp.fromDate(createdAt!) : Timestamp.fromDate(now),
      'updated_at': Timestamp.fromDate(now),
    };
  }

  /// 住所情報を更新する用のMapを作成（created_atは除外）
  Map<String, dynamic> toUpdateMap() {
    return {
      'zip_code': zipCode,
      'province': province,
      'city': city,
      'address1': address1,
      'address2': address2,
      'updated_at': Timestamp.fromDate(DateTime.now()),
    };
  }

  /// Firestoreに新規保存
  static Future<String> create(ShippingAddress address) async {
    final docRef = await FirebaseFirestore.instance
        .collection('shipping_addresses')
        .add(address.toMap());
    return docRef.id;
  }

  /// Firestoreの既存データを更新
  static Future<void> update(String documentId, ShippingAddress address) async {
    await FirebaseFirestore.instance
        .collection('shipping_addresses')
        .doc(documentId)
        .update(address.toUpdateMap());
  }

  /// ユーザーIDで配送先住所を取得
  static Future<ShippingAddress?> getByUserId(String userId) async {
    final querySnapshot = await FirebaseFirestore.instance
        .collection('shipping_addresses')
        .where('user_id', isEqualTo: userId)
        .limit(1)
        .get();

    if (querySnapshot.docs.isEmpty) {
      return null;
    }

    return ShippingAddress.fromDocument(querySnapshot.docs.first);
  }

  /// ユーザーIDの配送先住所を削除
  static Future<void> deleteByUserId(String userId) async {
    final querySnapshot = await FirebaseFirestore.instance
        .collection('shipping_addresses')
        .where('user_id', isEqualTo: userId)
        .get();

    for (final doc in querySnapshot.docs) {
      await doc.reference.delete();
    }
  }

  /// 配送先住所を保存または更新
  static Future<void> saveOrUpdate(ShippingAddress address) async {
    final existing = await getByUserId(address.userId);
    
    if (existing != null && existing.documentId != null) {
      // 既存の住所を更新
      await update(existing.documentId!, address);
    } else {
      // 新規作成
      await create(address);
    }
  }

  /// コピーを作成（一部フィールドを変更する場合に使用）
  ShippingAddress copyWith({
    String? documentId,
    String? userId,
    String? zipCode,
    String? province,
    String? city,
    String? address1,
    String? address2,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ShippingAddress(
      documentId: documentId ?? this.documentId,
      userId: userId ?? this.userId,
      zipCode: zipCode ?? this.zipCode,
      province: province ?? this.province,
      city: city ?? this.city,
      address1: address1 ?? this.address1,
      address2: address2 ?? this.address2,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// 住所の表示用文字列を取得
  String get fullAddress {
    return '$province$city$address1${address2.isNotEmpty ? ' $address2' : ''}';
  }

  @override
  String toString() {
    return 'ShippingAddress{documentId: $documentId, userId: $userId, zipCode: $zipCode, fullAddress: $fullAddress}';
  }
}
