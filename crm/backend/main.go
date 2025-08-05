package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"

	"narratives-crm-backend/graph"
	"narratives-crm-backend/graph/generated"
	"narratives-crm-backend/services"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
)

var (
	firebaseApp         *firebase.App
	authClient          *auth.Client
	firestoreClient     *firestore.Client
	firebaseAuthService *services.FirebaseAuthService
)

func initFirebase() error {
	ctx := context.Background()

	// Firebaseプロジェクトの設定
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "narratives-test-64976" // デフォルト値
	}

	config := &firebase.Config{
		ProjectID: projectID,
	}

	// サービスアカウントキーのパス
	credentialsPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	var opt option.ClientOption

	if credentialsPath != "" {
		// 明示的に指定されたサービスアカウントキーを使用
		opt = option.WithCredentialsFile(credentialsPath)
	} else {
		// Cloud Runのデフォルト認証情報を使用（これによりCloud Runで自動的に認証される）
		// option.WithCredentials() を省略するとデフォルト認証情報が使用される
		log.Println("Using default credentials for Firebase")
	}

	// Firebase Admin SDK を初期化
	var app *firebase.App
	var err error

	if opt != nil {
		app, err = firebase.NewApp(ctx, config, opt)
	} else {
		app, err = firebase.NewApp(ctx, config)
	}

	if err != nil {
		return fmt.Errorf("error initializing firebase app: %v", err)
	}

	// Auth クライアントを取得
	client, err := app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("error getting auth client: %v", err)
	}

	// Firestore クライアントを取得
	firestoreClient, err = app.Firestore(ctx)
	if err != nil {
		return fmt.Errorf("error getting firestore client: %v", err)
	}

	firebaseApp = app
	authClient = client

	log.Println("Firebase Admin SDK initialized successfully")
	return nil
}

func main() {
	// 環境変数を読み込み
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Firebase を初期化
	if err := initFirebase(); err != nil {
		log.Printf("Firebase initialization error: %v", err)
	}

	// メールサービスを初期化
	// メールサービスの初期化
	mailService := services.NewMailService(firestoreClient)
	emailService := services.NewEmailService(mailService)

	// メール接続をテスト
	if err := emailService.TestEmailConnection(); err != nil {
		log.Printf("メール接続テスト失敗: %v", err)
		log.Println("メール送信機能は無効化されています")
	} else {
		log.Println("メール接続テスト成功")
	}

	// Firebase認証サービスを初期化
	firebaseAuthService = services.NewFirebaseAuthService(authClient)

	// 通知監視サービスを初期化
	notificationWatcher := services.NewNotificationWatcher(firestoreClient, emailService, firebaseAuthService)

	// 通知監視を別ゴルーチンで開始
	ctx := context.Background()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		notificationWatcher.StartWatching(ctx)
	}()

	// Get port from environment variable or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Get host from environment variable or default to empty (all interfaces)
	host := os.Getenv("HOST")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK")
	})

	// Environment info endpoint
	http.HandleFunc("/env", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		env := map[string]string{
			"environment": os.Getenv("GO_ENV"),
			"project":     os.Getenv("GOOGLE_CLOUD_PROJECT"),
			"service":     "narratives-crm",
		}

		if env["environment"] == "" {
			env["environment"] = "development"
		}
		if env["project"] == "" {
			env["project"] = "unknown"
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(env)
	})

	// Firebase 接続テスト用エンドポイント
	http.HandleFunc("/firebase/test", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if firebaseApp == nil {
			http.Error(w, "Firebase not initialized", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"status":  "connected",
			"message": "Firebase Admin SDK is working",
			"project": os.Getenv("GOOGLE_CLOUD_PROJECT"),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// メール送信テスト用エンドポイント
	http.HandleFunc("/email/test", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// メール接続テスト
		if err := emailService.TestEmailConnection(); err != nil {
			response := map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}

		response := map[string]interface{}{
			"status":  "success",
			"message": "メール送信サービスは正常に動作しています",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// 特定の通知を手動で処理するエンドポイント
	http.HandleFunc("/notification/process", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		notificationID := r.URL.Query().Get("id")
		if notificationID == "" {
			http.Error(w, "notification_id parameter is required", http.StatusBadRequest)
			return
		}

		// 通知を処理
		if err := notificationWatcher.ProcessSingleNotification(ctx, notificationID); err != nil {
			response := map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}

		response := map[string]interface{}{
			"status":  "success",
			"message": "通知が正常に処理されました",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// GraphQL設定
	resolver := &graph.Resolver{
		FirebaseApp:     firebaseApp,
		AuthClient:      authClient,
		FirestoreClient: firestoreClient,
	}

	config := generated.Config{Resolvers: resolver}
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(config))

	// GraphQLエンドポイント
	http.Handle("/graphql", corsMiddleware(srv))

	// GraphQL Playground (開発環境用)
	if os.Getenv("GO_ENV") != "production" {
		http.Handle("/playground", playground.Handler("GraphQL playground", "/graphql"))
		log.Println("GraphQL Playground available at http://localhost:" + port + "/playground")
	}

	// Firebase Authenticationからユーザーを削除するAPI
	http.HandleFunc("/api/auth/delete-user", func(w http.ResponseWriter, r *http.Request) {
		// CORS ヘッダーを設定
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			log.Printf("DELETE USER API: メソッドが許可されていません: %s", r.Method)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		log.Printf("DELETE USER API: リクエストを受信しました")

		// リクエストボディを解析
		var requestData struct {
			Email string `json:"email"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
			log.Printf("DELETE USER API: リクエストボディの解析に失敗: %v", err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		log.Printf("DELETE USER API: ビジネスユーザー削除リクエスト - メール: %s", requestData.Email)

		if requestData.Email == "" {
			log.Printf("DELETE USER API: メールアドレスが空です")
			http.Error(w, "Email is required", http.StatusBadRequest)
			return
		}

		// Firebase認証からビジネスユーザーを削除
		if err := firebaseAuthService.DeleteUserByEmail(ctx, requestData.Email); err != nil {
			log.Printf("DELETE USER API: Firebase認証からのビジネスユーザー削除に失敗: %v", err)
			response := map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("ビジネスユーザー削除に失敗: %v", err),
				"error":   err.Error(),
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}

		log.Printf("DELETE USER API: Firebase認証からビジネスユーザー %s を正常に削除しました", requestData.Email)

		// 成功レスポンス
		response := map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("ユーザー %s をFirebase認証から削除しました", requestData.Email),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	addr := host + ":" + port
	fmt.Printf("Server starting on %s...\n", addr)
	fmt.Printf("GraphQL endpoint: http://%s/graphql\n", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

// CORSミドルウェア
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
