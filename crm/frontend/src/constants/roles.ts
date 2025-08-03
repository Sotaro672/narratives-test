/**
 * ユーザーロール定数定義
 */
export const UserRoles = {
  ROOT: 'root',
  ADMIN: 'admin',
  PRODUCTION_MANAGER: 'production_manager',
  TOKEN_DESIGNER: 'token_designer',
  CUSTOMER_SUPPORT_MANAGER: 'customer_support_manager',
  USER: 'user',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

/**
 * ロール階層情報
 */
export const RoleHierarchy = {
  [UserRoles.ROOT]: {
    level: 100,
    displayName: 'ルート管理者',
    description: '全ての権限を持つ最高管理者',
    permissions: [
      'company_create',
      'user_manage',
      'production_manage',
      'token_manage',
      'customer_support_manage',
      'wallet_manage',
      'financial_access',
      'all_permissions'
    ]
  },
  [UserRoles.ADMIN]: {
    level: 80,
    displayName: 'ブランド管理者',
    description: 'ブランド管理者権限を持つユーザー',
    permissions: [
      'company_create',
      'production_manage',
      'token_manage',
      'customer_support_manage',
      'wallet_manage',
      'financial_access'
    ]
  },
  [UserRoles.PRODUCTION_MANAGER]: {
    level: 60,
    displayName: '生産計画責任者',
    description: '生産計画の立案・管理を担当',
    permissions: [
      'production_manage',
      'financial_access'
    ]
  },
  [UserRoles.TOKEN_DESIGNER]: {
    level: 60,
    displayName: 'トークン設計者',
    description: 'トークン設計・ウォレット管理を担当',
    permissions: [
      'token_manage',
      'wallet_manage',
      'financial_access'
    ]
  },
  [UserRoles.CUSTOMER_SUPPORT_MANAGER]: {
    level: 60,
    displayName: 'カスタマーサポート責任者',
    description: 'カスタマーサポートの管理を担当',
    permissions: [
      'customer_support_manage'
    ]
  },
  [UserRoles.USER]: {
    level: 40,
    displayName: '一般ユーザー',
    description: '一般的なユーザー権限',
    permissions: [
      'company_create'
    ]
  },
  [UserRoles.INACTIVE]: {
    level: 10,
    displayName: '非アクティブ',
    description: '非アクティブなユーザー',
    permissions: []
  },
  [UserRoles.SUSPENDED]: {
    level: 0,
    displayName: '停止中',
    description: '利用停止中のユーザー',
    permissions: []
  }
} as const;

/**
 * 権限定数
 */
export const Permissions = {
  COMPANY_CREATE: 'company_create',
  USER_MANAGE: 'user_manage',
  PRODUCTION_MANAGE: 'production_manage',
  TOKEN_MANAGE: 'token_manage',
  CUSTOMER_SUPPORT_MANAGE: 'customer_support_manage',
  WALLET_MANAGE: 'wallet_manage',
  FINANCIAL_ACCESS: 'financial_access',
  ALL_PERMISSIONS: 'all_permissions'
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];
