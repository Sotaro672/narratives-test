package graph

// GCPCredentials holds GCP-related environment credentials
type GCPCredentials struct {
	CredentialFile string // path to credentials JSON file
	PrivateKey     string // used for signed URL generation
	BucketName     string
	GoogleAccessID string
	PrivateKeyID   string
}

// Config holds application-wide configuration
type Config struct {
	GCPCredentials GCPCredentials
}

// Resolver is the root resolver that holds configuration
type Resolver struct {
	Config Config
}

// Helper functions for pointer conversions
func stringPtr(s string) *string {
	return &s
}

func floatPtr(f float64) *float64 {
	return &f
}
