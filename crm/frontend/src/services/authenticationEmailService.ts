import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification } from 'firebase/auth';
import { crmAuth, crmDb } from '../config/firebase'; // CRM用の認証とデータベースを使用
import { doc, setDoc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User } from 'firebase/auth';
import type { MemberFormData } from '../widgets/AddMemberForm';
import { MailModel } from '../models/Mails';

// データベース参照のエイリアス
const db = crmDb;
const auth = crmAuth;
const functions = getFunctions();

// Cloud Functions
const triggerEmailSend = httpsCallable(functions, 'triggerEmailSend');

export interface EmailInvitationResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

/**
 * 統合メールサービス（認証メール + ビジネスメンバー招待メール）
 * Trigger Email from Firestoreを利用してメールを送信
 */
export class AuthenticationEmailService {
  /**
   * 新規ビジネスメンバーを作成し、認証メールを送信
   */
  static async inviteMember(
    memberData: MemberFormData, 
    companyId: string, 
    temporaryPassword: string = this.generateTemporaryPassword()
  ): Promise<EmailInvitationResult> {
    try {
      console.log('Creating new business member with email verification:', memberData.emailAddress);

      // 1. Firebase Authenticationでユーザーを作成
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        memberData.emailAddress, 
        temporaryPassword
      );

      const newUser = userCredential.user;
      console.log('Business user created in Firebase Auth:', newUser.uid);

      // 2. ユーザープロファイルを更新
      await updateProfile(newUser, {
        displayName: `${memberData.lastName} ${memberData.firstName}`
      });

      // 3. Firestoreにビジネスユーザー情報を保存
      const businessUserData = {
        business_user_id: newUser.uid,
        first_name: memberData.firstName,
        first_name_katakana: memberData.firstNameKatakana,
        last_name: memberData.lastName,
        last_name_katakana: memberData.lastNameKatakana,
        email_address: memberData.emailAddress,
        role: memberData.role,
        belong_to: [companyId],
        created_at: new Date(),
        updated_at: new Date(),
        status: 'invited',
        email_verified: false,
        temporary_password: temporaryPassword
      };

      await setDoc(doc(db, 'business_users', newUser.uid), businessUserData);
      console.log('Business user data saved to Firestore');

      // 4. 招待メール送信
      await this.sendInvitationEmail(memberData, temporaryPassword, companyId, newUser.uid);

      // 5. 招待プロセス完了後、作成されたユーザーをサインアウト
      await signOut(auth);

      console.log('Business member invitation process completed.');

      return {
        success: true,
        message: `${memberData.lastName} ${memberData.firstName}さんに招待メールを送信しました`,
        userId: newUser.uid
      };

    } catch (error: any) {
      console.error('Error inviting business member:', error);
      
      let errorMessage = 'ビジネスメンバー招待に失敗しました';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '無効なメールアドレスです';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'ネットワークエラーが発生しました';
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }

  /**
   * 招待メール送信
   */
  private static async sendInvitationEmail(
    memberData: MemberFormData, 
    temporaryPassword: string, 
    companyId: string, 
    userId: string
  ): Promise<void> {
    // Firebase Extensions Trigger Email対応の形式でメール作成
    const memberMailData = {
      to: [memberData.emailAddress],
      message: {
        subject: `${memberData.lastName} ${memberData.firstName}様、Narrativesへようこそ！`,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">お疲れ様です。Narratives CRMシステムへの招待が完了しました。</h2>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【ログイン情報】</h3>
    <p>・メールアドレス: <strong>${memberData.emailAddress}</strong></p>
    <p>・一時パスワード: <strong>${temporaryPassword}</strong></p>
  </div>

  <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【初回ログインの手順】</h3>
    <ol>
      <li>システムログインページ（<a href="${window.location.origin}/login">${window.location.origin}/login</a>）にアクセス</li>
      <li>上記のメールアドレスとパスワードでログイン</li>
      <li>初回ログイン後、パスワードの変更をお願いします</li>
    </ol>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【あなたの役割】</h3>
    <p>・${AuthenticationEmailService.getRoleDisplayName(memberData.role)}</p>
  </div>

  <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【注意事項】</h3>
    <ul>
      <li>このパスワードは一時的なものです</li>
      <li>セキュリティのため、初回ログイン後に変更してください</li>
      <li>このメールは機密情報を含むため、適切に管理してください</li>
    </ul>
  </div>

  <p>何かご質問がございましたら、管理者までお問い合わせください。</p>
  
  <hr style="margin: 30px 0;">
  <p style="color: #666; font-size: 14px;">Narratives CRM システム</p>
</div>
        `,
        text: `
お疲れ様です。Narratives CRMシステムへの招待が完了しました。

【ログイン情報】
・メールアドレス: ${memberData.emailAddress}
・一時パスワード: ${temporaryPassword}

【初回ログインの手順】
1. システムログインページ（${window.location.origin}/login）にアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${AuthenticationEmailService.getRoleDisplayName(memberData.role)}

【注意事項】
・このパスワードは一時的なものです
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
        `
      },
      attachments: [],
      memberInfo: {
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        role: memberData.role,
        companyId: companyId,
        temporaryPassword: temporaryPassword
      },
      delivery: {
        startTime: new Date(),
        endTime: null
      }
    };

    // Cloud Function経由でメール送信
    const emailResult = await this.sendEmailViaCloudFunction(memberMailData);
    
    if (!emailResult.success) {
      console.error('Failed to queue invitation email:', emailResult.error);
      throw new Error(`メール送信に失敗しました: ${emailResult.error}`);
    }
    
    console.log('Invitation email queued for sending with ID:', emailResult.mailId);

    // 通知も作成
    await this.createWelcomeNotification(memberData, temporaryPassword, userId);
  }

  /**
   * 招待メールの再送信
   */
  static async resendInvitationEmail(userId: string): Promise<EmailInvitationResult> {
    try {
      console.log('Resending invitation email for business user:', userId);

      const userDoc = await getDoc(doc(db, 'business_users', userId));
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'ビジネスユーザーが見つかりません',
          error: 'Business user not found'
        };
      }

      const businessUserData = userDoc.data();
      const newTemporaryPassword = AuthenticationEmailService.generateTemporaryPassword();

      // Firestoreのビジネスユーザー情報を更新
      await updateDoc(doc(db, 'business_users', userId), {
        temporary_password: newTemporaryPassword,
        updated_at: new Date(),
        invitation_resent_at: new Date(),
        invitation_resend_count: (businessUserData.invitation_resend_count || 0) + 1
      });

      // 再送信メール作成
      const mailData = {
        to: [businessUserData.email_address],
        message: {
          subject: `${businessUserData.last_name} ${businessUserData.first_name}様、Narrativesへようこそ！（再送信）`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">お疲れ様です。Narratives CRMへの招待メールを再送信いたします。</h2>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【ログイン情報】</h3>
    <p>・メールアドレス: <strong>${businessUserData.email_address}</strong></p>
    <p>・一時パスワード: <strong>${newTemporaryPassword}</strong></p>
  </div>

  <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【初回ログインの手順】</h3>
    <ol>
      <li>システムログインページ（<a href="${window.location.origin}/login">${window.location.origin}/login</a>）にアクセス</li>
      <li>上記のメールアドレスとパスワードでログイン</li>
      <li>初回ログイン後、パスワードの変更をお願いします</li>
    </ol>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【あなたの役割】</h3>
    <p>・${AuthenticationEmailService.getRoleDisplayName(businessUserData.role)}</p>
  </div>

  <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【注意事項】</h3>
    <ul>
      <li>このパスワードは一時的なものです</li>
      <li><strong>以前の一時パスワードは無効になりました</strong></li>
      <li>セキュリティのため、初回ログイン後に変更してください</li>
      <li>このメールは機密情報を含むため、適切に管理してください</li>
    </ul>
  </div>

  <p>何かご質問がございましたら、管理者までお問い合わせください。</p>
  
  <hr style="margin: 30px 0;">
  <p style="color: #666; font-size: 14px;">Narratives CRM</p>
</div>
          `,
          text: `
お疲れ様です。Narratives CRMシステムへの招待メールを再送信いたします。

【ログイン情報】
・メールアドレス: ${businessUserData.email_address}
・一時パスワード: ${newTemporaryPassword}

【初回ログインの手順】
1. システムログインページ（${window.location.origin}/login）にアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${AuthenticationEmailService.getRoleDisplayName(businessUserData.role)}

【注意事項】
・このパスワードは一時的なものです
・以前の一時パスワードは無効になりました
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
          `
        },
        attachments: [],
        delivery: {
          startTime: new Date(),
          endTime: null
        },
        resendInfo: {
          isResend: true,
          originalUserId: userId,
          resendCount: (businessUserData.invitation_resend_count || 0) + 1,
          previousTemporaryPassword: businessUserData.temporary_password || null
        }
      };

      const resendMailRef = await addDoc(collection(db, 'mails'), mailData);
      console.log('Resend invitation email queued for sending with ID:', resendMailRef.id);

      return {
        success: true,
        message: `${businessUserData.last_name} ${businessUserData.first_name}さんに認証メールを再送信しました`
      };

    } catch (error: any) {
      console.error('Error resending invitation email:', error);
      
      return {
        success: false,
        message: '認証メールの再送信に失敗しました',
        error: error.message
      };
    }
  }

  /**
   * 一時パスワードを生成
   */
  static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    password += chars.substring(0, 26).charAt(Math.floor(Math.random() * 26)); // 大文字
    password += chars.substring(26, 52).charAt(Math.floor(Math.random() * 26)); // 小文字
    password += chars.substring(52, 62).charAt(Math.floor(Math.random() * 10)); // 数字
    
    for (let i = 3; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * 役割の日本語表示名を取得
   */
  static getRoleDisplayName(role: string): string {
    switch (role) {
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
      default:
        return '不明';
    }
  }

  /**
   * ウェルカム通知作成
   */
  private static async createWelcomeNotification(
    memberData: MemberFormData, 
    temporaryPassword: string, 
    userId: string
  ): Promise<void> {
    const welcomeNotification = {
      notification_id: `welcome_${userId}_${Date.now()}`,
      user_id: userId,
      notification_type: 'welcome_email',
      title: `${memberData.lastName} ${memberData.firstName}様、Narrativesへようこそ！`,
      body: `
お疲れ様です。Narratives CRMシステムへの招待が完了しました。

【ログイン情報】
・メールアドレス: ${memberData.emailAddress}
・一時パスワード: ${temporaryPassword}

【初回ログインの手順】
1. システムログインページにアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${AuthenticationEmailService.getRoleDisplayName(memberData.role)}

【注意事項】
・このパスワードは一時的なものです
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
      `,
      is_read: false,
      created_at: new Date(),
      read_at: null
    };

    await setDoc(doc(db, 'notifications', welcomeNotification.notification_id), welcomeNotification);

    // パスワード更新通知も作成
    const passwordNotification = {
      notification_id: `temp_password_${userId}_${Date.now()}`,
      user_id: userId,
      notification_type: 'temporary_password',
      title: `パスワード更新のお願い`,
      body: `
セキュリティ上の理由から、現在使用している仮パスワードを更新してください。

【パスワード更新手順】
1. 画面右上のユーザーメニューをクリック
2. 「パスワード変更」を選択
3. 新しいパスワードを設定

仮パスワードを継続して使用すると、アカウントのセキュリティが低下する恐れがあります。
早めの更新をお願いします。
      `,
      is_read: false,
      created_at: new Date(),
      read_at: null
    };

    await setDoc(doc(db, 'notifications', passwordNotification.notification_id), passwordNotification);
  }

  /**
   * サインイン時の認証メール送信
   * @param user Firebase認証ユーザー
   * @param isInitialSignUp 初回サインアップかどうか
   */
  static async sendAuthenticationEmail(user: User, isInitialSignUp: boolean = false): Promise<void> {
    try {
      console.log('Sending authentication email for user:', user.email);
      console.log('User email verified status:', user.emailVerified);
      console.log('Is initial signup:', isInitialSignUp);

      // Firebase標準の認証メールを送信（一時的に有効化）
      await sendEmailVerification(user, {
        url: 'https://narratives-crm-site.web.app/auth/verify',
        handleCodeInApp: true
      });

      // Trigger Email from Firestoreを使用してカスタム認証メール送信
      const emailTemplate = isInitialSignUp 
        ? AuthenticationEmailService.createWelcomeEmailTemplate(user)
        : AuthenticationEmailService.createVerificationEmailTemplate(user);

      // attachmentsフィールドを明示的に追加
      const emailData = {
        ...emailTemplate,
        attachments: [], // 空の添付ファイル配列を追加
        emailType: isInitialSignUp ? 'welcome_verification' : 'login_verification',
        userId: user.uid,
        sentAt: new Date()
      };

      console.log('Preparing to send email with data:', {
        to: emailData.to,
        subject: emailData.message.subject,
        emailType: emailData.emailType,
        userId: emailData.userId
      });

      // 現在の認証状態を確認
      console.log('Current auth state before sending email:', {
        currentUser: crmAuth.currentUser ? crmAuth.currentUser.email : 'No user',
        uid: crmAuth.currentUser ? crmAuth.currentUser.uid : 'No UID'
      });

      // mailsコレクションにドキュメントを作成（Firebase拡張機能が自動処理）
      const mailRef = await addDoc(collection(crmDb, 'mails'), emailData);
      console.log('Custom authentication email queued with document ID:', mailRef.id);
      
      console.log('Custom authentication email sent successfully via Trigger Email extension');

    } catch (error) {
      console.error('Error sending authentication email:', error);
      console.error('Email sending error details:', {
        code: (error as any).code,
        message: (error as any).message,
        stack: (error as any).stack
      });
      throw error;
    }
  }

  /**
   * 認証情報付きサインイン時の認証メール送信
   * @param user Firebase認証ユーザー
   * @param isInitialSignUp 初回サインアップかどうか
   * @param temporaryPassword 一時パスワード
   * @param emailAddress メールアドレス
   */
  static async sendAuthenticationEmailWithCredentials(
    user: User, 
    isInitialSignUp: boolean = false, 
    temporaryPassword: string,
    emailAddress: string
  ): Promise<void> {
    try {
      console.log('Sending authentication email with credentials for user:', user.email);
      console.log('Temporary password provided:', temporaryPassword ? '[REDACTED]' : 'None');
      console.log('Email address provided:', emailAddress);
      console.log('Is initial signup:', isInitialSignUp);

      // 招待メールであることを確認（初回サインアップの場合のみ送信）
      if (!isInitialSignUp) {
        console.log('Skipping credentials email for non-initial signup');
        return; // 通常のサインインでは認証情報付きメールは送信しない
      }

      // 認証情報付きのカスタムメールテンプレートを作成
      const emailTemplate = AuthenticationEmailService.createWelcomeEmailTemplateWithCredentials(user, temporaryPassword, emailAddress);

      // attachmentsフィールドを明示的に追加
      const emailData = {
        ...emailTemplate,
        attachments: [], // 空の添付ファイル配列を追加
        emailType: 'welcome_verification_with_credentials',
        userId: user.uid,
        temporaryPassword: temporaryPassword,
        emailAddress: emailAddress,
        sentAt: new Date()
      };

      console.log('Preparing to send credentials email with data:', {
        to: emailData.to,
        subject: emailData.message.subject,
        emailType: emailData.emailType,
        userId: emailData.userId,
        hasTemporaryPassword: !!emailData.temporaryPassword
      });

      // 現在の認証状態を確認
      console.log('Current auth state before sending credentials email:', {
        currentUser: crmAuth.currentUser ? crmAuth.currentUser.email : 'No user',
        uid: crmAuth.currentUser ? crmAuth.currentUser.uid : 'No UID'
      });

      // mailsコレクションにドキュメントを作成（Firebase拡張機能が自動処理）
      const mailRef = await addDoc(collection(crmDb, 'mails'), emailData);
      console.log('Custom authentication email with credentials queued with document ID:', mailRef.id);
      
      console.log('Custom authentication email with credentials sent successfully via Trigger Email extension');

    } catch (error) {
      console.error('Error sending authentication email with credentials:', error);
      console.error('Credentials email error details:', {
        code: (error as any).code,
        message: (error as any).message,
        stack: (error as any).stack
      });
      throw error;
    }
  }

  /**
   * 初回サインアップ時のウェルカムメールテンプレート（認証情報付き）
   */
  private static createWelcomeEmailTemplateWithCredentials(user: User, temporaryPassword: string, emailAddress: string) {
    // 認証URLに一時パスワードとメールアドレスを含める
    const verificationUrl = `https://narratives-crm-site.web.app/auth/verify?mode=action&oobCode=${user.uid}&email=${encodeURIComponent(emailAddress)}&tempPassword=${encodeURIComponent(temporaryPassword)}`;
    
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
              <h3>【ログイン情報】</h3>
              <p><strong>メールアドレス:</strong> ${emailAddress}</p>
              <p><strong>一時パスワード:</strong> ${temporaryPassword}</p>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【認証手順】</h3>
              <ol>
                <li>下記の認証ボタンをクリックしてメール認証を完了してください</li>
                <li>認証完了後、上記のログイン情報でCRMシステムにアクセスできます</li>
                <li>初回ログイン後は、セキュリティのためパスワードの変更をお願いします</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #28a745; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-size: 16px;">
                メールアドレスを認証してアカウントを有効化
              </a>
            </div>

            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>【重要事項】</h3>
              <ul>
                <li>認証リンクの有効期限は24時間です</li>
                <li>上記の一時パスワードは初回ログイン後に変更してください</li>
                <li>このメールは機密情報を含むため、適切に管理してください</li>
              </ul>
            </div>

            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">
              Narratives CRM システム
            </p>
          </div>
        `,
        text: `
${user.displayName || 'ユーザー'}様

Narratives CRMへようこそ！
アカウントが正常に作成されました。

【ログイン情報】
メールアドレス: ${emailAddress}
一時パスワード: ${temporaryPassword}

【メール認証URL】
${verificationUrl}

【認証手順】
1. 上記URLをクリックしてメール認証を完了してください
2. 認証完了後、ログイン情報でCRMシステムにアクセス
3. 初回ログイン後は、パスワードの変更をお願いします

【注意事項】
・認証リンクの有効期限は24時間です
・一時パスワードはセキュリティのため変更してください

Narratives CRM システム
        `
      },
      template: {
        name: 'crm-welcome-verification-with-credentials',
        data: {
          userName: user.displayName || 'ユーザー',
          userEmail: user.email,
          emailAddress: emailAddress,
          temporaryPassword: temporaryPassword,
          verificationUrl: verificationUrl
        }
      }
    };
  }

  /**
   * ログイン時の認証メールテンプレート（認証情報付き）
   */
  private static createVerificationEmailTemplateWithCredentials(user: User, temporaryPassword: string, emailAddress: string) {
    // 認証URLに一時パスワードとメールアドレスを含める
    const verificationUrl = `https://narratives-crm-site.web.app/auth/verify?mode=action&oobCode=${user.uid}&email=${encodeURIComponent(emailAddress)}&tempPassword=${encodeURIComponent(temporaryPassword)}`;
    
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
              <h3>【ログイン情報確認】</h3>
              <p><strong>メールアドレス:</strong> ${emailAddress}</p>
              <p><strong>パスワード:</strong> ${temporaryPassword}</p>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
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

【ログイン情報確認】
メールアドレス: ${emailAddress}
パスワード: ${temporaryPassword}

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
        name: 'crm-login-verification-with-credentials',
        data: {
          userName: user.displayName || 'ユーザー',
          userEmail: user.email,
          emailAddress: emailAddress,
          temporaryPassword: temporaryPassword,
          verificationUrl: verificationUrl
        }
      }
    };
  }

  /**
   * 初回サインアップ時のウェルカムメールテンプレート
   */
  private static createWelcomeEmailTemplate(user: User) {
    const verificationUrl = `https://narratives-crm-site.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(user.email || '')}`;
    
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
    const verificationUrl = `https://narratives-crm-site.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(user.email || '')}`;
    
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
   * メール認証完了時にウェルカムメールを送信
   * @param user 認証完了したユーザー
   */
  static async sendWelcomeEmailOnVerification(user: User): Promise<void> {
    try {
      console.log('Sending welcome email after email verification for user:', user.email);

      // ウェルカムメールテンプレートを作成
      const welcomeEmailTemplate = AuthenticationEmailService.createPostVerificationWelcomeTemplate(user);

      // attachmentsフィールドを明示的に追加
      const emailData = {
        ...welcomeEmailTemplate,
        attachments: [],
        emailType: 'post_verification_welcome',
        userId: user.uid,
        sentAt: new Date(),
        triggerEvent: 'email_verification_completed'
      };

      // mailsコレクションにドキュメントを作成
      await addDoc(collection(crmDb, 'mails'), emailData);
      
      console.log('Welcome email sent successfully after email verification');

    } catch (error) {
      console.error('Error sending welcome email after verification:', error);
      throw error;
    }
  }

  /**
   * メール認証完了後のウェルカムメールテンプレート
   */
  private static createPostVerificationWelcomeTemplate(user: User) {
    const loginUrl = `https://narratives-crm-site.web.app/login`;
    
    return {
      to: [user.email],
      message: {
        subject: `${user.displayName || 'ユーザー'}様、メール認証が完了しました！`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #28a745; text-align: center;">🎉 メール認証が完了しました！</h2>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3>認証完了のお知らせ</h3>
              <p>
                ${user.displayName || 'ユーザー'}様、メールアドレスの認証が正常に完了いたしました。
                これでNarratives CRMのすべての機能をご利用いただけます。
              </p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>🚀 ご利用開始の手順</h3>
              <ol>
                <li>下記のボタンからログイン画面にアクセス</li>
                <li>登録されたメールアドレスとパスワードでログイン</li>
                <li>CRMシステムの機能をお楽しみください</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
                📱 CRMシステムにログイン
              </a>
            </div>

            <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>📋 ご利用可能な機能</h3>
              <ul>
                <li>顧客情報の管理と分析</li>
                <li>ビジネスメンバーの招待</li>
                <li>組織・ブランド管理</li>
                <li>レポートとダッシュボード</li>
                <li>ニュースとお知らせの確認</li>
              </ul>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>💡 お役立ち情報</h3>
              <ul>
                <li>初回ログイン後は、プロファイル設定の確認をお勧めします</li>
                <li>パスワードは定期的に変更することをお勧めします</li>
                <li>ご不明な点がございましたら、サポートまでお気軽にお問い合わせください</li>
              </ul>
            </div>

            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 14px; text-align: center;">
              Narratives CRM システム<br>
              サポート: support@narratives.co.jp<br>
              このメールは自動送信されています。
            </p>
          </div>
        `,
        text: `
${user.displayName || 'ユーザー'}様

🎉 メール認証が完了しました！

メールアドレスの認証が正常に完了いたしました。
これでNarratives CRMのすべての機能をご利用いただけます。

【ご利用開始の手順】
1. ログイン画面にアクセス: ${loginUrl}
2. 登録されたメールアドレスとパスワードでログイン
3. CRMシステムの機能をお楽しみください

【ご利用可能な機能】
・顧客情報の管理と分析
・ビジネスメンバーの招待
・組織・ブランド管理
・レポートとダッシュボード
・ニュースとお知らせの確認

【お役立ち情報】
・初回ログイン後は、プロファイル設定の確認をお勧めします
・パスワードは定期的に変更することをお勧めします
・ご不明な点がございましたら、サポートまでお気軽にお問い合わせください

Narratives CRM システム
サポート: support@narratives.co.jp
        `
      },
      template: {
        name: 'crm-post-verification-welcome',
        data: {
          userName: user.displayName || 'ユーザー',
          userEmail: user.email,
          loginUrl: loginUrl
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

  /**
   * ビジネスユーザーのメール認証状態を確認
   */
  static async checkEmailVerificationStatus(userId: string): Promise<boolean> {
    try {
      console.log('Checking email verification status for business user:', userId);
      return false; // 実装時に適切に変更
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  }

  /**
   * メールのステータスを更新
   */
  static async updateMailStatus(mailId: string, status: 'sent' | 'error', sentAt?: Date): Promise<void> {
    try {
      const updateData: any = {
        status: status,
        updated_at: new Date()
      };

      if (status === 'sent' && sentAt) {
        updateData.sent_at = sentAt;
      }

      await updateDoc(doc(db, 'mails', mailId), updateData);
      console.log('Mail status updated:', mailId, status);
    } catch (error) {
      console.error('Error updating mail status:', error);
    }
  }

  /**
   * 特定のビジネスユーザーのメール履歴を取得
   */
  static async getMailHistory(userId: string): Promise<MailModel[]> {
    try {
      console.log('Getting mail history for business user:', userId);
      return []; // 実装時に適切に変更
    } catch (error) {
      console.error('Error getting mail history:', error);
      return [];
    }
  }

  /**
   * Cloud Function経由でメール送信
   */
  static async sendEmailViaCloudFunction(emailData: any): Promise<{ success: boolean; mailId?: string; error?: string }> {
    try {
      console.log('Sending email via Cloud Function:', emailData);
      
      const result = await triggerEmailSend(emailData);
      
      if (result.data && (result.data as any).success) {
        console.log('Email queued successfully via Cloud Function:', (result.data as any).mailId);
        return { 
          success: true, 
          mailId: (result.data as any).mailId 
        };
      } else {
        throw new Error('Cloud Function returned failure');
      }
    } catch (error) {
      console.error('Error sending email via Cloud Function:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 認証メール専用の送信（auth_mailsコレクション使用）
   */
  static async sendAuthenticationEmailDirect(emailData: {
    to: string;
    type: 'verification' | 'password_reset';
    verificationUrl?: string;
    resetUrl?: string;
    credentials?: {
      email: string;
      password: string;
    };
  }): Promise<{ success: boolean; mailId?: string; error?: string }> {
    try {
      console.log('Sending authentication email directly to auth_mails collection:', emailData);
      
      const mailRef = await addDoc(collection(db, 'auth_mails'), {
        ...emailData,
        timestamp: new Date(),
        status: 'pending'
      });
      
      console.log('Authentication email queued with ID:', mailRef.id);
      return { 
        success: true, 
        mailId: mailRef.id 
      };
    } catch (error) {
      console.error('Error queuing authentication email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// EmailServiceとしてもエクスポート（後方互換性のため）
export const EmailService = AuthenticationEmailService;

export default AuthenticationEmailService;
