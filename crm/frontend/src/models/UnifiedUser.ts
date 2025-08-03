// 統合認証のためのユーザーモデル
// CRMとSNSの両方で使用される統合ユーザー情報

export interface UnifiedUserModel {
  // 基本情報（共通）
  userId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  
  // アクセス権限
  permissions: {
    crm: boolean;        // CRMアクセス権限
    sns: boolean;        // SNSアクセス権限
  };
  
  // CRM関連情報（CRMアクセス権限がある場合のみ）
  crmProfile?: {
    firstName: string;
    firstNameKatakana: string;
    lastName: string;
    lastNameKatakana: string;
    role: 'admin' | 'manager' | 'user';
    status: 'active' | 'inactive' | 'suspended';
    belongTo: string[];
    emailVerified: boolean;
  };
  
  // SNS関連情報（SNSアクセス権限がある場合のみ）
  snsProfile?: {
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    isPublic: boolean;
  };
}

// Firestore document structure for unified_users collection
export interface UnifiedUserDocument {
  user_id: string;
  email: string;
  created_at: any; // serverTimestamp
  updated_at: any; // serverTimestamp
  is_active: boolean;
  
  // Access permissions
  permissions: {
    crm: boolean;
    sns: boolean;
  };
  
  // CRM profile (optional)
  crm_profile?: {
    first_name: string;
    first_name_katakana: string;
    last_name: string;
    last_name_katakana: string;
    role: string;
    status: string;
    belong_to: string[];
    email_verified: boolean;
  };
  
  // SNS profile (optional)
  sns_profile?: {
    display_name: string;
    avatar_url?: string;
    bio?: string;
    is_public: boolean;
  };
}
