package graph

import (
	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	FirebaseApp     *firebase.App
	AuthClient      *auth.Client
	FirestoreClient *firestore.Client
}
