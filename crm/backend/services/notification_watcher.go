package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// NotificationWatcher Firestore通知監視サービス
type NotificationWatcher struct {
	client              *firestore.Client
	emailService        *EmailService
	firebaseAuthService *FirebaseAuthService
}

// NotificationData Firestore通知データ
type NotificationData struct {
	NotificationID   string     `firestore:"notification_id"`
	BusinessUserID   string     `firestore:"user_id"` // フィールド名は変更せず、構造体のフィールド名のみ変更
	NotificationType string     `firestore:"notification_type"`
	Title            string     `firestore:"title"`
	Body             string     `firestore:"body"`
	CreatedAt        time.Time  `firestore:"created_at"`
	IsRead           bool       `firestore:"is_read"`
	ReadAt           *time.Time `firestore:"read_at"`
	Processed        bool       `firestore:"processed"`
}

// BusinessUserData Firestore ビジネスユーザーデータ
type BusinessUserData struct {
	BusinessUserID    string    `firestore:"business_user_id"`
	FirstName         string    `firestore:"first_name"`
	LastName          string    `firestore:"last_name"`
	EmailAddress      string    `firestore:"email_address"`
	Role              string    `firestore:"role"`
	TemporaryPassword *string   `firestore:"temporary_password"`
	CreatedAt         time.Time `firestore:"created_at"`
}

// NewNotificationWatcher 通知監視サービスのコンストラクタ
func NewNotificationWatcher(client *firestore.Client, emailService *EmailService, firebaseAuthService *FirebaseAuthService) *NotificationWatcher {
	return &NotificationWatcher{
		client:              client,
		emailService:        emailService,
		firebaseAuthService: firebaseAuthService,
	}
}

// StartWatching 通知監視を開始
func (nw *NotificationWatcher) StartWatching(ctx context.Context) {
	log.Println("通知監視を開始しました...")

	ticker := time.NewTicker(30 * time.Second) // 30秒間隔で確認
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("通知監視を停止しました")
			return
		case <-ticker.C:
			if err := nw.processUnprocessedNotifications(ctx); err != nil {
				log.Printf("通知処理エラー: %v", err)
			}
		}
	}
}

// processUnprocessedNotifications 未処理の通知を処理
func (nw *NotificationWatcher) processUnprocessedNotifications(ctx context.Context) error {
	// まず全ての通知を取得（単純クエリでインデックス不要）
	query := nw.client.Collection("notifications").
		Limit(50) // より多くの件数を取得して、アプリケーション側でフィルタリング

	iter := query.Documents(ctx)
	defer iter.Stop()

	processedCount := 0
	welcomeEmailCount := 0
	unprocessedCount := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("通知データ取得エラー: %v", err)
		}

		var notification NotificationData
		if err := doc.DataTo(&notification); err != nil {
			log.Printf("通知データ変換エラー: %v", err)
			continue
		}

		processedCount++

		// welcome_emailタイプでない場合はスキップ
		if notification.NotificationType != "welcome_email" {
			continue
		}

		welcomeEmailCount++

		// 既に処理済みの場合はスキップ
		if notification.Processed {
			continue
		}

		unprocessedCount++
		log.Printf("未処理のwelcome_email通知を発見: ID=%s, UserID=%s", doc.Ref.ID, notification.BusinessUserID)

		// 招待メールを送信
		if err := nw.processWelcomeEmailNotification(ctx, doc.Ref.ID, &notification); err != nil {
			log.Printf("招待メール送信エラー (通知ID: %s): %v", notification.NotificationID, err)
			continue
		}

		log.Printf("招待メール送信完了: %s", notification.NotificationID)
	}

	// 処理結果をログ出力（30秒ごとに1回なので詳細ログも問題なし）
	if processedCount > 0 {
		log.Printf("通知処理完了: 総件数=%d, welcome_email=%d, 未処理=%d", processedCount, welcomeEmailCount, unprocessedCount)
	}

	return nil
}

// processWelcomeEmailNotification 招待メール通知を処理
func (nw *NotificationWatcher) processWelcomeEmailNotification(ctx context.Context, docID string, notification *NotificationData) error {
	// ビジネスユーザー情報を取得
	userDoc, err := nw.client.Collection("business_users").Doc(notification.BusinessUserID).Get(ctx)
	if err != nil {
		return fmt.Errorf("ビジネスユーザー情報取得エラー: %v", err)
	}

	var businessUserData BusinessUserData
	if err := userDoc.DataTo(&businessUserData); err != nil {
		return fmt.Errorf("ビジネスユーザーデータ変換エラー: %v", err)
	}

	// 一時パスワードがない場合はスキップ
	if businessUserData.TemporaryPassword == nil {
		log.Printf("一時パスワードが設定されていません (ビジネスユーザーID: %s)", notification.BusinessUserID)
		return nw.markNotificationAsProcessed(ctx, docID)
	}

	// Firestore Send Email拡張機能を使用してメールを送信
	displayName := fmt.Sprintf("%s %s", businessUserData.LastName, businessUserData.FirstName)
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://narratives-crm-site.web.app"
	}

	// メールドキュメントを作成
	mailData := map[string]interface{}{
		"to":      []string{businessUserData.EmailAddress},
		"from":    "caotailangaogang@gmail.com",
		"subject": "【Narratives CRM】アカウント作成完了のお知らせ",
		"html": fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #2563eb;">Narratives CRMへようこそ</h2>
				
				<p>%s様</p>
				
				<p>Narratives CRMのアカウントが正常に作成されました。以下の情報でログインしてください。</p>
				
				<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
					<h3 style="margin-top: 0; color: #374151;">ログイン情報</h3>
					<p><strong>メールアドレス:</strong> %s</p>
					<p><strong>一時パスワード:</strong> <code style="background-color: #e5e7eb; padding: 2px 4px; border-radius: 4px;">%s</code></p>
				</div>
				
				<p style="margin: 30px 0;">
					<a href="%s" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">ログインページへ</a>
				</p>
				
				<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
					<p><strong>重要なお知らせ:</strong></p>
					<ul>
						<li>初回ログイン後、必ずパスワードを変更してください</li>
						<li>このメールに記載されている一時パスワードは第三者に共有しないでください</li>
						<li>ご不明な点がございましたら、システム管理者までお問い合わせください</li>
					</ul>
				</div>
				
				<p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
					このメールは自動送信されています。返信の必要はありません。
				</p>
			</div>
		`, displayName, businessUserData.EmailAddress, *businessUserData.TemporaryPassword, frontendURL),
		"delivery": map[string]interface{}{
			"startTime": time.Now(),
			"endTime":   time.Now().Add(24 * time.Hour),
		},
	}

	// mailsコレクションにドキュメントを追加（Firestore拡張機能が自動処理）
	_, _, err = nw.client.Collection("mails").Add(ctx, mailData)
	if err != nil {
		return fmt.Errorf("メールドキュメント作成エラー: %v", err)
	}

	log.Printf("メールドキュメント作成完了 (ビジネスユーザー: %s)", displayName)

	// 通知を処理済みにマーク
	return nw.markNotificationAsProcessed(ctx, docID)
}

// markNotificationAsProcessed 通知を処理済みにマーク
func (nw *NotificationWatcher) markNotificationAsProcessed(ctx context.Context, docID string) error {
	_, err := nw.client.Collection("notifications").Doc(docID).Update(ctx, []firestore.Update{
		{
			Path:  "processed",
			Value: true,
		},
		{
			Path:  "processed_at",
			Value: time.Now(),
		},
	})

	return err
}

// ProcessSingleNotification 単一の通知を即座に処理（テスト用）
func (nw *NotificationWatcher) ProcessSingleNotification(ctx context.Context, notificationID string) error {
	// 通知IDで検索
	query := nw.client.Collection("notifications").
		Where("notification_id", "==", notificationID).
		Limit(1)

	iter := query.Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return fmt.Errorf("通知が見つかりません: %s", notificationID)
	}
	if err != nil {
		return fmt.Errorf("通知検索エラー: %v", err)
	}

	var notification NotificationData
	if err := doc.DataTo(&notification); err != nil {
		return fmt.Errorf("通知データ変換エラー: %v", err)
	}

	// welcome_email通知のみ処理
	if notification.NotificationType != "welcome_email" {
		return fmt.Errorf("処理対象外の通知タイプです: %s", notification.NotificationType)
	}

	return nw.processWelcomeEmailNotification(ctx, doc.Ref.ID, &notification)
}

// ProcessAllUnprocessedNotifications すべての未処理通知を処理（パブリックメソッド）
func (nw *NotificationWatcher) ProcessAllUnprocessedNotifications(ctx context.Context) (int, error) {
	log.Println("手動でのすべての未処理通知の処理を開始...")

	// 全ての通知を取得（単純クエリでインデックス不要）
	query := nw.client.Collection("notifications").
		Limit(100) // より多くの通知を処理

	iter := query.Documents(ctx)
	defer iter.Stop()

	processedCount := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("通知取得エラー: %v", err)
			continue
		}

		var notification NotificationData
		if err := doc.DataTo(&notification); err != nil {
			log.Printf("通知データ変換エラー: %v", err)
			continue
		}

		// welcome_emailタイプでない場合はスキップ
		if notification.NotificationType != "welcome_email" {
			continue
		}

		// 既に処理済みの場合はスキップ
		if notification.Processed {
			log.Printf("通知 %s は既に処理済みです", notification.NotificationID)
			continue
		}

		log.Printf("通知を処理中: %s (タイプ: %s)", notification.NotificationID, notification.NotificationType)

		// 通知を処理
		if err := nw.processWelcomeEmailNotification(ctx, doc.Ref.ID, &notification); err != nil {
			log.Printf("通知処理エラー: %v", err)
			continue
		}

		processedCount++
		log.Printf("通知 %s を正常に処理しました", notification.NotificationID)
	}

	log.Printf("手動処理完了: %d件の通知を処理しました", processedCount)
	return processedCount, nil
}
