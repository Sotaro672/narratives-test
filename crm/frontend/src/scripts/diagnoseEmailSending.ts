import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyDZuEVrJs1zlkuCqcnGxVFEgqehciGrIQI",
  authDomain: "narratives-test-64976.firebaseapp.com",
  projectId: "narratives-test-64976",
  storageBucket: "narratives-test-64976.firebasestorage.app",
  messagingSenderId: "221090465383",
  appId: "1:221090465383:web:49c7e3b0009547c99576c2",
  measurementId: "G-S8WZENK6EY"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnoseEmailSending() {
  try {
    console.log('🔍 メール送信診断を開始します...');
    
    // 1. mailsコレクションの全ドキュメントを確認
    console.log('\n📧 mailsコレクションの確認...');
    const mailsRef = collection(db, 'mails');
    const mailsQuery = query(mailsRef, orderBy('sentAt', 'desc'), limit(10));
    const mailsSnapshot = await getDocs(mailsQuery);
    
    console.log(`📊 mailsコレクション内のドキュメント数: ${mailsSnapshot.size}`);
    
    if (mailsSnapshot.empty) {
      console.log('❌ mailsコレクションにドキュメントが見つかりません');
      return;
    }
    
    // 2. 各メールドキュメントの詳細を確認
    mailsSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const index = Array.from(mailsSnapshot.docs).indexOf(docSnapshot);
      console.log(`\n📨 メール #${index + 1} (ID: ${docSnapshot.id})`);
      console.log('  - To:', data.to);
      console.log('  - Subject:', data.message?.subject);
      console.log('  - Email Type:', data.emailType);
      console.log('  - Sent At:', data.sentAt?.toDate?.() || data.sentAt);
      console.log('  - Delivery Status:', data.delivery);
      console.log('  - Processing Status:', data.processing || 'No processing info');
      console.log('  - Error Info:', data.error || 'No errors');
      
      // Firebase Extensions処理状態の確認
      if (data.delivery?.state) {
        console.log('  - Delivery State:', data.delivery.state);
        console.log('  - Delivery Info:', data.delivery.info);
      }
      
      // 添付ファイルの確認
      console.log('  - Attachments:', data.attachments?.length || 0, 'files');
      
      // テンプレート情報
      if (data.template) {
        console.log('  - Template Name:', data.template.name);
        console.log('  - Template Data Keys:', Object.keys(data.template.data || {}));
      }
    });
    
    // 3. 特定のメールドキュメントの詳細確認（最新のもの）
    if (mailsSnapshot.size > 0) {
      const latestMail = mailsSnapshot.docs[0];
      const latestMailData = latestMail.data();
      
      console.log('\n🔬 最新メールの詳細分析:');
      console.log('Raw Data:', JSON.stringify(latestMailData, null, 2));
    }
    
    // 4. Firebase Extensions設定の確認
    console.log('\n⚙️ Firebase Extensions設定の推測:');
    console.log('- Mail Collection: mails');
    console.log('- Expected Fields: to, message, attachments');
    console.log('- SMTP Settings: Gmail SMTP (caotailangaogang@gmail.com)');
    
    // 5. 診断結果の総括
    console.log('\n📋 診断結果:');
    
    if (mailsSnapshot.size === 0) {
      console.log('❌ Problem: mailsコレクションにドキュメントがありません');
      console.log('   Solution: フロントエンドのメール送信機能を確認してください');
    } else {
      console.log('✅ mailsコレクションにドキュメントが存在します');
      
      const hasDeliveryInfo = mailsSnapshot.docs.some(doc => doc.data().delivery);
      if (!hasDeliveryInfo) {
        console.log('❌ Problem: Firebase Extensionsによる処理情報がありません');
        console.log('   Solution: 拡張機能の設定とSMTP認証情報を確認してください');
      } else {
        console.log('✅ Firebase Extensionsによる処理情報が存在します');
      }
    }
    
  } catch (error) {
    console.error('❌ 診断中にエラーが発生しました:', error);
  }
}

// スクリプト実行
diagnoseEmailSending().then(() => {
  console.log('\n✅ 診断完了');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 診断失敗:', error);
  process.exit(1);
});
