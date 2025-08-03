// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface BusinessUserModelData {
  userId: string;
  firstName: string;
  firstNameKatakana: string;
  lastName: string;
  lastNameKatakana: string;
  emailAddress: string;
  emailVerified: boolean;
  role: string;
  status: string;
  belongTo?: string[]; // 所属する会社のIDリスト
  createdAt?: Date | null;
  updatedAt?: Date | null;
  lastLoginAt?: Date | null;
}

export class BusinessUserModel {
  public readonly userId: string;
  public readonly firstName: string;
  public readonly firstNameKatakana: string;
  public readonly lastName: string;
  public readonly lastNameKatakana: string;
  public readonly emailAddress: string;
  public readonly emailVerified: boolean;
  public readonly role: string;
  public readonly status: string;
  public readonly belongTo: string[]; // 所属する会社のIDリスト
  public readonly createdAt?: Date | null;
  public readonly updatedAt?: Date | null;
  public readonly lastLoginAt?: Date | null;

  constructor({
    userId,
    firstName,
    firstNameKatakana,
    lastName,
    lastNameKatakana,
    emailAddress,
    emailVerified = false,
    role = 'user',
    status = 'active',
    belongTo = [],
    createdAt = null,
    updatedAt = null,
    lastLoginAt = null,
  }: {
    userId: string;
    firstName: string;
    firstNameKatakana: string;
    lastName: string;
    lastNameKatakana: string;
    emailAddress: string;
    emailVerified?: boolean;
    role?: string;
    status?: string;
    belongTo?: string[];
    createdAt?: Date | null;
    updatedAt?: Date | null;
    lastLoginAt?: Date | null;
  }) {
    this.userId = userId;
    this.firstName = firstName;
    this.firstNameKatakana = firstNameKatakana;
    this.lastName = lastName;
    this.lastNameKatakana = lastNameKatakana;
    this.emailAddress = emailAddress;
    this.emailVerified = emailVerified;
    this.role = role;
    this.status = status;
    this.belongTo = belongTo;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastLoginAt = lastLoginAt;
  }

  /**
   * Firestore からデータを取得して BusinessUserModel に変換
   */
  static fromDocument(doc: FirestoreDocument): BusinessUserModel {
    const data = doc.data();
    
    return new BusinessUserModel({
      userId: data['user_id'] || '',
      firstName: data['first_name'] || '',
      firstNameKatakana: data['first_name_katakana'] || '',
      lastName: data['last_name'] || '',
      lastNameKatakana: data['last_name_katakana'] || '',
      emailAddress: data['email_address'] || '',
      emailVerified: data['email_verified'] || false,
      role: data['role'] || 'user',
      status: data['status'] || 'active',
      belongTo: data['belong_to'] || [],
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : null,
      updatedAt: data['updated_at'] ? (data['updated_at'] as FirestoreTimestamp).toDate() : null,
      lastLoginAt: data['last_login_at'] ? (data['last_login_at'] as FirestoreTimestamp).toDate() : null,
    });
  }

  /**
   * プレーンオブジェクトから BusinessUserModel に変換
   */
  static fromPlainObject(data: BusinessUserModelData): BusinessUserModel {
    return new BusinessUserModel({
      userId: data.userId,
      firstName: data.firstName,
      firstNameKatakana: data.firstNameKatakana,
      lastName: data.lastName,
      lastNameKatakana: data.lastNameKatakana,
      emailAddress: data.emailAddress,
      emailVerified: data.emailVerified,
      role: data.role,
      status: data.status,
      belongTo: data.belongTo || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastLoginAt: data.lastLoginAt,
    });
  }

  /**
   * サンプルデータを作成（提供されたデータ）
   */
  static createSampleUser(): BusinessUserModel {
    return new BusinessUserModel({
      userId: "J6zQBBHkPeNl2rHX8XSIgWhboFM2",
      firstName: "曹太朗",
      firstNameKatakana: "ソウタロウ",
      lastName: "奥岡",
      lastNameKatakana: "オクオカ",
      emailAddress: "caotailangaogang@gmail.com",
      emailVerified: true,
      role: "root",
      status: "active",
      belongTo: ["3HLEgY8zUCheP84TSlDy"],
      createdAt: new Date('2025-07-31T10:29:46.000Z'), // UTC+9 19:29:46
      updatedAt: new Date('2025-08-02T10:46:41.000Z'), // UTC+9 19:46:41
      lastLoginAt: new Date('2025-08-02T10:46:41.000Z'), // UTC+9 19:46:41
    });
  }

  /**
   * Firestore に保存する形式に変換
   */
  toMap(): { [key: string]: any } {
    return {
      user_id: this.userId,
      first_name: this.firstName,
      first_name_katakana: this.firstNameKatakana,
      last_name: this.lastName,
      last_name_katakana: this.lastNameKatakana,
      email_address: this.emailAddress,
      email_verified: this.emailVerified,
      role: this.role,
      status: this.status,
      belong_to: this.belongTo,
      created_at: this.createdAt ? this.createdAt : new Date(),
      updated_at: this.updatedAt ? this.updatedAt : new Date(),
      last_login_at: this.lastLoginAt ? this.lastLoginAt : new Date(),
    };
  }

  /**
   * JSON形式に変換
   */
  toJSON(): BusinessUserModelData {
    return {
      userId: this.userId,
      firstName: this.firstName,
      firstNameKatakana: this.firstNameKatakana,
      lastName: this.lastName,
      lastNameKatakana: this.lastNameKatakana,
      emailAddress: this.emailAddress,
      emailVerified: this.emailVerified,
      role: this.role,
      status: this.status,
      belongTo: this.belongTo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    };
  }

  /**
   * フルネームを取得
   */
  getFullName(): string {
    return `${this.lastName} ${this.firstName}`;
  }

  /**
   * フルネーム（カタカナ）を取得
   */
  getFullNameKatakana(): string {
    return `${this.lastNameKatakana} ${this.firstNameKatakana}`;
  }

  /**
   * ルートユーザーかどうか判定
   */
  isRoot(): boolean {
    return this.role === 'root';
  }

  /**
   * ブランド管理者かどうか判定
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * 生産計画責任者かどうか判定
   */
  isProductionManager(): boolean {
    return this.role === 'production_manager';
  }

  /**
   * トークン設計者かどうか判定
   */
  isTokenDesigner(): boolean {
    return this.role === 'token_designer';
  }

  /**
   * カスタマーサポート責任者かどうか判定
   */
  isCustomerSupportManager(): boolean {
    return this.role === 'customer_support_manager';
  }

  /**
   * アクティブなユーザーかどうか判定
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * 停止中のユーザーかどうか判定
   */
  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  /**
   * 非アクティブなユーザーかどうか判定
   */
  isInactive(): boolean {
    return this.status === 'inactive';
  }

  /**
   * メール認証済みかどうか判定
   */
  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  /**
   * ブランド管理者権限を持つかどうか判定（adminまたはroot）
   */
  hasAdminPrivileges(): boolean {
    return this.isAdmin() || this.isRoot();
  }

  /**
   * 専門職権限を持つかどうか判定（生産計画責任者、トークン設計者、カスタマーサポート責任者）
   */
  hasSpecializedRole(): boolean {
    return this.isProductionManager() || this.isTokenDesigner() || this.isCustomerSupportManager();
  }

  /**
   * 上級権限を持つかどうか判定（ブランド管理者権限または専門職権限）
   */
  hasAdvancedPrivileges(): boolean {
    return this.hasAdminPrivileges() || this.hasSpecializedRole();
  }

  /**
   * 会社作成権限を持つかどうか判定
   */
  canCreateCompany(): boolean {
    return this.hasAdminPrivileges() || this.role === 'user';
  }

  /**
   * ユーザー管理権限を持つかどうか判定
   */
  canManageUsers(): boolean {
    return this.isRoot();
  }

  /**
   * メンバー追加権限を持つかどうか判定（ルートユーザーまたはブランド管理者）
   */
  canAddMembers(): boolean {
    return this.isRoot() || this.isAdmin();
  }

  /**
   * 生産計画管理権限を持つかどうか判定
   */
  canManageProduction(): boolean {
    return this.hasAdminPrivileges() || this.isProductionManager();
  }

  /**
   * トークン管理権限を持つかどうか判定
   */
  canManageTokens(): boolean {
    return this.hasAdminPrivileges() || this.isTokenDesigner();
  }

  /**
   * カスタマーサポート権限を持つかどうか判定
   */
  canManageCustomerSupport(): boolean {
    return this.hasAdminPrivileges() || this.isCustomerSupportManager();
  }

  /**
   * ウォレット管理権限を持つかどうか判定
   */
  canManageWallets(): boolean {
    return this.hasAdminPrivileges() || this.isTokenDesigner();
  }

  /**
   * 財務情報アクセス権限を持つかどうか判定
   */
  canAccessFinancialData(): boolean {
    return this.hasAdminPrivileges() || this.isTokenDesigner() || this.isProductionManager();
  }

  /**
   * ロールの権限レベルを取得
   */
  getRoleLevel(): number {
    switch (this.role) {
      case 'root':
        return 100;
      case 'admin':
        return 80;
      case 'production_manager':
      case 'token_designer':
      case 'customer_support_manager':
        return 60;
      case 'user':
        return 40;
      case 'inactive':
        return 10;
      case 'suspended':
        return 0;
      default:
        return 20;
    }
  }

  /**
   * ロールの説明を取得
   */
  getRoleDescription(): string {
    switch (this.role) {
      case 'root':
        return '全ての権限を持つ最高管理者';
      case 'admin':
        return 'ブランド管理者権限を持つユーザー';
      case 'production_manager':
        return '生産計画の立案・管理を担当';
      case 'token_designer':
        return 'トークン設計・ウォレット管理を担当';
      case 'customer_support_manager':
        return 'カスタマーサポートの管理を担当';
      case 'user':
        return '一般的なユーザー権限';
      case 'inactive':
        return '非アクティブなユーザー';
      case 'suspended':
        return '利用停止中のユーザー';
      default:
        return '不明なロール';
    }
  }

  /**
   * ステータスの説明を取得
   */
  getStatusDescription(): string {
    switch (this.status) {
      case 'active':
        return 'アクティブ';
      case 'inactive':
        return '非アクティブ';
      case 'suspended':
        return '利用停止中';
      case 'pending':
        return '承認待ち';
      default:
        return '不明なステータス';
    }
  }

  /**
   * 権限一覧を取得
   */
  getPermissions(): string[] {
    const permissions: string[] = [];
    
    if (this.canCreateCompany()) permissions.push('会社作成');
    if (this.canManageUsers()) permissions.push('ユーザー管理');
    if (this.canManageProduction()) permissions.push('生産計画管理');
    if (this.canManageTokens()) permissions.push('トークン管理');
    if (this.canManageCustomerSupport()) permissions.push('カスタマーサポート管理');
    if (this.canManageWallets()) permissions.push('ウォレット管理');
    if (this.canAccessFinancialData()) permissions.push('財務情報アクセス');
    
    return permissions;
  }

  /**
   * ロール名を日本語で取得
   */
  getRoleDisplayName(): string {
    switch (this.role) {
      case 'root':
        return 'ルート管理者';
      case 'admin':
        return 'ブランド管理者';
      case 'production_manager':
        return '生産計画責任者';
      case 'token_designer':
        return 'トークン設計者';
      case 'customer_support_manager':
        return 'カスタマーサポート責任者';
      case 'user':
        return '一般ユーザー';
      case 'inactive':
        return '非アクティブ';
      case 'suspended':
        return '停止中';
      default:
        return '不明';
    }
  }

  /**
   * 最終ログインからの経過時間を取得（時間単位）
   */
  getHoursSinceLastLogin(): number | null {
    if (!this.lastLoginAt) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastLoginAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * アカウント作成からの経過日数を取得
   */
  getDaysSinceCreation(): number | null {
    if (!this.createdAt) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * ユーザー情報を更新したコピーを作成
   */
  copyWith({
    userId,
    firstName,
    firstNameKatakana,
    lastName,
    lastNameKatakana,
    emailAddress,
    emailVerified,
    role,
    status,
    belongTo,
    createdAt,
    updatedAt,
    lastLoginAt,
  }: Partial<BusinessUserModelData>): BusinessUserModel {
    return new BusinessUserModel({
      userId: userId ?? this.userId,
      firstName: firstName ?? this.firstName,
      firstNameKatakana: firstNameKatakana ?? this.firstNameKatakana,
      lastName: lastName ?? this.lastName,
      lastNameKatakana: lastNameKatakana ?? this.lastNameKatakana,
      emailAddress: emailAddress ?? this.emailAddress,
      emailVerified: emailVerified ?? this.emailVerified,
      role: role ?? this.role,
      status: status ?? this.status,
      belongTo: belongTo ?? this.belongTo,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastLoginAt: lastLoginAt ?? this.lastLoginAt,
    });
  }

  /**
   * 最終更新からupdatedAtを現在時刻で更新したコピーを作成
   */
  withUpdatedTimestamp(): BusinessUserModel {
    return this.copyWith({
      updatedAt: new Date(),
    });
  }

  /**
   * 最終ログイン時刻を現在時刻で更新したコピーを作成
   */
  withLastLoginNow(): BusinessUserModel {
    return this.copyWith({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export default BusinessUserModel;
