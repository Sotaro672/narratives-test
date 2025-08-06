const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin SDKを初期化（まだ初期化されていない場合）
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ユーザーのメール認証状態が変更された時のトリガー
exports.onUserEmailVerified = functions.auth.user().onUpdate(async (change, context) => {
  const beforeUser = change.before;
  const afterUser = change.after;
  
  // メール認証状態が false から true に変更された場合のみ処理
  if (!beforeUser.emailVerified && afterUser.emailVerified) {
    console.log(`User ${afterUser.uid} verified their email: ${afterUser.email}`);
    
    try {
      // business_usersコレクションでユーザー情報を確認
      const businessUserDoc = await db.collection('business_users').doc(afterUser.uid).get();
      
      if (!businessUserDoc.exists) {
        console.log(`Business user document not found for ${afterUser.uid}`);
        return;
      }
      
      const businessUserData = businessUserDoc.data();
      
      // 一時パスワードが設定されているかチェック
      if (!businessUserData.temporary_password) {
        console.log(`No temporary password found for ${afterUser.uid}`);
        return;
      }
      
      // 既に同じユーザーの welcome_email 通知があるかチェック
      const existingNotifications = await db.collection('notifications')
        .where('user_id', '==', afterUser.uid)
        .where('notification_type', '==', 'welcome_email')
        .where('processed', '==', false)
        .get();
      
      if (!existingNotifications.empty) {
        console.log(`Welcome email notification already exists for ${afterUser.uid}`);
        return;
      }
      
      // welcome_email通知を作成
      const notificationData = {
        notification_id: db.collection('notifications').doc().id,
        user_id: afterUser.uid,
        notification_type: 'welcome_email',
        title: 'アカウント作成完了',
        body: `${businessUserData.last_name} ${businessUserData.first_name}様のアカウントが作成されました。`,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        is_read: false,
        read_at: null,
        processed: false
      };
      
      await db.collection('notifications').add(notificationData);
      
      console.log(`Welcome email notification created for ${afterUser.uid}`);
      
    } catch (error) {
      console.error('Error creating welcome email notification:', error);
    }
  }
});
