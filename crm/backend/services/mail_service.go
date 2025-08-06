package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"gopkg.in/gomail.v2"
)

// MailService メール関連のサービス（送信と履歴管理を統合）
type MailService struct {
	client       *firestore.Client
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

// EmailService メール送信サービス（後方互換性のためのエイリアス）
type EmailService struct {
	*MailService
}

// NewMailService メールサービスのコンストラクタ
func NewMailService(client *firestore.Client) *MailService {
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))

	return &MailService{
		client:       client,
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     port,
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
		FromName:     os.Getenv("FROM_NAME"),
	}
}

// NewEmailService メールサービスのコンストラクタ（後方互換性のため）
func NewEmailService(mailService *MailService) *EmailService {
	if mailService != nil {
		return &EmailService{MailService: mailService}
	}
	// mailServiceがnilの場合は新しいインスタンスを作成
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	return &EmailService{
		MailService: &MailService{
			SMTPHost:     os.Getenv("SMTP_HOST"),
			SMTPPort:     port,
			SMTPUser:     os.Getenv("SMTP_USER"),
			SMTPPassword: os.Getenv("SMTP_PASSWORD"),
			FromEmail:    os.Getenv("FROM_EMAIL"),
			FromName:     os.Getenv("FROM_NAME"),
		},
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

// WelcomeEmailData 招待メールのデータ構造
type WelcomeEmailData struct {
	RecipientEmail    string
	RecipientName     string
	TemporaryPassword string
	Role              string
	LoginURL          string
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

// SendWelcomeEmail 招待メールを送信
func (ms *MailService) SendWelcomeEmail(ctx context.Context, data WelcomeEmailData, senderUserID string) error {
	// メールの件名
	subject := fmt.Sprintf("%s様、Narrativesへようこそ！", data.RecipientName)

	// メール本文を作成
	body := ms.createWelcomeEmailBody(data)

	// メール送信
	err := ms.SendEmail(data.RecipientEmail, subject, body)
	if err != nil {
		return err
	}

	// senderUserIDが空でない場合のみメール履歴を保存（Notificationsには送信履歴を保存しない）
	if ms.client != nil && senderUserID != "" {
		// 受信者ユーザーIDが不明の場合は、メールアドレスを代用
		recipientID := data.RecipientEmail

		// メール履歴データ作成
		now := time.Now()
		mailData := MailData{
			UserID:      senderUserID,
			RecipientID: recipientID,
			Subject:     subject,
			Body:        body,
			Status:      "sent",
			CreatedAt:   now,
			SentAt:      &now,
		}

		// Firestoreに保存
		if err := ms.SaveMailHistory(ctx, mailData); err != nil {
			log.Printf("メール履歴の保存に失敗しましたが、メール自体は送信されています: %v", err)
		}
	}

	return nil
}

// createWelcomeEmailBody 招待メールの本文を作成
func (ms *MailService) createWelcomeEmailBody(data WelcomeEmailData) string {
	// 役割を日本語に変換
	roleJP := ms.getRoleDisplayName(data.Role)

	body := fmt.Sprintf(`
お疲れ様です。%s

Narratives CRMシステムへの招待が完了しました。

【ログイン情報】
・メールアドレス: %s
・一時パスワード: %s
・ログインURL: %s

【初回ログインの手順】
1. 上記のログインURLにアクセス
2. メールアドレスとパスワードでログイン
3. 初回ログイン後、パスワードの変更をお願いします

【あなたの役割】
・%s

【重要な注意事項】
・このパスワードは一時的なものです
・セキュリティのため、初回ログイン後に必ずパスワードを変更してください
・このメールは機密情報を含むため、適切に管理してください
・他の人と共有しないでください

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
`,
		data.RecipientName,
		data.RecipientEmail,
		data.TemporaryPassword,
		data.LoginURL,
		roleJP,
	)

	return strings.TrimSpace(body)
}

// getRoleDisplayName 役割を日本語表示名に変換
func (ms *MailService) getRoleDisplayName(role string) string {
	switch role {
	case "root":
		return "ルートユーザー"
	case "admin":
		return "ブランド管理者"
	case "production_manager":
		return "生産計画責任者"
	case "token_designer":
		return "トークン設計者"
	case "customer_support_manager":
		return "カスタマーサポート責任者"
	case "user":
		return "一般ユーザー"
	default:
		return "ユーザー"
	}
}

// SendEmail 実際のメール送信処理
func (ms *MailService) SendEmail(to, subject, body string) error {
	// メール設定が不完全な場合はログ出力のみ
	if ms.SMTPUser == "your-email@gmail.com" || ms.SMTPPassword == "your-gmail-app-password-here" {
		log.Printf("[メール送信スキップ] To: %s, Subject: %s", to, subject)
		log.Printf("[メール内容]\n%s", body)
		return nil
	}

	// メール作成
	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", ms.FromName, ms.FromEmail))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	// SMTP設定
	d := gomail.NewDialer(ms.SMTPHost, ms.SMTPPort, ms.SMTPUser, ms.SMTPPassword)

	// ポート465の場合はSSL、587の場合はSTARTTLS
	if ms.SMTPPort == 465 {
		// ポート465はSSL/TLS専用
		d.SSL = true
		d.TLSConfig = &tls.Config{
			ServerName:         ms.SMTPHost,
			InsecureSkipVerify: false,
		}
	} else {
		// ポート587はSTARTTLS
		d.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	}

	// メール送信
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("メール送信に失敗しました: %v", err)
	}

	log.Printf("[メール送信完了] To: %s", to)
	return nil
}

// TestEmailConnection メール接続をテスト
func (ms *MailService) TestEmailConnection() error {
	// メール設定が不完全な場合はテストスキップ
	if ms.SMTPUser == "your-email@gmail.com" || ms.SMTPPassword == "your-gmail-app-password-here" {
		log.Println("[メール設定未完了] 実際のメール送信はスキップされます")
		return nil
	}

	d := gomail.NewDialer(ms.SMTPHost, ms.SMTPPort, ms.SMTPUser, ms.SMTPPassword)

	// ポート465の場合はSSL、587の場合はSTARTTLS
	if ms.SMTPPort == 465 {
		// ポート465はSSL/TLS専用
		d.SSL = true
		d.TLSConfig = &tls.Config{
			ServerName:         ms.SMTPHost,
			InsecureSkipVerify: false,
		}
	} else {
		// ポート587はSTARTTLS
		d.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	}

	closer, err := d.Dial()
	if err != nil {
		return fmt.Errorf("SMTP接続に失敗しました: %v", err)
	}
	defer closer.Close()

	log.Println("[メール接続成功] SMTP設定は正常です")
	return nil
}
