import { v4 as uuidv4 } from 'uuid';

// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface BrandModelData {
  brandId: string;
  companyId: string;
  brandName: string;
  brandNameKatakana: string;
  description: string;
  adminUserId: string; // ブランド管理者のユーザーID
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BrandModel {
  public readonly brandId: string; // UUID
  public readonly companyId: string; // 所属会社ID
  public readonly brandName: string;
  public readonly brandNameKatakana: string;
  public readonly description: string;
  public readonly adminUserId: string; // ブランド管理者のユーザーID
  public readonly createdBy: string; // 作成者のユーザーID
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor({
    brandId,
    companyId,
    brandName,
    brandNameKatakana,
    description = '',
    adminUserId,
    createdBy,
    createdAt,
    updatedAt,
  }: {
    brandId: string;
    companyId: string;
    brandName: string;
    brandNameKatakana: string;
    description?: string;
    adminUserId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.brandId = brandId;
    this.companyId = companyId;
    this.brandName = brandName;
    this.brandNameKatakana = brandNameKatakana;
    this.description = description;
    this.adminUserId = adminUserId;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * 新しいブランドを作成するファクトリーメソッド
   */
  static newBrand({
    companyId,
    brandName,
    brandNameKatakana,
    description = '',
    adminUserId,
    createdBy,
  }: {
    companyId: string;
    brandName: string;
    brandNameKatakana: string;
    description?: string;
    adminUserId: string;
    createdBy: string;
  }): BrandModel {
    const now = new Date();
    return new BrandModel({
      brandId: uuidv4(),
      companyId,
      brandName,
      brandNameKatakana,
      description,
      adminUserId,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Firestore からデータを取得して BrandModel に変換
   */
  static fromDocument(doc: FirestoreDocument): BrandModel {
    const data = doc.data();
    
    return new BrandModel({
      brandId: data['brand_id'] || '',
      companyId: data['company_id'] || '',
      brandName: data['brand_name'] || '',
      brandNameKatakana: data['brand_name_katakana'] || '',
      description: data['description'] || '',
      adminUserId: data['admin_user_id'] || '',
      createdBy: data['created_by'] || '',
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : new Date(),
      updatedAt: data['updated_at'] ? (data['updated_at'] as FirestoreTimestamp).toDate() : new Date(),
    });
  }

  /**
   * Firestore に保存する形式に変換
   */
  toMap(): { [key: string]: any } {
    return {
      brand_id: this.brandId,
      company_id: this.companyId,
      brand_name: this.brandName,
      brand_name_katakana: this.brandNameKatakana,
      description: this.description,
      admin_user_id: this.adminUserId,
      created_by: this.createdBy,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * JSON形式に変換
   */
  toJson(): BrandModelData {
    return {
      brandId: this.brandId,
      companyId: this.companyId,
      brandName: this.brandName,
      brandNameKatakana: this.brandNameKatakana,
      description: this.description,
      adminUserId: this.adminUserId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
