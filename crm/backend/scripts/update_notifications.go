package main

import (
	"context"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	// 環境変数を読み込み
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	ctx := context.Background()

	// Firebase初期化
	credentialsPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if credentialsPath == "" {
		credentialsPath = "./narratives-test-service-account.json"
	}

	opt := option.WithCredentialsFile(credentialsPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Fatalf("Firebase app initialization error: %v", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("Firestore client error: %v", err)
	}
	defer client.Close()

	// 全ての通知ドキュメントを取得
	iter := client.Collection("notifications").Documents(ctx)
	defer iter.Stop()

	count := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Document iteration error: %v", err)
			continue
		}

		// processedフィールドがない場合は追加
		data := doc.Data()
		if _, exists := data["processed"]; !exists {
			_, err := doc.Ref.Update(ctx, []firestore.Update{
				{
					Path:  "processed",
					Value: false,
				},
			})
			if err != nil {
				log.Printf("Document update error for %s: %v", doc.Ref.ID, err)
				continue
			}
			count++
			log.Printf("Updated notification: %s", doc.Ref.ID)
		}
	}

	log.Printf("Updated %d notifications with 'processed' field", count)
}
