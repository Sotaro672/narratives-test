package main

import (
	"context"
	"log"
	"time"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

type User struct {
	UserID      string `firestore:"user_id"`
	FirstName   string `firestore:"first_name"`
	LastName    string `firestore:"last_name"`
	EmailAddress string `firestore:"email_address"`
	Role        string `firestore:"role"`
	CreatedAt   time.Time `firestore:"created_at"`
	UpdatedAt   time.Time `firestore:"updated_at"`
}

func main() {
	ctx := context.Background()

	// Firebase Admin SDK初期化
	credentialsFile := "./narratives-test-00fc9efaa447.json"
	opt := option.WithCredentialsFile(credentialsFile)
	
	config := &firebase.Config{
		ProjectID: "narratives-test-64976",
	}
	
	app, err := firebase.NewApp(ctx, config, opt)
	if err != nil {
		log.Fatalf("Error initializing Firebase app: %v", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("Error getting Firestore client: %v", err)
	}
	defer client.Close()

	// テストユーザーを追加
	now := time.Now()
	users := []User{
		{
			UserID:       "caotarou_001",
			FirstName:    "太朗",
			LastName:     "曹",
			EmailAddress: "cao.tarou@narratives-test.com",
			Role:         "admin",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			UserID:       "user_002",
			FirstName:    "花子",
			LastName:     "佐藤",
			EmailAddress: "sato.hanako@example.com",
			Role:         "user",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			UserID:       "user_003",
			FirstName:    "次郎",
			LastName:     "田中",
			EmailAddress: "tanaka.jiro@example.com",
			Role:         "user",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	for _, user := range users {
		docRef, _, err := client.Collection("users").Add(ctx, user)
		if err != nil {
			log.Printf("Error adding user %s: %v", user.UserID, err)
		} else {
			log.Printf("User %s added with document ID: %s", user.UserID, docRef.ID)
		}
	}

	log.Println("All test users added successfully!")
}
