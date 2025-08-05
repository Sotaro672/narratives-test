# メール送信機能設定ガイド

## Gmail アプリパスワードの設定方法

1. **Gmailの2段階認証を有効にする**
   - Google アカウントのセキュリティ設定にアクセス
   - 2段階認証プロセスを有効にする

2. **アプリパスワードを生成する**
   - Google アカウント設定 > セキュリティ > アプリパスワード
   - 「アプリを選択」→「メール」
   - 「デバイスを選択」→「その他（カスタム名）」→「ScreenWriters CRM」
   - 生成された16文字のパスワードをコピー

3. **.envファイルを更新**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=あなたのGmailアドレス
   SMTP_PASSWORD=生成されたアプリパスワード
   FROM_EMAIL=あなたのGmailアドレス
   FROM_NAME=Narratives CRM System
   ```

## 手動テスト方法

1. **バックエンドサーバーを起動**
   ```bash
   cd backend
   go run main.go
   ```

2. **メール接続をテスト**
   ```bash
   curl http://localhost:5173/email/test
   ```

3. **特定の通知を手動で送信**
   ```bash
   curl -X POST "http://localhost:5173/notification/process?id=welcome_XouQR9zFvlV3HF70aejGCMfuo8U2_1753500881091"
   ```

## 実際のメール設定例
Gmailを使用する場合：
- SMTP_HOST: smtp.gmail.com
- SMTP_PORT: 587
- SMTP_USER: caotailangaogang@gmail.com
- SMTP_PASSWORD: yodaka64

他のメールプロバイダー:
- Outlook/Hotmail: smtp-mail.outlook.com:587
- Yahoo: smtp.mail.yahoo.com:587
- SendGrid: smtp.sendgrid.net:587
