// Firebase Firestore types
interface FirestoreTimestamp {
  toDate(): Date;
}

interface FirestoreDocument {
  data(): { [key: string]: any };
}

export interface NotificationModelData {
  notificationId: string;
  userId: string;
  inquiryId?: string; // 盗難関連通知の場合のみ
  notificationType: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date | null;
}

export class NotificationModel {
  public readonly notificationId: string;
  public readonly userId: string;
  public readonly inquiryId?: string;
  public readonly notificationType: string;
  public readonly title: string;
  public readonly body: string;
  public readonly isRead: boolean;
  public readonly createdAt: Date;
  public readonly readAt?: Date | null;

  constructor({
    notificationId,
    userId,
    inquiryId,
    notificationType,
    title,
    body,
    isRead = false,
    createdAt,
    readAt = null,
  }: {
    notificationId: string;
    userId: string;
    inquiryId?: string;
    notificationType: string;
    title: string;
    body: string;
    isRead?: boolean;
    createdAt: Date;
    readAt?: Date | null;
  }) {
    this.notificationId = notificationId;
    this.userId = userId;
    this.inquiryId = inquiryId;
    this.notificationType = notificationType;
    this.title = title;
    this.body = body;
    this.isRead = isRead;
    this.createdAt = createdAt;
    this.readAt = readAt;
  }

  /**
   * 新しい通知を作成
   */
  static newNotification({
    userId,
    inquiryId,
    notificationType,
    title,
    body,
  }: {
    userId: string;
    inquiryId?: string;
    notificationType: string;
    title: string;
    body: string;
  }): NotificationModel {
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new NotificationModel({
      notificationId,
      userId,
      inquiryId,
      notificationType,
      title,
      body,
      isRead: false,
      createdAt: new Date(),
      readAt: null,
    });
  }

  /**
   * Firestore からデータを取得して NotificationModel に変換
   */
  static fromDocument(doc: FirestoreDocument): NotificationModel {
    const data = doc.data();
    
    return new NotificationModel({
      notificationId: data['notification_id'] || '',
      userId: data['user_id'] || '',
      inquiryId: data['inquiry_id'] || undefined,
      notificationType: data['notification_type'] || '',
      title: data['title'] || '',
      body: data['body'] || '',
      isRead: data['is_read'] || false,
      createdAt: data['created_at'] ? (data['created_at'] as FirestoreTimestamp).toDate() : new Date(),
      readAt: data['read_at'] ? (data['read_at'] as FirestoreTimestamp).toDate() : null,
    });
  }

  /**
   * プレーンオブジェクトから NotificationModel に変換
   */
  static fromPlainObject(data: NotificationModelData): NotificationModel {
    return new NotificationModel({
      notificationId: data.notificationId || '',
      userId: data.userId || '',
      inquiryId: data.inquiryId,
      notificationType: data.notificationType || '',
      title: data.title || '',
      body: data.body || '',
      isRead: data.isRead ?? false,
      createdAt: data.createdAt || new Date(),
      readAt: data.readAt || null,
    });
  }

  /**
   * Firestore に保存する形式に変換
   */
  toMap(): { [key: string]: any } {
    const result: { [key: string]: any } = {
      notification_id: this.notificationId,
      user_id: this.userId,
      notification_type: this.notificationType,
      title: this.title,
      body: this.body,
      is_read: this.isRead,
      created_at: this.createdAt,
      read_at: this.readAt,
    };

    // inquiryIdが存在する場合のみ追加
    if (this.inquiryId) {
      result.inquiry_id = this.inquiryId;
    }

    return result;
  }

  /**
   * JSON形式に変換
   */
  toJSON(): NotificationModelData {
    return {
      notificationId: this.notificationId,
      userId: this.userId,
      inquiryId: this.inquiryId,
      notificationType: this.notificationType,
      title: this.title,
      body: this.body,
      isRead: this.isRead,
      createdAt: this.createdAt,
      readAt: this.readAt,
    };
  }

  /**
   * 通知を既読にマークしたコピーを作成
   */
  markAsRead(): NotificationModel {
    return new NotificationModel({
      notificationId: this.notificationId,
      userId: this.userId,
      inquiryId: this.inquiryId,
      notificationType: this.notificationType,
      title: this.title,
      body: this.body,
      isRead: true,
      createdAt: this.createdAt,
      readAt: new Date(),
    });
  }

  /**
   * 通知種別の表示名を取得
   */
  getNotificationTypeDisplayName(): string {
    switch (this.notificationType) {
      case 'inquiry_received':
        return '問い合わせ受信';
      case 'token_flagged':
        return 'トークン警告';
      case 'ownership_challenge':
        return '所有権チャレンジ';
      case 'member_added':
        return 'メンバー追加';
      case 'role_changed':
        return '役割変更';
      case 'company_created':
        return '会社設立';
      case 'wallet_created':
        return 'ウォレット作成';
      case 'system_notification':
        return 'システム通知';
      case 'temporary_password':
        return '仮パスワード更新';
      default:
        return '通知';
    }
  }

  /**
   * 通知の優先度を取得（数値が高いほど優先度が高い）
   */
  getPriority(): number {
    switch (this.notificationType) {
      case 'token_flagged':
      case 'ownership_challenge':
        return 3; // 高優先度
      case 'inquiry_received':
      case 'temporary_password':
        return 2; // 中優先度
      case 'member_added':
      case 'role_changed':
      case 'company_created':
      case 'wallet_created':
        return 1; // 低優先度
      default:
        return 0; // 最低優先度
    }
  }

  /**
   * 通知のアイコンを取得
   */
  getIcon(): string {
    switch (this.notificationType) {
      case 'inquiry_received':
        return '📩';
      case 'token_flagged':
        return '🚨';
      case 'ownership_challenge':
        return '⚔️';
      case 'member_added':
        return '👥';
      case 'role_changed':
        return '🎭';
      case 'company_created':
        return '🏢';
      case 'wallet_created':
        return '💳';
      case 'system_notification':
        return '⚙️';
      case 'temporary_password':
        return '🔑';
      default:
        return '📢';
    }
  }

  /**
   * 通知が緊急かどうか判定
   */
  isUrgent(): boolean {
    return this.getPriority() >= 3;
  }

  /**
   * 通知の経過時間を取得
   */
  getTimeAgo(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'たった今';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return this.createdAt.toLocaleDateString('ja-JP');
    }
  }

  /**
   * 通知の詳細情報を取得
   */
  getDetailedInfo(): {
    icon: string;
    typeDisplayName: string;
    priority: number;
    timeAgo: string;
    isUrgent: boolean;
  } {
    try {
      return {
        icon: this.getIcon(),
        typeDisplayName: this.getNotificationTypeDisplayName(),
        priority: this.getPriority(),
        timeAgo: this.getTimeAgo(),
        isUrgent: this.isUrgent(),
      };
    } catch (error) {
      console.error('Error getting detailed info:', error);
      // エラー時のフォールバック値を返す
      return {
        icon: '📢',
        typeDisplayName: '通知',
        priority: 0,
        timeAgo: '不明',
        isUrgent: false,
      };
    }
  }

  /**
   * 通知内容を更新したコピーを作成
   */
  copyWith({
    notificationId,
    userId,
    inquiryId,
    notificationType,
    title,
    body,
    isRead,
    createdAt,
    readAt,
  }: Partial<NotificationModelData>): NotificationModel {
    return new NotificationModel({
      notificationId: notificationId ?? this.notificationId,
      userId: userId ?? this.userId,
      inquiryId: inquiryId ?? this.inquiryId,
      notificationType: notificationType ?? this.notificationType,
      title: title ?? this.title,
      body: body ?? this.body,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
    });
  }
}

export default NotificationModel;
