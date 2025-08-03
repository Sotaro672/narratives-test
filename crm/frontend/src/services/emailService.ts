import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut } from 'firebase/auth';
import { crmAuth, crmDb } from '../config/firebase'; // CRM用の認証とデータベースを使用
import { doc, setDoc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import type { MemberFormData } from '../widgets/AddMemberForm';
import { MailModel } from '../models/Mails';

// データベース参照のエイリアス
const db = crmDb;
const auth = crmAuth;

export interface EmailInvitationResult {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

/**
 * ビジネスメンバー招待のためのメール認証機能
 */
export class EmailService {
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
        temporary_password: temporaryPassword // 一時パスワード（実際の運用では暗号化推奨）
      };

      await setDoc(doc(db, 'business_users', newUser.uid), businessUserData);
      console.log('Business user data saved to Firestore');

      // 4. メール送信用のmailsコレクションにMailModelを使用してドキュメントを追加
      const invitationMail = new MailModel({
        mailId: '', // 新規作成時は空（Firestoreで自動生成）
        userId: 'system', // システムからの送信
        recipientId: newUser.uid,
        subject: `${memberData.lastName} ${memberData.firstName}様、Narrativesへようこそ！`,
        body: `
お疲れ様です。Narratives CRMシステムへの招待が完了しました。

【ログイン情報】
・メールアドレス: ${memberData.emailAddress}
・一時パスワード: ${temporaryPassword}

【初回ログインの手順】
1. システムログインページ（${window.location.origin}/login）にアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${EmailService.getRoleDisplayName(memberData.role)}

【注意事項】
・このパスワードは一時的なものです
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
        `,
        status: 'draft',
        attachments: [],
        createdAt: new Date(),
        sentAt: null
      });

      // Firebase Extensions Trigger Email対応の形式でmailsコレクションに追加
      const mailRef = await addDoc(collection(db, 'mails'), {
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
      <li>システムログインページ（<a href="${window.location.origin}">${window.location.origin}/login</a>）にアクセス</li>
      <li>上記のメールアドレスとパスワードでログイン</li>
      <li>初回ログイン後、パスワードの変更をお願いします</li>
    </ol>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【あなたの役割】</h3>
    <p>・${EmailService.getRoleDisplayName(memberData.role)}</p>
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
・${EmailService.getRoleDisplayName(memberData.role)}

【注意事項】
・このパスワードは一時的なものです
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
          `
        },
        // 拡張機能のメタデータ（オプション）
        template: {
          name: 'member-invitation',
          data: {
            memberName: `${memberData.lastName} ${memberData.firstName}`,
            temporaryPassword: temporaryPassword,
            role: EmailService.getRoleDisplayName(memberData.role),
            loginUrl: `${window.location.origin}/login`,
            companyName: 'Narratives CRM'
          }
        },
        // MailModelデータを追加情報として保存
        metadata: {
          ...invitationMail.toJSON(),
          delivery: {
            startTime: new Date(),
            endTime: null
          }
        }
      });
      console.log('Invitation email queued for sending with ID:', mailRef.id);

      // 5. ウェルカムメール用の通知を作成（パスワード情報を含む）
      const welcomeNotification = {
        notification_id: `welcome_${newUser.uid}_${Date.now()}`,
        user_id: newUser.uid,
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
・${EmailService.getRoleDisplayName(memberData.role)}

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

      // 6. ウェルカム通知をFirestoreに保存
      await setDoc(doc(db, 'notifications', welcomeNotification.notification_id), welcomeNotification);

      // 5.1 仮パスワード更新通知を作成（ユーザー自身向け）
      const passwordNotification = {
        notification_id: `temp_password_${newUser.uid}_${Date.now()}`,
        user_id: newUser.uid,
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

      // 仮パスワード更新通知をFirestoreに保存
      console.log('Saving temporary password notification to Firestore:', passwordNotification);
      await setDoc(doc(db, 'notifications', passwordNotification.notification_id), passwordNotification);
      console.log('Temporary password notification created:', passwordNotification.notification_id);

      // 7. Firebase Authentication認証メール送信（シンプルな設定）
      try {
        await sendEmailVerification(newUser);
        console.log('Firebase verification email sent to:', memberData.emailAddress);
      } catch (emailError) {
        console.error('Firebase verification email failed:', emailError);
        // Firebase認証メールが失敗してもメンバー招待は継続
      }

      // 8. 招待プロセス完了後、作成されたユーザーをサインアウト
      // これにより、招待されたユーザーが自分のアカウントでログインできるようになる
      await signOut(auth);

      console.log('Business member invitation process completed. Email queued and notification saved.');

      return {
        success: true,
        message: `${memberData.lastName} ${memberData.firstName}さんに招待メールを送信しました`,
        userId: newUser.uid
      };

    } catch (error: any) {
      console.error('Error inviting business member:', error);
      
      // エラーメッセージの詳細化
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
   * 一時パスワードを生成（Firebase Authenticationの要件に準拠）
   */
  static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    // Firebase Authenticationは最低6文字必要、より安全な10文字で生成
    // 大文字・小文字・数字を確実に含む
    password += chars.substring(0, 26).charAt(Math.floor(Math.random() * 26)); // 大文字
    password += chars.substring(26, 52).charAt(Math.floor(Math.random() * 26)); // 小文字
    password += chars.substring(52, 62).charAt(Math.floor(Math.random() * 10)); // 数字
    
    // 残りの文字をランダムに追加（7文字追加して合計10文字）
    for (let i = 3; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // 文字列をシャッフル
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
   * 招待メールの再送信
   */
  static async resendInvitationEmail(userId: string): Promise<EmailInvitationResult> {
    try {
      console.log('Resending invitation email for business user:', userId);

      // Firestoreからビジネスユーザー情報を取得
      const userDoc = await getDoc(doc(db, 'business_users', userId));
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'ビジネスユーザーが見つかりません',
          error: 'Business user not found'
        };
      }

      const businessUserData = userDoc.data();
      
      // 新しい一時パスワードを生成
      const newTemporaryPassword = EmailService.generateTemporaryPassword();
      console.log('Generated new temporary password for resend');

      // Firestoreのビジネスユーザー情報を更新
      await updateDoc(doc(db, 'business_users', userId), {
        temporary_password: newTemporaryPassword,
        updated_at: new Date(),
        invitation_resent_at: new Date(),
        invitation_resend_count: (businessUserData.invitation_resend_count || 0) + 1
      });

      console.log('Business user data updated with new temporary password');

      // 再送信用のウェルカムメール通知を作成
      const resendNotification = {
        notification_id: `welcome_resend_${userId}_${Date.now()}`,
        user_id: userId,
        notification_type: 'welcome_email',
        title: `${businessUserData.last_name} ${businessUserData.first_name}様、Narrativesへようこそ！（再送信）`,
        body: `
お疲れ様です。Narratives CRMへの招待メールを再送信いたします。

【ログイン情報】
・メールアドレス: ${businessUserData.email_address}
・一時パスワード: ${newTemporaryPassword}

【初回ログインの手順】
1. システムログインページにアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${EmailService.getRoleDisplayName(businessUserData.role)}

【注意事項】
・このパスワードは一時的なものです
・以前の一時パスワードは無効になりました
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM
        `,
        is_read: false,
        created_at: new Date(),
        read_at: null,
        processed: false
      };

      // ウェルカム通知をFirestoreに保存
      await setDoc(doc(db, 'notifications', resendNotification.notification_id), resendNotification);
      console.log('Resend notification created:', resendNotification.notification_id);

      // 再送信用のメールをMailModelを使用してmailsコレクションに追加
      const resendInvitationMail = new MailModel({
        mailId: '', // 新規作成時は空（Firestoreで自動生成）
        userId: 'system', // システムからの送信
        recipientId: userId,
        subject: `${businessUserData.last_name} ${businessUserData.first_name}様、Narrativesへようこそ！（再送信）`,
        body: `
お疲れ様です。Narratives CRMシステムへの招待メールを再送信いたします。

【ログイン情報】
・メールアドレス: ${businessUserData.email_address}
・一時パスワード: ${newTemporaryPassword}

【初回ログインの手順】
1. システムログインページ（${window.location.origin}/login）にアクセス
2. 上記のメールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・${EmailService.getRoleDisplayName(businessUserData.role)}

【注意事項】
・このパスワードは一時的なものです
・以前の一時パスワードは無効になりました
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
        `,
        status: 'draft',
        attachments: [],
        createdAt: new Date(),
        sentAt: null
      });

      // Firebase Extensions Trigger Email対応の形式で再送信メールをmailsコレクションに追加
      const resendMailRef = await addDoc(collection(db, 'mails'), {
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
    <p>・${EmailService.getRoleDisplayName(businessUserData.role)}</p>
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
・${EmailService.getRoleDisplayName(businessUserData.role)}

【注意事項】
・このパスワードは一時的なものです
・以前の一時パスワードは無効になりました
・セキュリティのため、初回ログイン後に変更してください
・このメールは機密情報を含むため、適切に管理してください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
          `
        },
        // 拡張機能のメタデータ（オプション）
        template: {
          name: 'member-invitation-resend',
          data: {
            memberName: `${businessUserData.last_name} ${businessUserData.first_name}`,
            temporaryPassword: newTemporaryPassword,
            role: EmailService.getRoleDisplayName(businessUserData.role),
            loginUrl: `${window.location.origin}/login`,
            companyName: 'Narratives CRM',
            isResend: true,
            resendCount: (businessUserData.invitation_resend_count || 0) + 1
          }
        },
        // MailModelデータを追加情報として保存
        metadata: {
          ...resendInvitationMail.toJSON(),
          delivery: {
            startTime: new Date(),
            endTime: null
          }
        }
      });
      console.log('Resend invitation email queued for sending with ID:', resendMailRef.id);

      // 仮パスワード更新通知を作成（ユーザー自身向け）
      const passwordNotification = {
        notification_id: `temp_password_resend_${userId}_${Date.now()}`,
        user_id: userId,
        notification_type: 'temporary_password',
        title: `パスワード更新のお願い（再送信）`,
        body: `
セキュリティ上の理由から、新しく発行された仮パスワードを更新してください。

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

      // 仮パスワード更新通知をFirestoreに保存
      await setDoc(doc(db, 'notifications', passwordNotification.notification_id), passwordNotification);
      console.log('Temporary password notification created:', passwordNotification.notification_id);

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
   * ビジネスユーザーのメール認証状態を確認
   */
  static async checkEmailVerificationStatus(userId: string): Promise<boolean> {
    try {
      // ビジネスユーザーのメール認証状態を確認
      // 実際の実装では、Firestoreからビジネスユーザー情報を取得して確認
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
      // Firestoreからメール履歴を取得する実装
      // 実際の実装では、recipientIdまたはbusiness_user_idでクエリを実行
      console.log('Getting mail history for business user:', userId);
      return []; // 実装時に適切に変更
    } catch (error) {
      console.error('Error getting mail history:', error);
      return [];
    }
  }
}

export default EmailService;
