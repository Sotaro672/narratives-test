const admin = require('firebase-admin');

// Firebase Admin SDKを初期化
const serviceAccount = require('./sns/backend/scripts/narratives-test-00fc9efaa447.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://narratives-test-64976-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

// テストメールをmailsコレクションに追加
async function sendTestEmail() {
  try {
    const testEmail = {
      to: ['caotailangaogang@gmail.com'],
      message: {
        subject: 'Cloud Function テストメール - Nodemailer',
        html: '<h1>テストメール</h1><p>Nodemailerを使ったCloud Functionからのテストメールです。</p><p>送信時刻: ' + new Date().toISOString() + '</p>',
        text: 'Nodemailerを使ったCloud Functionからのテストメールです。送信時刻: ' + new Date().toISOString()
      }
    };

    const docRef = await db.collection('mails').add(testEmail);
    console.log('テストメールをキューに追加しました。ドキュメントID:', docRef.id);
    console.log('Cloud Functionがこのメールを処理するまで少し待ちます...');
    
    // 少し待ってからドキュメントの状態を確認
    setTimeout(async () => {
      const doc = await docRef.get();
      const data = doc.data();
      console.log('ドキュメントの現在の状態:', data);
      
      if (data.delivery) {
        console.log('配信状況:', data.delivery);
        if (data.delivery.state === 'SUCCESS') {
          console.log('✅ メール送信成功！');
        } else if (data.delivery.state === 'ERROR') {
          console.log('❌ メール送信エラー:', data.delivery.error);
        }
      } else {
        console.log('⏳ まだ処理中です...');
      }
      
      process.exit(0);
    }, 10000); // 10秒待つ
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

sendTestEmail();
