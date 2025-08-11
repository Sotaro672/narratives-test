package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
)

// FirebaseAuthService Firebase認証サービス
type FirebaseAuthService struct {
	client          *auth.Client
	firestoreClient *firestore.Client
}

// NewFirebaseAuthService Firebase認証サービスのコンストラクタ
func NewFirebaseAuthService(client *auth.Client, firestoreClient *firestore.Client) *FirebaseAuthService {
	return &FirebaseAuthService{
		client:          client,
		firestoreClient: firestoreClient,
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
}

// ResendVerificationEmail 認証メール再送信（フロントエンドに委譲）
func (fas *FirebaseAuthService) ResendVerificationEmail(ctx context.Context, email string) error {
	log.Printf("ResendVerificationEmail: 認証メール再送信要求 (email: %s)", email)

	// ユーザー情報を取得
	user, err := fas.client.GetUserByEmail(ctx, email)
	if err != nil {
		if auth.IsUserNotFound(err) {
			return fmt.Errorf("ユーザーが見つかりません: %s", email)
		}
		return fmt.Errorf("ユーザー情報の取得に失敗: %v", err)
	}

	// Firestoreからビジネスユーザー情報を取得
	userDoc, err := fas.firestoreClient.Collection("business_users").Doc(user.UID).Get(ctx)
	if err != nil {
		return fmt.Errorf("ビジネスユーザー情報の取得に失敗: %v", err)
	}

	var businessUserData map[string]interface{}
	if err := userDoc.DataTo(&businessUserData); err != nil {
		return fmt.Errorf("ビジネスユーザーデータの変換に失敗: %v", err)
	}

	// 一時パスワードの存在確認
	temporaryPassword, _ := businessUserData["temporary_password"].(string)
	if temporaryPassword == "" {
		return fmt.Errorf("一時パスワードが設定されていません")
	}

	log.Printf("ResendVerificationEmail: ユーザー確認完了 (UserID: %s, email: %s)", user.UID, email)
	log.Printf("注意: 実際のメール送信はフロントエンドのauthenticationEmailService.tsで処理されます")
	
	return nil
}

// CheckEmailVerificationStatus メール認証状態をチェックし、必要に応じてWelcomeメールを送信
func (fas *FirebaseAuthService) CheckEmailVerificationStatus(ctx context.Context, userID string) error {
	// Firebase Cloud Functionsのエンドポイントを呼び出し
	functionsURL := os.Getenv("FIREBASE_FUNCTIONS_URL")
	if functionsURL == "" {
		functionsURL = "https://checkemailverificationstatus-6zr6g73pga-an.a.run.app"
	}

	payload := map[string]string{
		"userId": userID,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("JSONエンコードに失敗: %v", err)
	}

	resp, err := http.Post(functionsURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("Cloud Functionsの呼び出しに失敗: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Cloud Functionsからエラーレスポンス: %d", resp.StatusCode)
	}

	log.Printf("メール認証状態のチェックが完了しました (UserID: %s)", userID)
	return nil
}
