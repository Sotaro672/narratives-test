package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// NotificationWatcher Firestore通知・メール監視サービス（監視のみ、送信は行わない）
type NotificationWatcher struct {
	client          *firestore.Client
	firebaseAuthSvc *FirebaseAuthService
}

// NotificationData Firestore通知データ
type NotificationData struct {
	NotificationID   string     `firestore:"notification_id"`
	BusinessUserID   string     `firestore:"business_user_id"` // business_user_idで統一
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

// NewNotificationWatcher 通知・メール監視サービスのコンストラクタ
func NewNotificationWatcher(client *firestore.Client, firebaseAuthSvc *FirebaseAuthService) *NotificationWatcher {
	return &NotificationWatcher{
		client:          client,
		firebaseAuthSvc: firebaseAuthSvc,
	}
}

// StartWatching 通知・メール監視を開始（確認のみ、処理は行わない）
func (nw *NotificationWatcher) StartWatching(ctx context.Context) {
	log.Println("通知・メール監視を開始しました（確認のみ）...")

	ticker := time.NewTicker(30 * time.Second) // 30秒間隔で確認
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("通知・メール監視を停止しました")
			return
		case <-ticker.C:
			if err := nw.checkUnprocessedItems(ctx); err != nil {
				log.Printf("監視エラー: %v", err)
			}
		}
	}
}

// checkUnprocessedItems 未処理の通知とメールを確認（監視のみ）
func (nw *NotificationWatcher) checkUnprocessedItems(ctx context.Context) error {
	// 未処理通知を確認
	if err := nw.checkUnprocessedNotifications(ctx); err != nil {
		log.Printf("未処理通知確認エラー: %v", err)
	}

	// mailsコレクションの状況を確認
	if err := nw.checkMailsStatus(ctx); err != nil {
		log.Printf("メール状況確認エラー: %v", err)
	}

	// ユーザーのメール認証状態をチェック
	if err := nw.checkEmailVerificationForUsers(ctx); err != nil {
		log.Printf("メール認証状態確認エラー: %v", err)
	}

	return nil
}

// checkUnprocessedNotifications 未処理の通知を確認（処理は行わない）
func (nw *NotificationWatcher) checkUnprocessedNotifications(ctx context.Context) error {
	// 未処理通知を取得
	query := nw.client.Collection("notifications").
		Where("processed", "==", false).
		Limit(10)

	iter := query.Documents(ctx)
	defer iter.Stop()

	unprocessedCount := 0
	welcomeEmailCount := 0
	temporaryPasswordCount := 0

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

		unprocessedCount++

		switch notification.NotificationType {
		case "welcome_email":
			welcomeEmailCount++
			log.Printf("未処理welcome_email通知: ID=%s, UserID=%s", doc.Ref.ID, notification.BusinessUserID)
		case "temporary_password":
			temporaryPasswordCount++
			log.Printf("未処理temporary_password通知: ID=%s, UserID=%s", doc.Ref.ID, notification.BusinessUserID)
		default:
			log.Printf("未対応通知タイプ: %s (ID=%s)", notification.NotificationType, doc.Ref.ID)
		}
	}

	if unprocessedCount > 0 {
		log.Printf("未処理通知確認完了: 総件数=%d, welcome_email=%d, temporary_password=%d",
			unprocessedCount, welcomeEmailCount, temporaryPasswordCount)
	}

	return nil
}

// checkMailsStatus mailsコレクションの状況を確認
func (nw *NotificationWatcher) checkMailsStatus(ctx context.Context) error {
	// 最近24時間のメールを確認
	yesterday := time.Now().Add(-24 * time.Hour)

	query := nw.client.Collection("mails").
		Where("delivery.startTime", ">=", yesterday).
		Limit(50)

	iter := query.Documents(ctx)
	defer iter.Stop()

	totalMails := 0
	sentMails := 0
	pendingMails := 0
	errorMails := 0

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("メールデータ取得エラー: %v", err)
		}

		totalMails++

		// メールの状態を確認
		data := doc.Data()
		if delivery, ok := data["delivery"].(map[string]interface{}); ok {
			if state, exists := delivery["state"]; exists {
				switch state {
				case "SUCCESS":
					sentMails++
				case "PENDING", "PROCESSING":
					pendingMails++
				case "ERROR":
					errorMails++
					log.Printf("メール送信エラー: DocumentID=%s, Error=%v", doc.Ref.ID, delivery["error"])
				}
			}
		}
	}

	if totalMails > 0 {
		log.Printf("メール状況確認（24時間）: 総件数=%d, 送信完了=%d, 処理中=%d, エラー=%d",
			totalMails, sentMails, pendingMails, errorMails)
	}

	return nil
}

// checkEmailVerificationForUsers ユーザーのメール認証状態をチェック
func (nw *NotificationWatcher) checkEmailVerificationForUsers(ctx context.Context) error {
	// 最近作成されたbusiness_usersでメール認証をチェック
	query := nw.client.Collection("business_users").
		Where("created_at", ">=", time.Now().Add(-24*time.Hour)).
		Limit(20)

	iter := query.Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("ビジネスユーザー取得エラー: %v", err)
		}

		userID := doc.Ref.ID

		// メール認証状態をチェック（Firebase Functionsを通じて）
		if err := nw.firebaseAuthSvc.CheckEmailVerificationStatus(ctx, userID); err != nil {
			log.Printf("ユーザー %s のメール認証チェックエラー: %v", userID, err)
		}
	}

	return nil
}
