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
	FirstNameKatakana string    `firestore:"first_name_katakana"`
	LastNameKatakana  string    `firestore:"last_name_katakana"`
	EmailAddress      string    `firestore:"email_address"`
	Role              string    `firestore:"role"`
	TemporaryPassword *string   `firestore:"temporary_password"`
	Balance           float64   `firestore:"balance"`
	Status            string    `firestore:"status"`
	CreatedAt         time.Time `firestore:"created_at"`
	UpdatedAt         time.Time `firestore:"updated_at"`
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

		// welcome_emailタイプでない場合はスキップ
		if notification.NotificationType != "welcome_email" {
			continue
		}

		// 既に処理済みの場合はスキップ
		if notification.Processed {
			continue
		}

		// 招待メールを送信
		if err := nw.processWelcomeEmailNotification(ctx, doc.Ref.ID, &notification); err != nil {
			log.Printf("招待メール送信エラー (通知ID: %s): %v", notification.NotificationID, err)
			continue
		}

		log.Printf("招待メール送信完了: %s", notification.NotificationID)
	}

	return nil
}

// processWelcomeEmailNotification 招待メール通知を処理
func (nw *NotificationWatcher) processWelcomeEmailNotification(ctx context.Context, docID string, notification *NotificationData) error {
	// ユーザー情報を取得（usersコレクションから）
	userDoc, err := nw.client.Collection("users").Doc(notification.BusinessUserID).Get(ctx)
	if err != nil {
		return fmt.Errorf("ユーザー情報取得エラー: %v", err)
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

	// Firebase認証付きカスタムメールを送信
	displayName := fmt.Sprintf("%s %s", businessUserData.LastName, businessUserData.FirstName)
	if err := nw.firebaseAuthService.SendCustomVerificationEmail(
		ctx,
		businessUserData.EmailAddress,
		displayName,
		*businessUserData.TemporaryPassword,
		nw.emailService,
	); err != nil {
		// Firebase認証メールが失敗した場合は、通常のウェルカムメールを送信
		log.Printf("Firebase認証メール送信失敗、通常メールを送信します: %v", err)

		emailData := WelcomeEmailData{
			RecipientEmail:    businessUserData.EmailAddress,
			RecipientName:     displayName,
			TemporaryPassword: *businessUserData.TemporaryPassword,
			Role:              businessUserData.Role,
			LoginURL:          getLoginURL(),
		}

		// ビジネスユーザーIDを通知の所有者IDに設定してメール履歴を保存
		if err := nw.emailService.SendWelcomeEmail(ctx, emailData, notification.BusinessUserID); err != nil {
			return fmt.Errorf("メール送信エラー: %v", err)
		}
	} // 通知を処理済みにマーク
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

// getLoginURL 環境に応じたログインURLを取得
func getLoginURL() string {
	// 環境変数から取得、なければデフォルト値
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		// 開発環境のデフォルト
		frontendURL = "http://localhost:5173"
	}
	return frontendURL + "/login"
}
