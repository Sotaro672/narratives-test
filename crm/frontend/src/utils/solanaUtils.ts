import { Keypair, PublicKey } from '@solana/web3.js';

/**
 * Solanaウォレット作成ユーティリティ
 */
export class SolanaWalletUtils {
  /**
   * 新しいSolanaキーペアを生成
   * @returns {publicKey: string, secretKey: Uint8Array}
   */
  static generateKeypair(): { publicKey: string; secretKey: Uint8Array } {
    const keypair = Keypair.generate();
    
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: keypair.secretKey
    };
  }

  /**
   * 公開鍵の形式を検証
   * @param publicKey - 検証する公開鍵
   * @returns boolean
   */
  static isValidPublicKey(publicKey: string): boolean {
    try {
      // Solanaの PublicKey クラスを使用してより厳密に検証
      new PublicKey(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 公開鍵を短縮表示用にフォーマット
   * @param publicKey - フォーマットする公開鍵
   * @returns string - 短縮された公開鍵 (例: "Abc...xyz")
   */
  static formatPublicKey(publicKey: string): string {
    if (publicKey.length <= 8) return publicKey;
    return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
  }

  /**
   * 公開鍵をコピー用テキストとして取得
   * @param publicKey - コピーする公開鍵
   * @returns string - フルの公開鍵
   */
  static getCopyablePublicKey(publicKey: string): string {
    return publicKey;
  }

  /**
   * ウォレットアドレスの種類を判定
   * @param address - 判定するアドレス
   * @returns string - "solana" | "uuid" | "unknown"
   */
  static getAddressType(address: string): string {
    if (this.isValidPublicKey(address)) {
      return 'solana';
    }
    
    // UUID形式の検証（簡易）
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(address)) {
      return 'uuid';
    }
    
    return 'unknown';
  }
}

export default SolanaWalletUtils;
