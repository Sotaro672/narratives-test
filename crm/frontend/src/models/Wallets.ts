import { v4 as uuidv4 } from 'uuid';
import { CompanyModel } from './Companies';
import { SolanaWalletUtils } from '../utils/solanaUtils';

export const WalletStatus = {
  HOT: 'hot',
  COLD: 'cold',
  DELETED: 'deleted'
} as const;

export type WalletStatus = typeof WalletStatus[keyof typeof WalletStatus];

// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface WalletModelData {
  walletAddress: string;
  userId: string;
  companyId: string;
  status: WalletStatus;
  balance: number;
  createdAt: Date;
}

export class WalletModel {
  public readonly walletAddress: string; // UUID
  public readonly userId: string; // 外部キー
  public readonly companyId: string; // 外部キー
  public readonly status: WalletStatus;
  public readonly balance: number;
  public readonly createdAt: Date;

  constructor({
    walletAddress,
    userId,
    companyId,
    status,
    balance,
    createdAt,
  }: {
    walletAddress: string;
    userId: string;
    companyId: string;
    status: WalletStatus;
    balance: number;
    createdAt: Date;
  }) {
    if (balance < 0) {
      throw new Error('ウォレット残高は0以上である必要があります。');
    }
    
    this.walletAddress = walletAddress;
    this.userId = userId;
    this.companyId = companyId;
    this.status = status;
    this.balance = balance;
    this.createdAt = createdAt;
  }

  /**
   * 新しいウォレットを作成するファクトリーメソッド
   */
  static newWallet({
    userId,
    companyId,
    status = WalletStatus.HOT,
    initialBalance = 0,
  }: {
    userId: string;
    companyId: string;
    status?: WalletStatus;
    initialBalance?: number;
  }): WalletModel {
    return new WalletModel({
      walletAddress: uuidv4(),
      userId,
      companyId,
      status,
      balance: initialBalance,
      createdAt: new Date(),
    });
  }

  /**
   * 新しいSolanaウォレットを作成するファクトリーメソッド
   */
  static newSolanaWallet({
    userId,
    companyId,
    status = WalletStatus.HOT,
    initialBalance = 0,
  }: {
    userId: string;
    companyId: string;
    status?: WalletStatus;
    initialBalance?: number;
  }): { wallet: WalletModel; secretKey: Uint8Array } {
    // Solanaキーペアを生成
    const keypair = SolanaWalletUtils.generateKeypair();
    
    const wallet = new WalletModel({
      walletAddress: keypair.publicKey, // Solanaの公開鍵をウォレットアドレスとして使用
      userId,
      companyId,
      status,
      balance: initialBalance,
      createdAt: new Date(),
    });

    return {
      wallet,
      secretKey: keypair.secretKey // 秘密鍵は保存せず、必要に応じて返却
    };
  }

  /**
   * Firestore からデータを取得して WalletModel に変換
   */
  static fromDocument(doc: FirestoreDocument): WalletModel {
    const data = doc.data();
    
    return new WalletModel({
      walletAddress: data['wallet_address'] || '',
      userId: data['user_id'] || '',
      companyId: data['company_id'] || '',
      status: WalletModel.parseWalletStatus(data['status']),
      balance: data['balance'] || 0,
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : new Date(),
    });
  }

  /**
   * プレーンオブジェクトから WalletModel に変換
   */
  static fromPlainObject(data: WalletModelData): WalletModel {
    return new WalletModel({
      walletAddress: data.walletAddress,
      userId: data.userId,
      companyId: data.companyId,
      status: data.status,
      balance: data.balance,
      createdAt: data.createdAt,
    });
  }

  /**
   * JSON から WalletModel に変換
   */
  static fromJson(json: { [key: string]: any }): WalletModel {
    return new WalletModel({
      walletAddress: json['wallet_address'],
      userId: json['user_id'],
      companyId: json['company_id'],
      status: WalletModel.parseWalletStatus(json['status']),
      balance: json['balance'],
      createdAt: new Date(json['created_at']),
    });
  }

  /**
   * 文字列から WalletStatus に変換
   */
  private static parseWalletStatus(statusString: string): WalletStatus {
    switch (statusString) {
      case 'hot':
        return WalletStatus.HOT;
      case 'cold':
        return WalletStatus.COLD;
      case 'deleted':
        return WalletStatus.DELETED;
      default:
        return WalletStatus.HOT;
    }
  }

  /**
   * Firestore に保存する形式に変換
   */
  toMap(): { [key: string]: any } {
    return {
      wallet_address: this.walletAddress,
      user_id: this.userId,
      company_id: this.companyId,
      status: this.status,
      balance: this.balance,
      created_at: this.createdAt,
    };
  }

  /**
   * JSON形式に変換
   */
  toJson(): { [key: string]: any } {
    return {
      wallet_address: this.walletAddress,
      user_id: this.userId,
      company_id: this.companyId,
      status: this.status,
      balance: this.balance,
      created_at: this.createdAt.toISOString(),
    };
  }

  /**
   * プレーンオブジェクト形式に変換
   */
  toPlainObject(): WalletModelData {
    return {
      walletAddress: this.walletAddress,
      userId: this.userId,
      companyId: this.companyId,
      status: this.status,
      balance: this.balance,
      createdAt: this.createdAt,
    };
  }

  /**
   * ウォレットアドレスが Solana 公開鍵かどうかを判定
   */
  isSolanaWallet(): boolean {
    return SolanaWalletUtils.isValidPublicKey(this.walletAddress);
  }

  /**
   * ウォレットアドレスを表示用にフォーマット
   */
  getFormattedWalletAddress(): string {
    if (this.isSolanaWallet()) {
      return SolanaWalletUtils.formatPublicKey(this.walletAddress);
    }
    // UUID形式の場合は最初と最後の4文字を表示
    return `${this.walletAddress.slice(0, 4)}...${this.walletAddress.slice(-4)}`;
  }

  /**
   * ウォレットの種類を取得
   */
  getWalletType(): string {
    const addressType = SolanaWalletUtils.getAddressType(this.walletAddress);
    switch (addressType) {
      case 'solana':
        return 'Solana';
      case 'uuid':
        return 'Internal';
      default:
        return 'Unknown';
    }
  }

  /**
   * ウォレットの詳細情報を取得
   */
  getWalletInfo(): {
    address: string;
    formattedAddress: string;
    type: string;
    status: string;
    statusDisplay: string;
    balance: number;
    formattedBalance: string;
    isActive: boolean;
    isSolana: boolean;
  } {
    return {
      address: this.walletAddress,
      formattedAddress: this.getFormattedWalletAddress(),
      type: this.getWalletType(),
      status: this.status,
      statusDisplay: this.getStatusDisplayName(),
      balance: this.balance,
      formattedBalance: this.getFormattedBalance(),
      isActive: this.isActive(),
      isSolana: this.isSolanaWallet(),
    };
  }

  /**
   * ウォレットの残高を表示用にフォーマット
   */
  getFormattedBalance(): string {
    return this.balance.toLocaleString('ja-JP');
  }

  /**
   * ウォレットのステータスを日本語で取得
   */
  getStatusDisplayName(): string {
    switch (this.status) {
      case WalletStatus.HOT:
        return 'ホット';
      case WalletStatus.COLD:
        return 'コールド';
      case WalletStatus.DELETED:
        return '削除済み';
      default:
        return '不明';
    }
  }

  /**
   * ウォレットが削除されているかチェック
   */
  isDeleted(): boolean {
    return this.status === WalletStatus.DELETED;
  }

  /**
   * ウォレットがアクティブかチェック（削除されていない）
   */
  isActive(): boolean {
    return !this.isDeleted();
  }

  /**
   * BelongTo: このウォレットが所属する会社を取得
   * @returns CompanyModel のインスタンス（会社が見つからない場合は null）
   */
  async belongsToCompany(): Promise<CompanyModel | null> {
    try {
      // CompanyModelから会社IDでデータを取得
      // 実際の実装では、FirestoreやAPIから会社データを取得
      // ここでは仮実装として null を返す
      // TODO: 実際のデータ取得ロジックを実装
      return null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  }

  /**
   * 関連する会社のIDを取得
   */
  getCompanyId(): string {
    return this.companyId;
  }
}

export default WalletModel;
