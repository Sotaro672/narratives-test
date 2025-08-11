"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativesApiProxy = exports.onBusinessUserUpdated = exports.checkEmailVerificationStatus = exports.onAuthUserCreated = exports.onUserEmailVerified = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
const NARRATIVES_SNS_API_BASE_URL = "https://narratives-api-765852113927.asia-northeast1.run.app";
// メール認証完了時にWelcome emailを送信するHTTPエンドポイント
exports.onUserEmailVerified = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }
    try {
        // Firebase Authからユーザー情報を取得
        const userRecord = await admin.auth().getUser(userId);
        // メール認証が完了している場合のみ処理
        if (!userRecord.emailVerified) {
            res.json({ success: false, message: "Email not verified yet" });
            return;
        }
        await processEmailVerifiedUser(userId);
        res.json({ success: true, message: "Welcome email processed" });
    }
    catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Firebase Auth ユーザー作成時のトリガー（シンプル版）
exports.onAuthUserCreated = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }
    try {
        // Firebase Authからユーザー情報を取得
        const userRecord = await admin.auth().getUser(userId);
        console.log(`User created: ${userRecord.uid}, email verified: ${userRecord.emailVerified}`);
        // メール認証が完了している場合のみ処理
        if (!userRecord.emailVerified) {
            console.log(`User ${userRecord.uid} email not yet verified`);
            res.json({ success: false, message: "Email not verified yet" });
            return;
        }
        await processEmailVerifiedUser(userRecord.uid);
        res.json({ success: true, message: "Welcome email triggered" });
    }
    catch (error) {
        console.error(`Error checking user ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// メール認証状態変更を検知するトリガー
exports.checkEmailVerificationStatus = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }
    try {
        // Firebase Authからユーザー情報を取得
        const userRecord = await admin.auth().getUser(userId);
        // メール認証が完了している場合
        if (userRecord.emailVerified) {
            await processEmailVerifiedUser(userId);
            res.json({ success: true, message: "Welcome email triggered" });
        }
        else {
            res.json({ success: false, message: "Email not verified yet" });
        }
    }
    catch (error) {
        console.error(`Error checking user ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// メール認証完了ユーザーの処理
async function processEmailVerifiedUser(userId) {
    try {
        const db = admin.firestore();
        // Firebase Authからユーザー情報を取得
        const userRecord = await admin.auth().getUser(userId);
        // business_usersからユーザー情報を取得
        const userDoc = await db.collection('business_users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`Business user ${userId} not found`);
            return;
        }
        const userData = userDoc.data();
        if (!userData) {
            console.log(`No data found for business user ${userId}`);
            return;
        }
        // メール認証完了後のウェルカムメールを送信
        await sendPostVerificationWelcomeEmail(userId, userData, userRecord);
        // business_usersドキュメントのemail_verifiedフィールドを更新
        await db.collection('business_users').doc(userId).update({
            email_verified: true,
            email_verified_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Email verification processed for user ${userId}`);
    }
    catch (error) {
        console.error(`Error processing email verified user ${userId}:`, error);
    }
}
// メール認証完了後のウェルカムメール送信
async function sendPostVerificationWelcomeEmail(userId, userData, userRecord) {
    const db = admin.firestore();
    const displayName = `${userData.last_name} ${userData.first_name}`;
    const loginUrl = "https://narratives-crm-site.web.app/login";
    // 既に認証完了ウェルカムメールが送信されているかチェック
    const existingWelcomeMails = await db.collection('mails')
        .where('to', 'array-contains', userData.email_address)
        .where('emailType', '==', 'post_verification_welcome')
        .get();
    if (!existingWelcomeMails.empty) {
        console.log(`Post-verification welcome email already sent for ${userId}`);
        return;
    }
    const welcomeEmailData = {
        to: [userData.email_address],
        message: {
            subject: `${displayName}様、メール認証が完了しました！`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745; text-align: center;">🎉 メール認証が完了しました！</h2>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3>認証完了のお知らせ</h3>
            <p>
              ${displayName}様、メールアドレスの認証が正常に完了いたしました。
              これでNarratives CRMのすべての機能をご利用いただけます。
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>🚀 ご利用開始の手順</h3>
            <ol>
              <li>下記のボタンからログイン画面にアクセス</li>
              <li>登録されたメールアドレスとパスワードでログイン</li>
              <li>CRMシステムの機能をお楽しみください</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
              📱 CRMシステムにログイン
            </a>
          </div>

          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>📋 ご利用可能な機能</h3>
            <ul>
              <li>顧客情報の管理と分析</li>
              <li>ビジネスメンバーの招待</li>
              <li>組織・ブランド管理</li>
              <li>レポートとダッシュボード</li>
              <li>ニュースとお知らせの確認</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>💡 お役立ち情報</h3>
            <ul>
              <li>初回ログイン後は、プロファイル設定の確認をお勧めします</li>
              <li>パスワードは定期的に変更することをお勧めします</li>
              <li>ご不明な点がございましたら、サポートまでお気軽にお問い合わせください</li>
            </ul>
          </div>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px; text-align: center;">
            Narratives CRM システム<br>
            サポート: support@narratives.co.jp<br>
            このメールは自動送信されています。
          </p>
        </div>
      `,
            text: `
${displayName}様

🎉 メール認証が完了しました！

メールアドレスの認証が正常に完了いたしました。
これでNarratives CRMのすべての機能をご利用いただけます。

【ご利用開始の手順】
1. ログイン画面にアクセス: ${loginUrl}
2. 登録されたメールアドレスとパスワードでログイン
3. CRMシステムの機能をお楽しみください

【ご利用可能な機能】
・顧客情報の管理と分析
・ビジネスメンバーの招待
・組織・ブランド管理
・レポートとダッシュボード
・ニュースとお知らせの確認

【お役立ち情報】
・初回ログイン後は、プロファイル設定の確認をお勧めします
・パスワードは定期的に変更することをお勧めします
・ご不明な点がございましたら、サポートまでお気軽にお問い合わせください

Narratives CRM システム
サポート: support@narratives.co.jp
      `
        },
        attachments: [],
        emailType: 'post_verification_welcome',
        userId: userId,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        triggerEvent: 'email_verification_completed'
    };
    // mailsコレクションに追加（Firestore Send Email拡張機能が自動処理）
    await db.collection('mails').add(welcomeEmailData);
    console.log(`Post-verification welcome email queued for ${userId} (${userData.email_address})`);
}
// business_usersコレクションの変更を監視してメール認証状態をチェック（v2を使用）
exports.onBusinessUserUpdated = (0, firestore_1.onDocumentUpdated)("business_users/{userId}", async (event) => {
    const afterData = event.data?.after.data();
    const userId = event.params.userId;
    if (!afterData) {
        console.log(`No after data for user ${userId}`);
        return;
    }
    try {
        // Firebase Authからユーザー情報を取得
        const userRecord = await admin.auth().getUser(userId);
        // メール認証が完了している場合
        if (userRecord.emailVerified) {
            console.log(`User ${userId} has verified email, checking for notification`);
            const db = admin.firestore();
            // 一時パスワードが設定されているかチェック
            if (!afterData.temporary_password) {
                console.log(`No temporary password found for ${userId}`);
                return;
            }
            // 既に同じユーザーの welcome_email 通知があるかチェック
            const existingNotifications = await db.collection('notifications')
                .where('user_id', '==', userId)
                .where('notification_type', '==', 'welcome_email')
                .where('processed', '==', false)
                .get();
            if (!existingNotifications.empty) {
                console.log(`Welcome email notification already exists for ${userId}`);
                return;
            }
            // welcome_email通知を作成
            const notificationData = {
                notification_id: db.collection('notifications').doc().id,
                user_id: userId,
                notification_type: 'welcome_email',
                title: 'アカウント作成完了',
                body: `${afterData.last_name} ${afterData.first_name}様のアカウントが作成されました。`,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                is_read: false,
                read_at: null,
                processed: false
            };
            await db.collection('notifications').add(notificationData);
            console.log(`Welcome email notification created for ${userId}`);
        }
        else {
            console.log(`User ${userId} email not yet verified`);
        }
    }
    catch (error) {
        console.error('Error checking user email verification:', error);
    }
});
// 定期的にメール認証状態をチェックするスケジュール関数（一時的に無効化）
/*
export const checkEmailVerificationStatus = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    console.log('Running scheduled email verification check');
    
    try {
      const db = admin.firestore();
      
      // 一時パスワードを持つユーザーを取得
      const businessUsersSnapshot = await db.collection('business_users')
        .where('temporary_password', '!=', null)
        .limit(50)
        .get();
      
      for (const doc of businessUsersSnapshot.docs) {
        const userData = doc.data();
        const userId = doc.id;
        
        try {
          // Firebase Authからユーザー情報を取得
          const userRecord = await admin.auth().getUser(userId);
          
          // メール認証済みの場合
          if (userRecord.emailVerified) {
            // 既に通知があるかチェック
            const existingNotifications = await db.collection('notifications')
              .where('user_id', '==', userId)
              .where('notification_type', '==', 'welcome_email')
              .where('processed', '==', false)
              .get();
            
            if (existingNotifications.empty) {
              // 通知を作成
              const notificationData = {
                notification_id: db.collection('notifications').doc().id,
                user_id: userId,
                notification_type: 'welcome_email',
                title: 'アカウント作成完了',
                body: `${userData.last_name} ${userData.first_name}様のアカウントが作成されました。`,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                is_read: false,
                read_at: null,
                processed: false
              };
              
              await db.collection('notifications').add(notificationData);
              console.log(`Scheduled: Welcome email notification created for ${userId}`);
            }
          }
        } catch (userError) {
          const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';
          console.log(`User ${userId} not found in Firebase Auth:`, errorMessage);
        }
      }
      
    } catch (error) {
      console.error('Error in scheduled email verification check:', error);
    }
  });
*/
// CORS proxy function for narratives-test SNS API
exports.narrativesApiProxy = (0, https_1.onRequest)({
    cors: ["https://narratives-crm-site.web.app"]
}, async (req, res) => {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    try {
        // Extract the path from the request
        const apiPath = req.path || "/";
        const targetUrl = `${NARRATIVES_SNS_API_BASE_URL}${apiPath}`;
        console.log(`Proxying ${req.method} ${targetUrl}`);
        // Forward the request to the narratives API
        const cleanHeaders = {};
        Object.entries(req.headers).forEach(([key, value]) => {
            if (key !== 'host' && typeof value === 'string') {
                cleanHeaders[key] = value;
            }
        });
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: cleanHeaders,
            body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
        });
        // Forward the response
        const responseData = await response.text();
        // Set response headers
        response.headers.forEach((value, key) => {
            if (key.toLowerCase() !== "access-control-allow-origin") {
                res.set(key, value);
            }
        });
        res.status(response.status).send(responseData);
    }
    catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({
            error: "Proxy error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
//# sourceMappingURL=index.js.map