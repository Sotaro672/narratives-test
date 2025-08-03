// C:\Users\caota\narratives-test\backend\graph\mutation.resolvers.go
package graph

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"log"
	"time"

	"cloud.google.com/go/storage"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
)

// サイン付きURLレスポンス構造体
type SignedUrlPayload struct {
	SignedUrl string `json:"signedUrl"`
	PublicUrl string `json:"publicUrl"`
}

// アバター画像のアップロード用署名付きURLを発行
func (r *mutationResolver) GetAvatarUploadUrl(ctx context.Context, filename string) (*SignedUrlPayload, error) {
	log.Printf("Using bucket: %s", r.Config.GCPCredentials.BucketName)
	log.Printf("Requested filename: %s", filename)
	log.Printf("GoogleAccessID: %s", r.Config.GCPCredentials.GoogleAccessID) // ★ 追加ログ

	// ユニークなファイル名生成
	uniqueFilename := generateUniqueFilenameWithBase(filename)

	// 認証用JSONファイル読み込み（GOOGLE_APPLICATION_CREDENTIALSでも可）
	credsJSON, err := ioutil.ReadFile(r.Config.GCPCredentials.CredentialFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential file: %w", err)
	}

	// サービスアカウントからJWTコンフィグ作成（使わなくても可だが検証用）
	_, err = google.JWTConfigFromJSON(credsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to parse credentials: %w", err)
	}

	// GCSクライアント生成
	client, err := storage.NewClient(ctx, option.WithCredentialsJSON(credsJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}
	defer client.Close()

	// サイン付きURLを生成
	signedURL, err := storage.SignedURL(
		r.Config.GCPCredentials.BucketName,
		uniqueFilename,
		&storage.SignedURLOptions{
			Method:         "PUT",
			Expires:        time.Now().Add(15 * time.Minute),
			GoogleAccessID: r.Config.GCPCredentials.GoogleAccessID,
			PrivateKey:     []byte(r.Config.GCPCredentials.PrivateKey),
			ContentType:    "image/png",
			Scheme:         storage.SigningSchemeV4, // V4を使用
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate signed URL: %w", err)
	}

	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s", r.Config.GCPCredentials.BucketName, uniqueFilename)

	log.Printf("Generated signed URL for file: %s", uniqueFilename)

	return &SignedUrlPayload{
		SignedUrl: signedURL,
		PublicUrl: publicURL,
	}, nil
}

// ランダムかつ時刻ベースのファイル名生成
func generateUniqueFilenameWithBase(baseFilename string) string {
	randomBytes := make([]byte, 8)
	rand.Read(randomBytes)
	randomHex := hex.EncodeToString(randomBytes)

	timestamp := time.Now().Unix()
	return fmt.Sprintf("%d_%s_%s", timestamp, randomHex, baseFilename)
}
