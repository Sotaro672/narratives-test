package templates

import (
	"bytes"
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"text/template"
)

//go:embed email_templates/*.tmpl
var emailTemplates embed.FS

// EmailTemplate テンプレートのID定義
const (
	VerificationEmailTemplateID = "verification_email"
)

// TemplateData テンプレートで使用するデータの構造体
type TemplateData struct {
	DisplayName       string
	Email             string
	TemporaryPassword string
	VerificationLink  string
	LoginURL          string
}

// RenderTemplate テンプレートをレンダリングする
func RenderTemplate(templateID string, data interface{}) (string, error) {
	// 埋め込みファイルシステムからテンプレートを読み込む
	tmpl, err := template.ParseFS(emailTemplates, fmt.Sprintf("email_templates/%s.tmpl", templateID))
	if err != nil {
		// 埋め込みテンプレートの読み込みに失敗した場合、ファイルシステムから直接読み込む
		log.Printf("埋め込みテンプレートの読み込みに失敗しました: %v, ファイルシステムから直接読み込みます", err)

		// 候補となるパスのリスト
		templatePaths := []string{
			filepath.Join("templates", "email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join(".", "templates", "email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join("assets", "email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join(".", "assets", "email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join("/root/templates/email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join("/root/assets/email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join("/templates/email_templates", fmt.Sprintf("%s.tmpl", templateID)),
			filepath.Join("/assets/email_templates", fmt.Sprintf("%s.tmpl", templateID)),
		}

		// すべてのパスを試す
		var foundPath string
		for _, path := range templatePaths {
			log.Printf("テンプレートパスを試行: %s", path)
			if _, err := os.Stat(path); err == nil {
				foundPath = path
				log.Printf("テンプレートファイルを発見: %s", path)
				break
			}
		}

		if foundPath == "" {
			return "", fmt.Errorf("テンプレートファイルが見つかりません")
		}

		templatePath := foundPath

		tmpl, err = template.ParseFiles(templatePath)
		if err != nil {
			return "", fmt.Errorf("ファイルシステムからのテンプレート解析に失敗しました: %v", err)
		}
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("テンプレートの実行に失敗しました: %v", err)
	}

	return buf.String(), nil
}
