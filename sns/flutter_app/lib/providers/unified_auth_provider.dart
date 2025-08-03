import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 統合ユーザーモデル
class UnifiedUser {
  final String userId;
  final String email;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isActive;
  final UnifiedUserPermissions permissions;
  final CrmProfile? crmProfile;
  final SnsProfile? snsProfile;

  UnifiedUser({
    required this.userId,
    required this.email,
    required this.createdAt,
    required this.updatedAt,
    required this.isActive,
    required this.permissions,
    this.crmProfile,
    this.snsProfile,
  });

  factory UnifiedUser.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    
    return UnifiedUser(
      userId: data['user_id'] ?? '',
      email: data['email'] ?? '',
      createdAt: (data['created_at'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updated_at'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isActive: data['is_active'] ?? false,
      permissions: UnifiedUserPermissions.fromMap(data['permissions'] ?? {}),
      crmProfile: data['crm_profile'] != null ? 
        CrmProfile.fromMap(data['crm_profile']) : null,
      snsProfile: data['sns_profile'] != null ? 
        SnsProfile.fromMap(data['sns_profile']) : null,
    );
  }
}

class UnifiedUserPermissions {
  final bool crm;
  final bool sns;

  UnifiedUserPermissions({required this.crm, required this.sns});

  factory UnifiedUserPermissions.fromMap(Map<String, dynamic> map) {
    return UnifiedUserPermissions(
      crm: map['crm'] ?? false,
      sns: map['sns'] ?? false,
    );
  }
}

class CrmProfile {
  final String firstName;
  final String firstNameKatakana;
  final String lastName;
  final String lastNameKatakana;
  final String role;
  final String status;
  final List<String> belongTo;
  final bool emailVerified;

  CrmProfile({
    required this.firstName,
    required this.firstNameKatakana,
    required this.lastName,
    required this.lastNameKatakana,
    required this.role,
    required this.status,
    required this.belongTo,
    required this.emailVerified,
  });

  factory CrmProfile.fromMap(Map<String, dynamic> map) {
    return CrmProfile(
      firstName: map['first_name'] ?? '',
      firstNameKatakana: map['first_name_katakana'] ?? '',
      lastName: map['last_name'] ?? '',
      lastNameKatakana: map['last_name_katakana'] ?? '',
      role: map['role'] ?? 'user',
      status: map['status'] ?? 'active',
      belongTo: List<String>.from(map['belong_to'] ?? []),
      emailVerified: map['email_verified'] ?? false,
    );
  }
}

class SnsProfile {
  final String displayName;
  final String? avatarUrl;
  final String? bio;
  final bool isPublic;

  SnsProfile({
    required this.displayName,
    this.avatarUrl,
    this.bio,
    required this.isPublic,
  });

  factory SnsProfile.fromMap(Map<String, dynamic> map) {
    return SnsProfile(
      displayName: map['display_name'] ?? '',
      avatarUrl: map['avatar_url'],
      bio: map['bio'],
      isPublic: map['is_public'] ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'display_name': displayName,
      'avatar_url': avatarUrl ?? '',
      'bio': bio ?? '',
      'is_public': isPublic,
    };
  }
}

// 統合認証状態プロバイダ
final unifiedAuthProvider = StreamProvider<UnifiedUser?>((ref) async* {
  final auth = FirebaseAuth.instance;
  final firestore = FirebaseFirestore.instance;

  await for (final user in auth.authStateChanges()) {
    if (user != null) {
      try {
        final unifiedUserDoc = await firestore
            .collection('unified_users')
            .doc(user.uid)
            .get();

        if (unifiedUserDoc.exists) {
          yield UnifiedUser.fromFirestore(unifiedUserDoc);
        } else {
          // unified_usersに移行が必要な場合は既存のusersから移行
          yield null;
        }
      } catch (e) {
        print('Error loading unified user: $e');
        yield null;
      }
    } else {
      yield null;
    }
  }
});

// SNSアクセス権限チェックプロバイダ
final snsAccessProvider = FutureProvider<bool>((ref) async {
  final unifiedUser = await ref.watch(unifiedAuthProvider.future);
  return unifiedUser?.permissions.sns ?? false;
});

// SNSプロファイル有効化サービス
class UnifiedAuthService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static Future<bool> enableSnsAccess(String userId, SnsProfile snsProfile) async {
    try {
      await _firestore.collection('unified_users').doc(userId).update({
        'permissions.sns': true,
        'sns_profile': snsProfile.toMap(),
        'updated_at': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error enabling SNS access: $e');
      return false;
    }
  }

  static Future<bool> hasSystemAccess(String userId, String system) async {
    try {
      final doc = await _firestore.collection('unified_users').doc(userId).get();
      if (!doc.exists) return false;
      
      final data = doc.data() as Map<String, dynamic>;
      final permissions = data['permissions'] as Map<String, dynamic>? ?? {};
      return permissions[system] ?? false;
    } catch (e) {
      print('Error checking system access: $e');
      return false;
    }
  }
}
