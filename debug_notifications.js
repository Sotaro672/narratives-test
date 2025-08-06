// Firestore通知データ確認用スクリプト
// FirebaseコンソールのFirestoreで実行

// 最新の通知データを確認
db.collection('notifications')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()
  .then((snapshot) => {
    console.log('=== 最新の通知データ ===');
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Type: ${data.notification_type}`);
      console.log(`UserID: ${data.user_id}`);
      console.log(`Processed: ${data.processed}`);
      console.log(`Created: ${data.created_at?.toDate()}`);
      console.log('---');
    });
  });

// welcome_emailタイプの未処理通知を確認
db.collection('notifications')
  .where('notification_type', '==', 'welcome_email')
  .where('processed', '==', false)
  .get()
  .then((snapshot) => {
    console.log('=== 未処理のwelcome_email通知 ===');
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`UserID: ${data.user_id}`);
      console.log(`Created: ${data.created_at?.toDate()}`);
      console.log('---');
    });
  });

// business_usersコレクションの最新データを確認
db.collection('business_users')
  .orderBy('created_at', 'desc')
  .limit(5)
  .get()
  .then((snapshot) => {
    console.log('=== 最新のビジネスユーザー ===');
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Email: ${data.email_address}`);
      console.log(`Name: ${data.last_name} ${data.first_name}`);
      console.log(`Temp Password: ${data.temporary_password ? 'あり' : 'なし'}`);
      console.log(`Created: ${data.created_at?.toDate()}`);
      console.log('---');
    });
  });
