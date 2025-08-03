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

	"gopkg.in/gomail.v2"
)

// EmailService メール送信サービス
type EmailService struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
	FromName     string
	MailService  *MailService
}

// NewEmailService メールサービスのコンストラクタ
func NewEmailService(mailService *MailService) *EmailService {
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))

	return &EmailService{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     port,
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
		FromName:     os.Getenv("FROM_NAME"),
		MailService:  mailService,
	}
}

// WelcomeEmailData 招待メールのデータ構造
type WelcomeEmailData struct {
	RecipientEmail    string
	RecipientName     string
	TemporaryPassword string
	Role              string
	LoginURL          string
}

// SendWelcomeEmail 招待メールを送信
func (es *EmailService) SendWelcomeEmail(ctx context.Context, data WelcomeEmailData, senderUserID string) error {
	// メールの件名
	subject := fmt.Sprintf("%s様、Narrativesへようこそ！", data.RecipientName)

	// メール本文を作成
	body := es.createWelcomeEmailBody(data)

	// メール送信
	err := es.sendEmail(data.RecipientEmail, subject, body)
	if err != nil {
		return err
	}

	// senderUserIDが空でない場合のみメール履歴を保存（Notificationsには送信履歴を保存しない）
	if es.MailService != nil && senderUserID != "" {
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
		if err := es.MailService.SaveMailHistory(ctx, mailData); err != nil {
			log.Printf("メール履歴の保存に失敗しましたが、メール自体は送信されています: %v", err)
		}
	}

	return nil
}

// createWelcomeEmailBody 招待メールの本文を作成
func (es *EmailService) createWelcomeEmailBody(data WelcomeEmailData) string {
	// 役割を日本語に変換
	roleJP := es.getRoleDisplayName(data.Role)

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
func (es *EmailService) getRoleDisplayName(role string) string {
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

// sendEmail 実際のメール送信処理
func (es *EmailService) sendEmail(to, subject, body string) error {
	// メール設定が不完全な場合はログ出力のみ
	if es.SMTPUser == "your-email@gmail.com" || es.SMTPPassword == "your-gmail-app-password-here" {
		log.Printf("[メール送信スキップ] To: %s, Subject: %s", to, subject)
		log.Printf("[メール内容]\n%s", body)
		return nil
	}

	// メール作成
	m := gomail.NewMessage()
	m.SetHeader("From", fmt.Sprintf("%s <%s>", es.FromName, es.FromEmail))
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	// SMTP設定
	d := gomail.NewDialer(es.SMTPHost, es.SMTPPort, es.SMTPUser, es.SMTPPassword)

	// TLS設定
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	// メール送信
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("メール送信に失敗しました: %v", err)
	}

	log.Printf("[メール送信完了] To: %s", to)
	return nil
}

// TestEmailConnection メール接続をテスト
func (es *EmailService) TestEmailConnection() error {
	// メール設定が不完全な場合はテストスキップ
	if es.SMTPUser == "your-email@gmail.com" || es.SMTPPassword == "your-gmail-app-password-here" {
		log.Println("[メール設定未完了] 実際のメール送信はスキップされます")
		return nil
	}

	d := gomail.NewDialer(es.SMTPHost, es.SMTPPort, es.SMTPUser, es.SMTPPassword)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	closer, err := d.Dial()
	if err != nil {
		return fmt.Errorf("SMTP接続に失敗しました: %v", err)
	}
	defer closer.Close()

	log.Println("[メール接続成功] SMTP設定は正常です")
	return nil
}
