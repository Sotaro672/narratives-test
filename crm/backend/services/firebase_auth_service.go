package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"firebase.google.com/go/v4/auth"
)

// FirebaseAuthService Firebase認証サービス
type FirebaseAuthService struct {
	client *auth.Client
}

// NewFirebaseAuthService Firebase認証サービスのコンストラクタ
func NewFirebaseAuthService(client *auth.Client) *FirebaseAuthService {
	return &FirebaseAuthService{
		client: client,
	}
}

// GenerateEmailVerificationLink メール認証リンクを生成
func (fas *FirebaseAuthService) GenerateEmailVerificationLink(ctx context.Context, email string) (string, error) {
	// ユーザー情報を取得
	user, err := fas.client.GetUserByEmail(ctx, email)
	if err != nil {
		log.Printf("ユーザー情報の取得に失敗: %v", err)
		return "", fmt.Errorf("ユーザー情報の取得に失敗: %v", err)
	}

	// カスタムクレームを設定（オプション）
	claims := map[string]interface{}{
		"email_verification": true,
		"timestamp":          time.Now().Unix(),
	}

	if err := fas.client.SetCustomUserClaims(ctx, user.UID, claims); err != nil {
		log.Printf("カスタムクレームの設定に失敗: %v", err)
		// エラーは無視してメイン処理を続行
	}

	// アクションコード設定を使用してリンクを生成
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://narratives-crm-site.web.app"
	}

	settings := &auth.ActionCodeSettings{
		URL:             frontendURL + "/auth/verify",
		HandleCodeInApp: false,
	}

	// アクションコード設定付きでFirebase認証リンクを生成
	link, err := fas.client.EmailVerificationLinkWithSettings(ctx, email, settings)
	if err != nil {
		log.Printf("Firebase認証リンクの生成に失敗: %v", err)
		return "", fmt.Errorf("firebase認証リンクの生成に失敗: %v", err)
	}

	log.Printf("Firebase認証リンクを生成しました: %s", email)
	return link, nil
}

// DeleteUserByEmail メールアドレスでビジネスユーザーをFirebase Authenticationから削除
func (fas *FirebaseAuthService) DeleteUserByEmail(ctx context.Context, email string) error {
	log.Printf("DeleteUserByEmail: Firebase Authenticationからビジネスユーザーを削除します (email: %s)", email)

	if fas.client == nil {
		log.Printf("DeleteUserByEmail: Firebase認証クライアントが初期化されていません")
		return fmt.Errorf("firebase認証クライアントが初期化されていません")
	}

	// メールアドレスからユーザーIDを取得
	user, err := fas.client.GetUserByEmail(ctx, email)
	if err != nil {
		// ユーザーが見つからない場合は、既に削除されたと見なして成功を返す
		if auth.IsUserNotFound(err) {
			log.Printf("DeleteUserByEmail: ビジネスユーザーが見つかりません (email: %s). 既に削除済みとみなします。", email)
			return nil
		}
		log.Printf("DeleteUserByEmail: ビジネスユーザー情報の取得に失敗: %v", err)
		return fmt.Errorf("ユーザー情報の取得に失敗: %v", err)
	}

	log.Printf("DeleteUserByEmail: ビジネスユーザーID %s を削除します", user.UID)

	// ユーザーを削除
	if err := fas.client.DeleteUser(ctx, user.UID); err != nil {
		log.Printf("DeleteUserByEmail: ビジネスユーザー削除に失敗: %v", err)
		return fmt.Errorf("ユーザー削除に失敗: %v", err)
	}

	log.Printf("DeleteUserByEmail: Firebase AuthenticationからビジネスユーザーID %s (email: %s) を削除しました", user.UID, email)
	return nil
} // SendCustomVerificationEmail カスタム認証メールを送信
func (fas *FirebaseAuthService) SendCustomVerificationEmail(ctx context.Context, email, displayName, temporaryPassword string, emailService *EmailService) error {
	// まずユーザーが存在するか確認
	_, err := fas.client.GetUserByEmail(ctx, email)
	if err != nil {
		if auth.IsUserNotFound(err) {
			// 存在しなければユーザー作成
			params := (&auth.UserToCreate{}).
				Email(email).
				EmailVerified(false).
				Password(temporaryPassword).
				DisplayName(displayName).
				Disabled(false)
			_, createErr := fas.client.CreateUser(ctx, params)
			if createErr != nil {
				return fmt.Errorf("ユーザー作成に失敗しました: %v", createErr)
			}
		} else {
			// その他のエラーは即return
			return fmt.Errorf("ユーザー情報取得に失敗しました: %v", err)
		}
	}

	// Firebase公式認証リンクを生成
	verificationLink, err := fas.GenerateEmailVerificationLink(ctx, email)
	if err != nil {
		return fmt.Errorf("認証リンクの生成に失敗しました: %v", err)
	}

	// カスタムメール本文を作成
	subject := fmt.Sprintf("%s様、Narrativesへようこそ！メール認証のお願い", displayName)
	body := fas.createCustomVerificationEmailBody(displayName, email, temporaryPassword, verificationLink)

	// メール送信
	if err := emailService.sendEmail(email, subject, body); err != nil {
		return err
	}

	// メール履歴の保存（ユーザー自身がsenderUserIDとなる）
	if emailService.MailService != nil {
		// メール履歴データ作成
		now := time.Now()
		mailData := MailData{
			UserID:      email, // ユーザーのメールアドレスをIDとして使用
			RecipientID: email,
			Subject:     subject,
			Body:        body,
			Status:      "sent",
			CreatedAt:   now,
			SentAt:      &now,
		}

		// Firestoreに保存
		ctx := context.Background() // コンテキストが必要
		if err := emailService.MailService.SaveMailHistory(ctx, mailData); err != nil {
			log.Printf("メール履歴の保存に失敗しましたが、メール自体は送信されています: %v", err)
		}
	}

	return nil
} // createCustomVerificationEmailBody カスタム認証メールの本文を作成
func (fas *FirebaseAuthService) createCustomVerificationEmailBody(displayName, email, temporaryPassword, verificationLink string) string {
	// 常にハードコードされたテンプレートを使用し、テンプレートファイルの読み込み失敗を避ける
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://narratives-crm-site.web.app" // デフォルト値
	}
	loginURL := frontendURL

	// デバッグログ
	log.Printf("メール認証リンクの生成: %s のための認証メールを作成します", email)

	return fmt.Sprintf(`
お疲れ様です。%s様

Narratives CRMシステムへの招待が完了しました。

【重要】まず最初にメールアドレスの認証をお願いします

下記のリンクをクリックして、メールアドレスの認証を完了してください：
%s

認証完了後、以下の情報でログインしてください：

【ログイン情報】
メールアドレス: %s
一時パスワード: %s
ログインURL: %s

【初回ログインの手順】
1. 上記の認証リンクをクリックしてメール認証を完了
2. ログインURLにアクセス
3. メールアドレスとパスワードでログイン
4. 初回ログイン後、パスワードの変更をお願いします

【重要な注意事項】
このパスワードは一時的なものです
セキュリティのため、初回ログイン後に必ずパスワードを変更してください
このメールは機密情報を含むため、適切に管理してください
メール認証を完了しないとログインできません

何かご質問がございましたら、管理者までお問い合わせください。

Narratives CRM システム
`, displayName, verificationLink, email, temporaryPassword, loginURL)
}
