// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
  id: string;
}

// メールテンプレートのドキュメントID
export const MAIL_TEMPLATES = {
  VERIFICATION_EMAIL: 'verification_email'
};

export interface MailModelData {
  mailId: string;
  userId: string;
  recipientId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'error';
  attachments?: string[];
  createdAt: Date;
  sentAt?: Date | null;
}

export class MailModel {
  public readonly mailId: string;
  public readonly userId: string;
  public readonly recipientId: string;
  public readonly subject: string;
  public readonly body: string;
  public readonly status: 'draft' | 'sent' | 'error';
  public readonly attachments: string[];
  public readonly createdAt: Date;
  public readonly sentAt?: Date | null;

  constructor({
    mailId,
    userId,
    recipientId,
    subject,
    body,
    status = 'draft',
    attachments = [],
    createdAt,
    sentAt = null,
  }: {
    mailId: string;
    userId: string;
    recipientId: string;
    subject: string;
    body: string;
    status?: 'draft' | 'sent' | 'error';
    attachments?: string[];
    createdAt: Date;
    sentAt?: Date | null;
  }) {
    this.mailId = mailId;
    this.userId = userId;
    this.recipientId = recipientId;
    this.subject = subject;
    this.body = body;
    this.status = status;
    this.attachments = attachments;
    this.createdAt = createdAt;
    this.sentAt = sentAt;
  }

  // Firestoreドキュメントからインスタンスを作成
  static fromDocument(doc: FirestoreDocument): MailModel {
    const data = doc.data();
    return new MailModel({
      mailId: doc.id,
      userId: data.user_id,
      recipientId: data.recipient_id,
      subject: data.subject,
      body: data.body,
      status: data.status || 'draft',
      attachments: data.attachments || [],
      createdAt: (data.created_at as FirestoreTimestamp).toDate(),
      sentAt: data.sent_at ? (data.sent_at as FirestoreTimestamp).toDate() : null,
    });
  }

  // Firestoreに保存するためのデータを生成
  toJSON() {
    return {
      mail_id: this.mailId,
      user_id: this.userId,
      recipient_id: this.recipientId,
      subject: this.subject,
      body: this.body,
      status: this.status,
      attachments: this.attachments,
      created_at: this.createdAt,
      sent_at: this.sentAt,
    };
  }

  // メールの状態を確認するメソッド
  isDraft(): boolean {
    return this.status === 'draft';
  }

  isSent(): boolean {
    return this.status === 'sent';
  }

  hasError(): boolean {
    return this.status === 'error';
  }

  hasAttachments(): boolean {
    return this.attachments.length > 0;
  }

  // メールの作成からの経過時間を取得
  getTimeSinceCreation(): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - this.createdAt.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}時間前`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}日前`;
    }
  }

  // メール送信からの経過時間を取得
  getTimeSinceSent(): string | null {
    if (!this.sentAt) return null;
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - this.sentAt.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}時間前`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}日前`;
    }
  }

  // メールの要約を取得（本文の最初の100文字）
  getSummary(length: number = 100): string {
    if (this.body.length <= length) {
      return this.body;
    }
    return this.body.substring(0, length) + '...';
  }

  // メールの状態を日本語で取得
  getStatusDisplay(): string {
    switch (this.status) {
      case 'draft':
        return '下書き';
      case 'sent':
        return '送信済み';
      case 'error':
        return 'エラー';
      default:
        return '不明';
    }
  }

  // メールテンプレートを指定してメールを作成する静的メソッド
  static createFromTemplate(templateId: string, params: {
    userId: string;
    recipientId: string;
    subject: string;
    additionalParams?: Record<string, any>;
  }): MailModel {
    return new MailModel({
      mailId: '', // 新規作成時は空文字列（Firestoreに保存時に自動生成）
      userId: params.userId,
      recipientId: params.recipientId,
      subject: params.subject,
      body: `${templateId}テンプレートを使用して作成されたメール`, // 実際にはテンプレートエンジンで置換
      status: 'draft',
      attachments: [],
      createdAt: new Date(),
      sentAt: null
    });
  }

  // メールをコピーして新しいインスタンスを作成
  copyWith(updates: Partial<MailModelData>): MailModel {
    return new MailModel({
      mailId: updates.mailId || this.mailId,
      userId: updates.userId || this.userId,
      recipientId: updates.recipientId || this.recipientId,
      subject: updates.subject || this.subject,
      body: updates.body || this.body,
      status: updates.status || this.status,
      attachments: updates.attachments || this.attachments,
      createdAt: updates.createdAt || this.createdAt,
      sentAt: updates.sentAt ?? this.sentAt,
    });
  }
}

/* 使用例:
// 認証メールテンプレートを使用してメールを作成
const verificationMail = MailModel.createFromTemplate(
  MAIL_TEMPLATES.VERIFICATION_EMAIL, 
  {
    userId: 'admin_user_id',
    recipientId: 'new_user_id',
    subject: 'メール認証のお願い',
    additionalParams: {
      displayName: 'ユーザー名',
      verificationLink: 'https://example.com/verify?token=xxx',
      temporaryPassword: 'temp123'
    }
  }
);

// Firestoreに保存
const mailsCollection = collection(db, 'mails');
await addDoc(mailsCollection, verificationMail.toJSON());
*/
