/**
 * Firestoreのmailとmailsコレクションの状況を確認するスクリプト
 */

import admin from 'firebase-admin';

// Firebase Admin SDK初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'narratives-test-64976', // 正しいプロジェクトIDに変更
  });
}

const db = admin.firestore();

/**
 * コレクションの状況を確認
 */
async function checkCollectionStatus(): Promise<void> {
  try {
    console.log('🔍 Firestoreコレクションの状況を確認中...\n');
    
    // mailコレクションをチェック
    const mailCollection = db.collection('mail');
    const mailSnapshot = await mailCollection.get();
    console.log(`📧 mailコレクション: ${mailSnapshot.size}件のドキュメント`);
    
    if (mailSnapshot.size > 0) {
      console.log('   📄 サンプルドキュメント:');
      mailSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      データ:`, JSON.stringify(doc.data(), null, 2).substring(0, 200) + '...');
      });
    }
    
    // mailsコレクションをチェック  
    const mailsCollection = db.collection('mails');
    const mailsSnapshot = await mailsCollection.get();
    console.log(`\n📨 mailsコレクション: ${mailsSnapshot.size}件のドキュメント`);
    
    if (mailsSnapshot.size > 0) {
      console.log('   📄 サンプルドキュメント:');
      mailsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        const data = doc.data();
        console.log(`      to: ${data.to?.[0] || 'N/A'}`);
        console.log(`      subject: ${data.message?.subject || 'N/A'}`);
        console.log(`      作成日時: ${data.delivery?.startTime?.toDate?.() || 'N/A'}`);
        console.log(`      状態: ${data.delivery?.state || 'N/A'}`);
      });
    }
    
    // Firebase拡張機能の設定状況
    console.log('\n⚙️ Firebase拡張機能設定:');
    console.log('   - 拡張機能: Trigger Email from Firestore');
    console.log('   - 監視コレクション: mails');
    console.log('   - SMTP設定: Gmail (caotailangaogang@gmail.com)');
    
    // 推奨事項
    console.log('\n💡 推奨事項:');
    if (mailSnapshot.size > 0 && mailsSnapshot.size === 0) {
      console.log('   ⚠️ mailコレクションにデータがありますが、mailsコレクションが空です');
      console.log('   → 移行スクリプトを実行してデータを移行してください');
    } else if (mailSnapshot.size === 0 && mailsSnapshot.size >= 0) {
      console.log('   ✅ mailsコレクションが正しく使用されています');
      console.log('   ✅ Firebase拡張機能が正常に動作します');
    } else if (mailSnapshot.size > 0 && mailsSnapshot.size > 0) {
      console.log('   ⚠️ 両方のコレクションにデータが存在します');
      console.log('   → mailコレクションのデータを確認後、移行または削除を検討してください');
    }
    
  } catch (error) {
    console.error('❌ チェック中にエラーが発生しました:', error);
    throw error;
  }
}

// スクリプト実行
checkCollectionStatus()
  .then(() => {
    console.log('\n✅ チェックが完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ チェック中にエラーが発生しました:', error);
    process.exit(1);
  });
