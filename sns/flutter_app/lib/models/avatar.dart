class Avatar {
  final String avatarId;        // UUID (主キー)
  final String userId;          // UUID (FK)
  final String avatarName;      // VARCHAR(30)
  final String iconUrl;         // Firebase StorageのダウンロードURL
  final String iconStoragePath; // Firebase Storageの保存パス（追加）
  final String bio;             // VARCHAR(100)
  final String link;            // TEXT
  final DateTime createdAt;     // TIMESTAMP
  final DateTime updatedAt;     // TIMESTAMP

  Avatar({
    required this.avatarId,
    required this.userId,
    required this.avatarName,
    required this.iconUrl,
    required this.iconStoragePath, // 追加
    required this.bio,
    required this.link,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Avatar.fromMap(Map<String, dynamic> map) {
    return Avatar(
      avatarId: map['avatar_id'] as String,
      userId: map['user_id'] as String,
      avatarName: map['avatar_name'] as String,
      iconUrl: map['icon_url'] as String,
      iconStoragePath: map['icon_storage_path'] as String? ?? '', // 追加
      bio: map['bio'] as String,
      link: map['link'] as String,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'avatar_id': avatarId,
      'user_id': userId,
      'avatar_name': avatarName,
      'icon_url': iconUrl,
      'icon_storage_path': iconStoragePath, // 追加
      'bio': bio,
      'link': link,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
