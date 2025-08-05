// C:\Users\caota\narratives-test\backend\main.go
package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"

	"narratives-test/graph"
	"narratives-test/graph/generated"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func getServiceAccountPath() string {
	if path := os.Getenv("GCS_CREDENTIAL_FILE"); path != "" {
		return path
	}
	// 現在のディレクトリの認証ファイルを使用
	return "narratives-test-00fc9efaa447.json"
}

// 🔧 JSON から private_key_id を読み取る関数
func loadPrivateKeyIDFromJSON(path string) (string, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}
	var sa struct {
		PrivateKeyID string `json:"private_key_id"`
	}
	if err := json.Unmarshal(data, &sa); err != nil {
		return "", err
	}
	return sa.PrivateKeyID, nil
}

// 🔧 JSON から整形済みの private_key を読み取る関数
func loadCleanedPrivateKeyFromJSON(path string) (string, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}
	var sa struct {
		PrivateKey string `json:"private_key"`
	}
	if err := json.Unmarshal(data, &sa); err != nil {
		return "", err
	}
	return strings.ReplaceAll(sa.PrivateKey, `\n`, "\n"), nil
}

func main() {
	_ = godotenv.Load() // .env 読み込み（任意）

	serviceAccountPath := getServiceAccountPath()
	log.Printf("🔍 Using service account path: %s", serviceAccountPath)

	// サービスアカウントからキー情報を取得
	privateKeyID, err := loadPrivateKeyIDFromJSON(serviceAccountPath)
	if err != nil {
		log.Fatalf("❌ Failed to read private_key_id from JSON: %v", err)
	}
	privateKey, err := loadCleanedPrivateKeyFromJSON(serviceAccountPath)
	if err != nil {
		log.Fatalf("❌ Failed to read private_key from JSON: %v", err)
	}

	log.Printf("✅ PrivateKey loaded. Length: %d", len(privateKey))
	log.Printf("🧾 PrivateKey starts with: %.30s...", privateKey)

	// Resolver 構成
	resolver := &graph.Resolver{}
	resolver.Config.GCPCredentials.PrivateKey = privateKey
	resolver.Config.GCPCredentials.PrivateKeyID = privateKeyID
	resolver.Config.GCPCredentials.CredentialFile = serviceAccountPath

	bucketName := os.Getenv("GCS_BUCKET_NAME")
	googleAccessID := os.Getenv("GCS_GOOGLE_ACCESS_ID")

	// 環境変数の検証とクリーンアップ
	if bucketName == "" {
		log.Fatalf("❌ GCS_BUCKET_NAME environment variable is not set")
	}
	if googleAccessID == "" {
		log.Fatalf("❌ GCS_GOOGLE_ACCESS_ID environment variable is not set")
	}

	// バケット名をクリーンアップ
	bucketName = strings.TrimSpace(bucketName)
	if strings.Contains(bucketName, " ") {
		log.Printf("⚠️ バケット名にスペースが含まれています: '%s'", bucketName)
		bucketName = strings.Split(bucketName, " ")[0]
		log.Printf("✅ クリーンアップ後のバケット名: '%s'", bucketName)
	}

	resolver.Config.GCPCredentials.BucketName = bucketName
	resolver.Config.GCPCredentials.GoogleAccessID = googleAccessID

	log.Printf("✅ バケット名: %s", bucketName)
	log.Printf("✅ Google Access ID: %s", googleAccessID)

	// GraphQL ハンドラー構成
	srv := handler.New(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.Use(extension.Introspection{})

	// CORS設定
	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:3000",
			"http://localhost:*",
			"https://localhost:*",
			"https://narratives-test-64976.web.app",
			"https://narratives-test-64976.firebaseapp.com",
			"https://narratives-crm.web.app",
			"https://narratives-crm.firebaseapp.com",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"*"},
		AllowCredentials: true,
		Debug:            true,
	})

	// ルーティング設定
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})
	mux.Handle("/", playground.Handler("GraphQL Playground", "/query"))
	mux.Handle("/query", c.Handler(srv))

	// ポート取得（Cloud Run は PORT 環境変数を自動で渡す）
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🌐 Starting server on 0.0.0.0:%s", port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, mux))
}
