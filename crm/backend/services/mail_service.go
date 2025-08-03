package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/firestore"
)

// MailService メール関連のサービス
type MailService struct {
	client *firestore.Client
}

// NewMailService メールサービスのコンストラクタ
func NewMailService(client *firestore.Client) *MailService {
	return &MailService{
		client: client,
	}
}

// MailData メールデータ構造
type MailData struct {
	MailID      string     `firestore:"mail_id"`
	UserID      string     `firestore:"user_id"`
	RecipientID string     `firestore:"recipient_id"`
	Subject     string     `firestore:"subject"`
	Body        string     `firestore:"body"`
	Status      string     `firestore:"status"`
	Attachments []string   `firestore:"attachments"`
	CreatedAt   time.Time  `firestore:"created_at"`
	SentAt      *time.Time `firestore:"sent_at"`
}

// SaveMailHistory メール送信履歴をFirestoreに保存
func (ms *MailService) SaveMailHistory(ctx context.Context, mail MailData) error {
	// メールIDがない場合は自動生成
	if mail.MailID == "" {
		ref := ms.client.Collection("mails").NewDoc()
		mail.MailID = ref.ID
	}

	// 現在時刻を設定
	now := time.Now()

	// 作成日時が設定されていない場合は現在時刻を設定
	if mail.CreatedAt.IsZero() {
		mail.CreatedAt = now
	}

	// 送信済みステータスの場合、送信日時を設定
	if mail.Status == "sent" && mail.SentAt == nil {
		mail.SentAt = &now
	}

	// Firestoreに保存
	_, err := ms.client.Collection("mails").Doc(mail.MailID).Set(ctx, mail)
	if err != nil {
		log.Printf("メール履歴の保存に失敗しました: %v", err)
		return fmt.Errorf("メール履歴の保存に失敗しました: %v", err)
	}

	log.Printf("メール履歴を保存しました: %s", mail.MailID)
	return nil
}

// GetMailHistory メール履歴を取得
func (ms *MailService) GetMailHistory(ctx context.Context, userID string, limit int) ([]MailData, error) {
	var mails []MailData

	// ユーザーIDで絞り込み、作成日時の降順で取得
	iter := ms.client.Collection("mails").
		Where("user_id", "==", userID).
		OrderBy("created_at", firestore.Desc).
		Limit(limit).
		Documents(ctx)

	// 結果を処理
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}

		var mail MailData
		if err := doc.DataTo(&mail); err != nil {
			log.Printf("メールデータの変換に失敗: %v", err)
			continue
		}

		mails = append(mails, mail)
	}

	return mails, nil
}
