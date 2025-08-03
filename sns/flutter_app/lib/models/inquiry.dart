class Inquiry {
  final int inquiryId; // BIGSERIAL (PK)
  final String userId; // UUID (FK)
  final String productId; // UUID (FK)
  final String mintAddress; // UUID (FK)
  final String inquiryType; // VARCHAR(20): e.g., 'theft', 'loss', 'ownership_conflict'
  final String description; // TEXT
  final String status; // VARCHAR(20): e.g., 'pending', 'investigating', 'resolved', 'rejected'
  final DateTime createdAt; // TIMESTAMP
  final DateTime? updatedAt; // TIMESTAMP (optional)
  final DateTime? resolvedAt; // TIMESTAMP (optional)

  Inquiry({
    required this.inquiryId,
    required this.userId,
    required this.productId,
    required this.mintAddress,
    required this.inquiryType,
    required this.description,
    required this.status,
    required this.createdAt,
    this.updatedAt,
    this.resolvedAt,
  });

  // Firestore用のシリアライズ
  Map<String, dynamic> toMap() {
    return {
      'inquiry_id': inquiryId,
      'user_id': userId,
      'product_id': productId,
      'mint_address': mintAddress,
      'inquiry_type': inquiryType,
      'description': description,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'resolved_at': resolvedAt?.toIso8601String(),
    };
  }

  // Firestore用のデシリアライズ
  factory Inquiry.fromMap(Map<String, dynamic> map) {
    return Inquiry(
      inquiryId: map['inquiry_id'],
      userId: map['user_id'],
      productId: map['product_id'],
      mintAddress: map['mint_address'],
      inquiryType: map['inquiry_type'],
      description: map['description'],
      status: map['status'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt:
          map['updated_at'] != null ? DateTime.parse(map['updated_at']) : null,
      resolvedAt:
          map['resolved_at'] != null ? DateTime.parse(map['resolved_at']) : null,
    );
  }
}
