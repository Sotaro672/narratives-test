package config

import (
	"encoding/json"
	"fmt"
	"os"
)

// ServiceAccountKey は GCP のサービスアカウントJSONから必要なフィールドだけを読み込む
type ServiceAccountKey struct {
	PrivateKey  string `json:"private_key"`
	ClientEmail string `json:"client_email"` // これは GoogleAccessID に該当
}

// LoadServiceAccount は JSONファイルからキー情報を読み込む
func LoadServiceAccount(path string) (*ServiceAccountKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read service account file: %w", err)
	}
	var key ServiceAccountKey
	if err := json.Unmarshal(data, &key); err != nil {
		return nil, fmt.Errorf("failed to parse service account file: %w", err)
	}
	return &key, nil
}
