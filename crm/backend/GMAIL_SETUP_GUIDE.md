# Gmail アプリパスワード設定手順

## 手順 1: Googleアカウントの2段階認証を有効にする

1. [Google アカウント設定](https://myaccount.google.com/) にアクセス
2. 左メニューから「セキュリティ」をクリック
3. 「Google へのログイン」セクションで「2段階認証プロセス」をクリック
4. 手順に従って2段階認証を有効にする

## 手順 2: アプリパスワードを生成する

1. 2段階認証が有効になったら、再度「セキュリティ」ページに戻る
2. 「Google へのログイン」セクションで「アプリ パスワード」をクリック
3. アプリを選択：「メール」
4. デバイスを選択：「その他（カスタム名）」
5. カスタム名に「ScreenWriters CRM」と入力
6. 「生成」をクリック
7. 表示された16文字のパスワードをコピー（例：abcd efgh ijkl mnop）

## 手順 3: .envファイルを更新

```bash
# 生成されたアプリパスワードを設定（スペースは除く）
SMTP_PASSWORD=abcdefghijklmnop
```

## 手順 4: サーバーを再起動してテスト

```bash
# サーバーを停止（Ctrl+C）してから再起動
go run main.go

# 別ターミナルでメール接続をテスト
curl http://localhost:8080/email/test
```

## 手順 5: 実際の通知を送信テスト

```bash
# 特定の通知IDで手動送信
curl -X POST "http://localhost:8080/notification/process?id=welcome_XouQR9zFvlV3HF70aejGCMfuo8U2_1753500881091"
```

## トラブルシューティング

### エラー: "Username and Password not accepted"
- Googleアカウントの2段階認証が有効になっていることを確認
- アプリパスワードが正しく生成されていることを確認
- .envファイルのパスワードにスペースが含まれていないことを確認

### エラー: "Less secure app access"
- アプリパスワードを使用している場合、この設定は不要
- 通常のパスワードではなく、必ずアプリパスワードを使用

### 他のメールプロバイダーを使用する場合
```bash
# Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```
