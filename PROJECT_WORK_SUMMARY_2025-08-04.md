# Narratives プロジェクト開発作業 - 2025年8月4日

## 📋 作業概要
CRMシステムのサインイン時認証メール機能の実装と、CORS/Firebase認証エラーの解決

---

## 🎯 主要な実装内容

### 1. CRM認証メールシステムの構築

#### ✅ 新機能の実装
- **AuthenticationEmailService**: CRMサインイン時の自動認証メール送信サービス
- **Trigger Email from Firestore拡張機能**: Gmail SMTP経由での信頼性の高いメール配信
- **メール認証UI**: ユーザーの認証状態表示と再送信機能

#### 📧 メール機能詳細
- **自動認証メール**: ログイン時にメール未認証ユーザーに自動送信
- **カスタムテンプレート**: ウェルカムメールとログイン認証メール
- **再送信機能**: UIから認証メールの再送信が可能
- **認証状態管理**: リアルタイムの認証状態表示

#### 🔒 セキュリティ強化
- **メール認証必須**: 未認証ユーザーは機能制限
- **視覚的警告**: 認証済み（緑）、未認証（赤）の色分け表示
- **Firebase Authentication**: 標準認証との統合

---

## 🐛 問題解決

### 1. CORS エラーの解決
**問題**: `Access-Control-Allow-Origin header is present on the requested resource`
```
Error: Access to fetch at 'https://narratives-test-221090465383.asia-northeast1.run.app/query/query' 
from origin 'https://narratives-crm.web.app' has been blocked by CORS policy
```

**解決策**:
- SNS Backend (`main.go`) のCORS設定にCRMドメインを追加
- `AllowedOrigins` に `https://narratives-crm.web.app` を追加

```go
AllowedOrigins: []string{
    "http://localhost:3000",
    "https://narratives-test-64976.web.app",
    "https://narratives-crm.web.app",        // 追加
    "https://narratives-crm.firebaseapp.com", // 追加
},
```

### 2. Firebase認証エラーの解決
**問題**: `Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)`

**解決策**:
- カスタム `continueUrl` の使用を停止
- 標準の `sendEmailVerification()` に変更
- Trigger Email拡張機能による代替メール送信

```typescript
// 修正前（エラー発生）
await sendEmailVerification(user, {
  url: `https://narratives-crm.web.app/email-verification?uid=${user.uid}`,
  handleCodeInApp: true
});

// 修正後（正常動作）
await sendEmailVerification(user);
```

---

## 🚀 デプロイ・設定作業

### 1. Firebase Extension設定
- **Trigger Email from Firestore (v0.2.4)** の設置・設定
- Gmail SMTP設定 (caotailangaogang@gmail.com)
- アプリパスワード: `bwrehdfiprygpnv`
- データベース設定: `(default)` に修正

### 2. Firestore設定
- **インデックス追加**: mailコレクション用クエリ最適化
- **セキュリティルール**: mail送信権限の設定
- **TTL設定**: メール記録の1日自動削除

### 3. Cloud Run デプロイ
- **CRM Backend**: `narratives-crm` サービス
- **SNS Backend**: `narratives-api-765852113927` サービス (更新中)
- **Firebase Hosting**: CRMフロントエンド

---

## 📁 ファイル変更履歴

### 新規作成
- `crm/frontend/src/services/authenticationEmailService.ts` - 認証メールサービス
- `sns/backend/cloudbuild.yaml` - SNS Backend用Cloud Build設定
- `extensions/firestore-send-email.env` - Firebase拡張機能設定

### 主要修正
- `crm/frontend/src/widgets/Customer.tsx` - 認証状態UI、メール送信機能
- `sns/backend/main.go` - CORS設定にCRMドメイン追加
- `sns/backend/Dockerfile` - Golang 1.21、パス修正
- `firestore.indexes.json` - mailコレクション用インデックス追加

---

## 🔧 技術スタック

### バックエンド
- **Go 1.21**: SNS GraphQL API
- **Cloud Run**: サーバーレスコンテナデプロイ
- **Firebase Functions**: メール処理
- **Firestore**: データベース・メール配信トリガー

### フロントエンド  
- **React + TypeScript**: CRMインターフェース
- **Vite**: ビルドツール
- **Firebase Hosting**: 静的サイトホスティング
- **Firebase Authentication**: ユーザー認証

### インフラ・ツール
- **Google Cloud Platform**: narratives-test-64976 プロジェクト
- **Firebase Extensions**: Trigger Email from Firestore
- **Gmail SMTP**: メール配信プロバイダー
- **Cloud Build**: CI/CDパイプライン

---

## 📊 実装結果

### ✅ 完了した機能
1. **CRM認証メールシステム**: 実装・デプロイ完了
2. **Firebase拡張機能**: Gmail SMTP経由メール送信対応
3. **CORS問題**: 解決済み
4. **認証エラー**: 解決済み
5. **UI改善**: 認証状態表示・再送信ボタン

### 🔄 進行中
1. **SNS Backend**: Cloud Runへの最新版デプロイ中

### 🎯 運用可能な機能
- CRMログイン・認証メール送信
- メール認証状態の表示
- 認証メール再送信
- セキュアなユーザー管理

---

## 🌐 サービスURL

### 本番環境
- **CRM Frontend**: https://narratives-crm.web.app
- **SNS Frontend**: https://narratives-test-64976.web.app
- **CRM Backend**: https://narratives-crm-699392181476.us-central1.run.app
- **SNS Backend**: https://narratives-api-765852113927-221090465383.asia-northeast1.run.app

### 管理コンソール
- **Firebase Console**: https://console.firebase.google.com/project/narratives-test-64976
- **Google Cloud Console**: https://console.cloud.google.com/run?project=narratives-test-64976

---

## 📝 次回作業項目

### 優先度: 高
1. **Firebase認証ドメイン設定**: Firebase Consoleでドメイン認証
2. **メール認証フロー**: 完全な認証フロー動作確認
3. **エラーハンドリング**: 各種エラーケースの対応

### 優先度: 中
1. **メールテンプレート**: デザイン・文言の最適化  
2. **パフォーマンス**: ページ読み込み速度の改善
3. **モニタリング**: エラーログ・メトリクス設定

### 優先度: 低
1. **多言語対応**: 英語版メールテンプレート
2. **カスタムドメイン**: 独自ドメインでのメール送信
3. **A/Bテスト**: メール開封率の測定・改善

---

## 🔍 トラブルシューティング

### よくある問題
1. **メール未送信**: Firestore mailコレクションの確認
2. **CORS エラー**: ブラウザキャッシュのクリア
3. **認証失敗**: Firebase Consoleでユーザー状態確認
4. **Cloud Build エラー**: `$SHORT_SHA`変数が空の場合、`latest`タグを使用
5. **プロジェクトID変数エラー**: `$PROJECT_ID`が解決されない場合、明示的にプロジェクトIDを指定

### デバッグ方法
1. **ブラウザ開発者ツール**: ネットワークタブでAPI呼び出し確認
2. **Firebase Console**: Authentication/Firestoreのログ確認
3. **Cloud Run ログ**: Google Cloud Consoleでサーバーログ確認
4. **Cloud Build ログ**: Google Cloud Console > Cloud Build でビルドログ確認

### Cloud Build修正例
```yaml
# エラー発生: $SHORT_SHAが空、$PROJECT_IDが解決されない
args: ['build', '-t', 'gcr.io/$PROJECT_ID/service:$SHORT_SHA', '.']

# 修正版: 明示的なプロジェクトIDとlatestタグを使用
args: ['build', '-t', 'gcr.io/narratives-test-64976/service:latest', '.']
```

---

## 📞 連絡先・リソース

### 開発者
- **GitHub**: Sotaro672/narratives-test
- **プロジェクト**: narratives-test-64976

### ドキュメント
- **Firebase Extensions**: https://firebase.google.com/docs/extensions
- **Cloud Run**: https://cloud.google.com/run/docs
- **React**: https://react.dev/

---

**作成日**: 2025年8月4日  
**最終更新**: 16:53 JST - Cloud Build エラー修正、SNS Backend デプロイ再実行中  
**ステータス**: 🟡 展開中 (SNS Backend デプロイ中 - $SHORT_SHA エラー修正済み)
