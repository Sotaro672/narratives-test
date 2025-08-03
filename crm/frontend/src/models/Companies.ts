import { v4 as uuidv4 } from 'uuid';

// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface CompanyModelData {
  companyId: string;
  userId: string;
  companyName: string;
  companyNameKatakana: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyModel {
  public readonly companyId: string; // UUID
  public readonly userId: string; // 外部キー
  public readonly companyName: string;
  public readonly companyNameKatakana: string;
  public readonly createdBy: string; // 外部キー
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor({
    companyId,
    userId,
    companyName,
    companyNameKatakana,
    createdBy,
    createdAt,
    updatedAt,
  }: {
    companyId: string;
    userId: string;
    companyName: string;
    companyNameKatakana: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.companyId = companyId;
    this.userId = userId;
    this.companyName = companyName;
    this.companyNameKatakana = companyNameKatakana;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * 新しい会社を作成するファクトリーメソッド
   */
  static newCompany({
    userId,
    companyName,
    companyNameKatakana,
    createdBy,
  }: {
    userId: string;
    companyName: string;
    companyNameKatakana: string;
    createdBy: string;
  }): CompanyModel {
    const now = new Date();
    return new CompanyModel({
      companyId: uuidv4(),
      userId,
      companyName,
      companyNameKatakana,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Firestore からデータを取得して CompanyModel に変換
   */
  static fromDocument(doc: FirestoreDocument): CompanyModel {
    const data = doc.data();
    
    return new CompanyModel({
      companyId: data['company_id'] || '',
      userId: data['user_id'] || '',
      companyName: data['company_name'] || '',
      companyNameKatakana: data['company_name_katakana'] || '',
      createdBy: data['created_by'] || '',
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : new Date(),
      updatedAt: data['updated_at'] ? (data['updated_at'] as FirestoreTimestamp).toDate() : new Date(),
    });
  }

  /**
   * プレーンオブジェクトから CompanyModel に変換
   */
  static fromPlainObject(data: CompanyModelData): CompanyModel {
    return new CompanyModel({
      companyId: data.companyId,
      userId: data.userId,
      companyName: data.companyName,
      companyNameKatakana: data.companyNameKatakana,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  /**
   * JSON から CompanyModel に変換
   */
  static fromJson(json: { [key: string]: any }): CompanyModel {
    return new CompanyModel({
      companyId: json['company_id'],
      userId: json['user_id'],
      companyName: json['company_name'],
      companyNameKatakana: json['company_name_katakana'],
      createdBy: json['created_by'],
      createdAt: new Date(json['created_at']),
      updatedAt: new Date(json['updated_at']),
    });
  }

  /**
   * Firestore に保存する形式に変換
   */
  toMap(): { [key: string]: any } {
    return {
      company_id: this.companyId,
      user_id: this.userId,
      company_name: this.companyName,
      company_name_katakana: this.companyNameKatakana,
      created_by: this.createdBy,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * JSON形式に変換
   */
  toJson(): { [key: string]: any } {
    return {
      company_id: this.companyId,
      user_id: this.userId,
      company_name: this.companyName,
      company_name_katakana: this.companyNameKatakana,
      created_by: this.createdBy,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  /**
   * プレーンオブジェクト形式に変換
   */
  toPlainObject(): CompanyModelData {
    return {
      companyId: this.companyId,
      userId: this.userId,
      companyName: this.companyName,
      companyNameKatakana: this.companyNameKatakana,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 会社名を表示用にフォーマット（カタカナ付き）
   */
  getDisplayName(): string {
    return `${this.companyName} (${this.companyNameKatakana})`;
  }

  /**
   * 会社の基本情報を取得
   */
  getBasicInfo(): {
    id: string;
    name: string;
    nameKatakana: string;
  } {
    return {
      id: this.companyId,
      name: this.companyName,
      nameKatakana: this.companyNameKatakana,
    };
  }

  /**
   * 会社データを更新用にクローン
   */
  cloneForUpdate({
    companyName,
    companyNameKatakana,
  }: {
    companyName?: string;
    companyNameKatakana?: string;
  }): CompanyModel {
    return new CompanyModel({
      companyId: this.companyId,
      userId: this.userId,
      companyName: companyName ?? this.companyName,
      companyNameKatakana: companyNameKatakana ?? this.companyNameKatakana,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: new Date(), // 更新日時を現在時刻に設定
    });
  }

  /**
   * 会社が有効かどうかチェック（名前が設定されているか）
   */
  isValid(): boolean {
    return this.companyName.trim() !== '' && this.companyNameKatakana.trim() !== '';
  }
}

export default CompanyModel;
