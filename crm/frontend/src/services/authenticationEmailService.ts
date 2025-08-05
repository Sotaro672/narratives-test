import { crmDb } from '../config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';

/**
 * CRMサインイン時の認証メール送信サービス
 * Trigger Email from Firestoreを利用して認証メールを送信
 */
export class AuthenticationEmailService {
  
  /**
   * サインイン時の認証メール送信
   * @param user Firebase認証ユーザー
   * @param isInitialSignUp 初回サインアップかどうか
   */
  static async sendAuthenticationEmail(user: User, isInitialSignUp: boolean = false): Promise<void> {
    try {
      console.log('Sending authentication email for user:', user.email);

      // 1. Firebase標準の認証メール送信（シンプルな設定）
      await sendEmailVerification(user);

      // 2. Trigger Email from Firestoreを使用してカスタム認証メール送信
      const emailTemplate = isInitialSignUp 
        ? AuthenticationEmailService.createWelcomeEmailTemplate(user)
        : AuthenticationEmailService.createVerificationEmailTemplate(user);

      // attachmentsフィールドを明示的に追加
      const emailData = {
        ...emailTemplate,
        attachments: [] // 空の添付ファイル配列を追加
      };

      // mailsコレクションにドキュメントを作成（Firebase拡張機能が自動処理）
      await addDoc(collection(crmDb, 'mails'), emailData);
      
      console.log('Authentication email sent successfully via Trigger Email extension');

    } catch (error) {
      console.error('Error sending authentication email:', error);
      throw error;
    }
  }

  /**
   * 初回サインアップ時のウェルカムメールテンプレート
   */
  private static createWelcomeEmailTemplate(user: User) {
    const verificationUrl = `https://narratives-crm.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(user.email || '')}`;
    
    return {
      to: [user.email],
      message: {
        subject: `${user.displayName || 'ユーザー'}様、Narratives CRMへようこそ！`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">Narratives CRMへようこそ！</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>アカウント作成が完了しました</h3>
              <p>
                ${user.displayName || 'ユーザー'}様のアカウントが正常に作成されました。
                サービスを利用するために、メールアドレスの認証をお願いします。
              </p>
            </div>

            <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【メール認証の手順】</h3>
              <ol>
                <li>下記の認証ボタンをクリックしてください</li>
                <li>認証が完了すると、自動的にログイン画面に戻ります</li>
                <li>認証完了後、CRMシステムのすべての機能がご利用いただけます</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #667eea; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-size: 16px;">
                メールアドレスを認証する
              </a>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【重要な注意事項】</h3>
              <ul>
                <li>メール認証を完了するまで、一部機能が制限される場合があります</li>
                <li>認証リンクの有効期限は24時間です</li>
                <li>リンクが無効な場合は、再度ログインを試してください</li>
              </ul>
            </div>

            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">
              Narratives CRM システム<br>
              このメールに心当たりがない場合は、管理者までお問い合わせください。
            </p>
          </div>
        `,
        text: `
${user.displayName || 'ユーザー'}様

Narratives CRMへようこそ！

アカウント作成が完了しました。サービスを利用するために、メールアドレスの認証をお願いします。

【メール認証URL】
${verificationUrl}

【認証の手順】
1. 上記URLをクリックしてメール認証を完了してください
2. 認証完了後、CRMシステムのすべての機能がご利用いただけます

【注意事項】
・認証リンクの有効期限は24時間です
・リンクが無効な場合は、再度ログインを試してください

Narratives CRM システム
        `
      },
      template: {
        name: 'crm-welcome-verification',
        data: {
          userName: user.displayName || 'ユーザー',
          userEmail: user.email,
          verificationUrl: verificationUrl
        }
      }
    };
  }

  /**
   * ログイン時の認証メールテンプレート
   */
  private static createVerificationEmailTemplate(user: User) {
    const verificationUrl = `https://narratives-crm.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(user.email || '')}`;
    
    return {
      to: [user.email],
      message: {
        subject: `${user.displayName || 'ユーザー'}様、メール認証のお願い`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">メール認証のお願い</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>ログインにはメール認証が必要です</h3>
              <p>
                ${user.displayName || 'ユーザー'}様、Narratives CRMにログインいただきありがとうございます。
                セキュリティ向上のため、メールアドレスの認証をお願いします。
              </p>
            </div>

            <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【認証手順】</h3>
              <ol>
                <li>下記の認証ボタンをクリックしてください</li>
                <li>認証が完了すると、自動的にCRMシステムにアクセスできます</li>
                <li>認証は一度完了すれば、今後は不要です</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #28a745; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-size: 16px;">
                メールアドレスを認証する
              </a>
            </div>

            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【セキュリティについて】</h3>
              <ul>
                <li>このメールは、お客様のアカウントのセキュリティを保護するために送信されています</li>
                <li>認証を完了しない場合、システムの一部機能が制限される場合があります</li>
                <li>認証リンクの有効期限は24時間です</li>
              </ul>
            </div>

            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">
              Narratives CRM システム<br>
              このメールに心当たりがない場合は、管理者までお問い合わせください。
            </p>
          </div>
        `,
        text: `
${user.displayName || 'ユーザー'}様

Narratives CRMにログインいただきありがとうございます。
セキュリティ向上のため、メールアドレスの認証をお願いします。

【メール認証URL】
${verificationUrl}

【認証手順】
1. 上記URLをクリックしてメール認証を完了してください
2. 認証完了後、CRMシステムのすべての機能がご利用いただけます

【注意事項】
・認証リンクの有効期限は24時間です
・認証を完了しない場合、システムの一部機能が制限される場合があります

Narratives CRM システム
        `
      },
      template: {
        name: 'crm-login-verification',
        data: {
          userName: user.displayName || 'ユーザー',
          userEmail: user.email,
          verificationUrl: verificationUrl
        }
      }
    };
  }

  /**
   * 認証メール再送信
   */
  static async resendAuthenticationEmail(user: User): Promise<void> {
    try {
      console.log('Resending authentication email for user:', user.email);
      
      // 認証メール再送信
      await AuthenticationEmailService.sendAuthenticationEmail(user, false);
      
      console.log('Authentication email resent successfully');
    } catch (error) {
      console.error('Error resending authentication email:', error);
      throw error;
    }
  }

  /**
   * ユーザーの認証状態を確認
   */
  static isUserEmailVerified(user: User): boolean {
    return user.emailVerified;
  }

  /**
   * 認証が必要かどうかを判定
   */
  static requiresEmailVerification(user: User): boolean {
    return !user.emailVerified;
  }
}

export default AuthenticationEmailService;
