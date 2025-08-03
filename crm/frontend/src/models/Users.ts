// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface UserModelData {
  userId: string;
  firstName: string;
  firstNameKatakana: string;
  lastName: string;
  lastNameKatakana: string;
  emailAddress: string;
  role: string;
  belongTo?: string[]; // 所属する会社のIDリスト
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class UserModel {
  public readonly userId: string;
  public readonly firstName: string;
  public readonly firstNameKatakana: string;
  public readonly lastName: string;
  public readonly lastNameKatakana: string;
  public readonly emailAddress: string;
  public readonly role: string;
  public readonly belongTo: string[]; // 所属する会社のIDリスト
  public readonly createdAt?: Date | null;
  public readonly updatedAt?: Date | null;

  constructor({
    userId,
    firstName,
    firstNameKatakana,
    lastName,
    lastNameKatakana,
    emailAddress,
    role = 'user',
    belongTo = [],
    createdAt = null,
    updatedAt = null,
  }: {
    userId: string;
    firstName: string;
    firstNameKatakana: string;
    lastName: string;
    lastNameKatakana: string;
    emailAddress: string;
    role?: string;
    belongTo?: string[];
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }) {
    this.userId = userId;
    this.firstName = firstName;
    this.firstNameKatakana = firstNameKatakana;
    this.lastName = lastName;
    this.lastNameKatakana = lastNameKatakana;
    this.emailAddress = emailAddress;
    this.role = role;
    this.belongTo = belongTo;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Firestore からデータを取得して UserModel に変換
   */
  static fromDocument(doc: FirestoreDocument): UserModel {
    const data = doc.data();
    
    return new UserModel({
      userId: data['user_id'] || '',
      firstName: data['first_name'] || '',
      firstNameKatakana: data['first_name_katakana'] || '',
      lastName: data['last_name'] || '',
      lastNameKatakana: data['last_name_katakana'] || '',
      emailAddress: data['email_address'] || '',
      role: data['role'] || 'user',
      belongTo: data['belong_to'] || [],
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : null,
      updatedAt: data['updated_at'] ? (data['updated_at'] as FirestoreTimestamp).toDate() : null,
    });
  }

  /**
   * プレーンオブジェクトから UserModel に変換
   */
  static fromPlainObject(data: UserModelData): UserModel {
    return new UserModel({
      userId: data.userId,
      firstName: data.firstName,
      firstNameKatakana: data.firstNameKatakana,
      lastName: data.lastName,
      lastNameKatakana: data.lastNameKatakana,
      emailAddress: data.emailAddress,
      role: data.role,
      belongTo: data.belongTo || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
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
      role: this.role,
      belong_to: this.belongTo,
      created_at: this.createdAt ? this.createdAt : new Date(), // サーバータイムスタンプの代わりに現在時刻
      updated_at: this.updatedAt ? this.updatedAt : new Date(),
    };
  }

  /**
   * JSON形式に変換
   */
  toJSON(): UserModelData {
    return {
      userId: this.userId,
      firstName: this.firstName,
      firstNameKatakana: this.firstNameKatakana,
      lastName: this.lastName,
      lastNameKatakana: this.lastNameKatakana,
      emailAddress: this.emailAddress,
      role: this.role,
      belongTo: this.belongTo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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
   * ブランド管理者かどうか判定
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * ルートユーザーかどうか判定
   */
  isRoot(): boolean {
    return this.role === 'root';
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
    return this.hasAdminPrivileges() || this.role === 'user'; // userも会社作成可能
  }

  /**
   * ユーザー管理権限を持つかどうか判定
   */
  canManageUsers(): boolean {
    return this.isRoot(); // rootのみがユーザー管理可能
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
   * アクティブなユーザーかどうか判定
   */
  isActive(): boolean {
    return this.role !== 'inactive' && this.role !== 'suspended';
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
    role,
    belongTo,
    createdAt,
    updatedAt,
  }: Partial<UserModelData>): UserModel {
    return new UserModel({
      userId: userId ?? this.userId,
      firstName: firstName ?? this.firstName,
      firstNameKatakana: firstNameKatakana ?? this.firstNameKatakana,
      lastName: lastName ?? this.lastName,
      lastNameKatakana: lastNameKatakana ?? this.lastNameKatakana,
      emailAddress: emailAddress ?? this.emailAddress,
      role: role ?? this.role,
      belongTo: belongTo ?? this.belongTo,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    });
  }
}

export default UserModel;