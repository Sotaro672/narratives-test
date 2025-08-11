import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification } from 'firebase/auth';
import { crmAuth, crmDb } from '../config/firebase'; // CRM用の認証とデータベースを使用
import { doc, setDoc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
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

export class AuthenticationEmailService {
  static async inviteMember(
    memberData: MemberFormData,
    companyId: string,
    temporaryPassword: string = this.generateTemporaryPassword()
  ): Promise<EmailInvitationResult> {
    try {
      console.log('Creating new business member with email verification:', memberData.emailAddress);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        memberData.emailAddress,
        temporaryPassword
      );

      const newUser = userCredential.user;
      console.log('Business user created in Firebase Auth:', newUser.uid);

      await updateProfile(newUser, {
        displayName: `${memberData.lastName} ${memberData.firstName}`,
      });

      const businessUserData = {
        business_user_id: newUser.uid,
        user_id: newUser.uid,
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
        temporary_password: temporaryPassword,
      };

      await setDoc(doc(db, 'business_users', newUser.uid), businessUserData);
      console.log('Business user data saved to Firestore');

      await this.sendInvitationEmail(memberData, temporaryPassword, companyId, newUser.uid);

      await signOut(auth);

      console.log('Business member invitation process completed.');

      return {
        success: true,
        message: `${memberData.lastName} ${memberData.firstName}さんに招待メールを送信しました`,
        userId: newUser.uid,
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
        error: error.message,
      };
    }
  }

  private static async sendInvitationEmail(
    memberData: MemberFormData,
    temporaryPassword: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    const memberMailData = {
      to: [memberData.emailAddress],
      message: {
        subject: `${memberData.lastName} ${memberData.firstName}様、Narrativesへようこそ！`,
        html: `...省略（元のHTMLを流用）...`,
        text: `...省略（元のTEXTを流用）...`,
      },
      attachments: [],
      memberInfo: {
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        role: memberData.role,
        companyId: companyId,
        temporaryPassword: temporaryPassword,
      },
      delivery: {
        startTime: new Date(),
        endTime: null,
      },
      userId: userId,
      uid: userId,
      emailType: 'invite',
      sentAt: new Date(),
    };

    const mailId = `invite_${userId}`;
    await setDoc(doc(db, 'mails', mailId), memberMailData, { merge: false });
    console.log('Invitation email queued (idempotent) with ID:', mailId);

    // 一時パスワードは通知本文では使わないため、引数から除外済み
    await this.createWelcomeNotification(memberData, userId);
  }

  static async resendInvitationEmail(userId: string): Promise<EmailInvitationResult> {
    try {
      console.log('Resending invitation email for business user:', userId);

      const userDoc = await getDoc(doc(db, 'business_users', userId));
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'ビジネスユーザーが見つかりません',
          error: 'Business user not found',
        };
      }

      const businessUserData = userDoc.data() as any;
      const newTemporaryPassword = AuthenticationEmailService.generateTemporaryPassword();

      await updateDoc(doc(db, 'business_users', userId), {
        temporary_password: newTemporaryPassword,
        updated_at: new Date(),
        invitation_resent_at: new Date(),
        invitation_resend_count: (businessUserData.invitation_resend_count || 0) + 1,
      });

      const mailData = {
        to: [businessUserData.email_address],
        message: {
          subject: `${businessUserData.last_name} ${businessUserData.first_name}様、Narrativesへようこそ！（再送信）`,
          html: `...省略（元のHTMLを流用）...`,
          text: `...省略（元のTEXTを流用）...`,
        },
        attachments: [],
        delivery: {
          startTime: new Date(),
          endTime: null,
        },
        resendInfo: {
          isResend: true,
          originalUserId: userId,
          resendCount: (businessUserData.invitation_resend_count || 0) + 1,
          previousTemporaryPassword: businessUserData.temporary_password || null,
        },
        userId,
        uid: userId,
        emailType: 'invite_resend',
        sentAt: new Date(),
      };

      const resendMailRef = await addDoc(collection(db, 'mails'), mailData);
      console.log('Resend invitation email queued for sending with ID:', resendMailRef.id);

      return {
        success: true,
        message: `${businessUserData.last_name} ${businessUserData.first_name}さんに認証メールを再送信しました`,
      };
    } catch (error: any) {
      console.error('Error resending invitation email:', error);

      return {
        success: false,
        message: '認証メールの再送信に失敗しました',
        error: error.message,
      };
    }
  }

  static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';

    password += chars.substring(0, 26).charAt(Math.floor(Math.random() * 26));
    password += chars.substring(26, 52).charAt(Math.floor(Math.random() * 26));
    password += chars.substring(52, 62).charAt(Math.floor(Math.random() * 10));

    for (let i = 3; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  static getRoleDisplayName(role: string): string {
    switch (role) {
      case 'root': return 'ルート管理者';
      case 'admin': return 'ブランド管理者';
      case 'production_manager': return '生産計画責任者';
      case 'token_designer': return 'トークン設計者';
      case 'customer_support_manager': return 'カスタマーサポート責任者';
      case 'user': return '一般ユーザー';
      default: return '不明';
    }
  }

  // ← ここ：temporaryPassword 引数を削除
  private static async createWelcomeNotification(
    memberData: MemberFormData,
    userId: string
  ): Promise<void> {
    const welcomeNotification = {
      notification_id: `welcome_${userId}_${Date.now()}`,
      user_id: userId,
      notification_type: 'welcome_email',
      title: `${memberData.lastName} ${memberData.firstName}様、Narrativesへようこそ！`,
      body: `...省略（元の本文を流用）...`,
      is_read: false,
      created_at: new Date(),
      read_at: null,
    };

    await setDoc(doc(db, 'notifications', welcomeNotification.notification_id), welcomeNotification);

    const passwordNotification = {
      notification_id: `temp_password_${userId}_${Date.now()}`,
      user_id: userId,
      notification_type: 'temporary_password',
      title: `パスワード更新のお願い`,
      body: `...省略（元の本文を流用）...`,
      is_read: false,
      created_at: new Date(),
      read_at: null,
    };

    await setDoc(doc(db, 'notifications', passwordNotification.notification_id), passwordNotification);
  }

  static async sendAuthenticationEmail(user: User, isInitialSignUp: boolean = false): Promise<void> {
    try {
      console.log('Sending authentication email for user:', user.email);

      await sendEmailVerification(user, {
        url: 'https://narratives-crm-site.web.app/auth/verify',
        handleCodeInApp: true,
      });

      const emailTemplate = isInitialSignUp
        ? AuthenticationEmailService.createWelcomeEmailTemplate(user)
        : AuthenticationEmailService.createVerificationEmailTemplate(user);

      const emailData = {
        ...emailTemplate,
        attachments: [],
        emailType: isInitialSignUp ? 'welcome_verification' : 'login_verification',
        userId: user.uid,
        uid: user.uid,
        sentAt: new Date(),
      };

      const mailId = `${user.uid}_${emailData.emailType}`;
      await setDoc(doc(crmDb, 'mails', mailId), emailData, { merge: false });
      console.log('Custom authentication email queued with document ID:', mailId);
    } catch (error) {
      console.error('Error sending authentication email:', error);
      throw error;
    }
  }

  private static createWelcomeEmailTemplate(user: User) {
    const verificationUrl = `https://narratives-crm-site.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(
      user.email || ''
    )}`;
    return {
      to: [user.email],
      message: { subject: `${user.displayName || 'ユーザー'}様、Narratives CRMへようこそ！`, html: `...`, text: `...` },
      template: {
        name: 'crm-welcome-verification',
        data: { userName: user.displayName || 'ユーザー', userEmail: user.email, verificationUrl }
      },
    };
  }

  private static createVerificationEmailTemplate(user: User) {
    const verificationUrl = `https://narratives-crm-site.web.app/email-verification?uid=${user.uid}&email=${encodeURIComponent(
      user.email || ''
    )}`;
    return {
      to: [user.email],
      message: { subject: `${user.displayName || 'ユーザー'}様、メール認証のお願い`, html: `...`, text: `...` },
      template: {
        name: 'crm-login-verification',
        data: { userName: user.displayName || 'ユーザー', userEmail: user.email, verificationUrl }
      },
    };
  }

  static async sendWelcomeEmailOnVerification(user: User): Promise<void> {
    try {
      console.log('Sending welcome email after email verification for user:', user.email);
      const welcomeEmailTemplate = AuthenticationEmailService.createPostVerificationWelcomeTemplate(user);
      const emailData = {
        ...welcomeEmailTemplate,
        attachments: [],
        emailType: 'post_verification_welcome',
        userId: user.uid,
        uid: user.uid,
        sentAt: new Date(),
        triggerEvent: 'email_verification_completed',
      };
      const mailId = `${user.uid}_${emailData.emailType}`;
      await setDoc(doc(crmDb, 'mails', mailId), emailData, { merge: false });
      console.log('Welcome email sent (idempotent) with ID:', mailId);
    } catch (error) {
      console.error('Error sending welcome email after verification:', error);
      throw error;
    }
  }

  private static createPostVerificationWelcomeTemplate(user: User) {
    const loginUrl = `https://narratives-crm-site.web.app/login`;
    return {
      to: [user.email],
      message: { subject: `${user.displayName || 'ユーザー'}様、メール認証が完了しました！`, html: `...`, text: `...` },
      template: {
        name: 'crm-post-verification-welcome',
        data: { userName: user.displayName || 'ユーザー', userEmail: user.email, loginUrl }
      },
    };
  }

  static async resendAuthenticationEmail(user: User): Promise<void> {
    try {
      console.log('Resending authentication email for user:', user.email);
      await AuthenticationEmailService.sendAuthenticationEmail(user, false);
      console.log('Authentication email resent successfully');
    } catch (error) {
      console.error('Error resending authentication email:', error);
      throw error;
    }
  }

  static isUserEmailVerified(user: User): boolean {
    return user.emailVerified;
  }

  static requiresEmailVerification(user: User): boolean {
    return !user.emailVerified;
  }

  static async checkEmailVerificationStatus(userId: string): Promise<boolean> {
    try {
      console.log('Checking email verification status for business user:', userId);
      return false;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  }

  static async updateMailStatus(mailId: string, status: 'sent' | 'error', sentAt?: Date): Promise<void> {
    try {
      const updateData: any = { status, updated_at: new Date() };
      if (status === 'sent' && sentAt) updateData.sent_at = sentAt;
      await updateDoc(doc(db, 'mails', mailId), updateData);
      console.log('Mail status updated:', mailId, status);
    } catch (error) {
      console.error('Error updating mail status:', error);
    }
  }

  static async getMailHistory(userId: string): Promise<MailModel[]> {
    try {
      console.log('Getting mail history for business user:', userId);
      return [];
    } catch (error) {
      console.error('Error getting mail history:', error);
      return [];
    }
  }

  static async sendAuthenticationEmailDirect(emailData: {
    to: string;
    type: 'verification' | 'password_reset';
    verificationUrl?: string;
    resetUrl?: string;
    credentials?: { email: string; password: string };
  }): Promise<{ success: boolean; mailId?: string; error?: string }> {
    try {
      console.log('Sending authentication email directly to auth_mails collection:', emailData);
      const mailRef = await addDoc(collection(db, 'auth_mails'), {
        ...emailData,
        timestamp: new Date(),
        status: 'pending',
      });
      console.log('Authentication email queued with ID:', mailRef.id);
      return { success: true, mailId: mailRef.id };
    } catch (error) {
      console.error('Error queuing authentication email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const EmailService = AuthenticationEmailService;
export default AuthenticationEmailService;

