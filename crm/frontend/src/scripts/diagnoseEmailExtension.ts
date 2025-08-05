/**
 * Firebase拡張機能のメール送信問題を診断するスクリプト
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
 * メールドキュメントの詳細分析
 */
async function analyzeMailDocuments(): Promise<void> {
  try {
    console.log('🔍 メールドキュメントの詳細分析を開始します\n');
    
    const mailsCollection = db.collection('mails');
    const snapshot = await mailsCollection.orderBy('__name__').get();
    
    console.log(`📊 総ドキュメント数: ${snapshot.size}件\n`);
    
    let processedCount = 0;
    let pendingCount = 0;
    let errorCount = 0;
    let successCount = 0;
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const deliveryState = data.delivery?.state;
      
      console.log(`📄 ドキュメント ${index + 1}: ${doc.id}`);
      console.log(`   宛先: ${data.to?.[0] || 'N/A'}`);
      console.log(`   件名: ${data.message?.subject || 'N/A'}`);
      console.log(`   作成時刻: ${data.delivery?.startTime ? data.delivery.startTime.toDate() : '未設定'}`);
      console.log(`   配信状態: ${deliveryState || '未処理'}`);
      
      if (data.delivery?.info) {
        console.log(`   詳細情報: ${JSON.stringify(data.delivery.info)}`);
      }
      
      if (data.delivery?.error) {
        console.log(`   ❌ エラー: ${JSON.stringify(data.delivery.error)}`);
      }
      
      // 必須フィールドの確認
      console.log(`   📋 必須フィールド確認:`);
      console.log(`      - to: ${data.to ? '✅' : '❌'}`);
      console.log(`      - message: ${data.message ? '✅' : '❌'}`);
      console.log(`      - message.subject: ${data.message?.subject ? '✅' : '❌'}`);
      console.log(`      - message.html または message.text: ${(data.message?.html || data.message?.text) ? '✅' : '❌'}`);
      
      // 拡張機能処理用フィールドの確認
      console.log(`   🔧 拡張機能フィールド:`);
      console.log(`      - attachments: ${data.attachments !== undefined ? '✅' : '❌'} (${Array.isArray(data.attachments) ? `配列: ${data.attachments.length}件` : typeof data.attachments})`);
      
      // 統計
      switch (deliveryState) {
        case 'SUCCESS':
          successCount++;
          break;
        case 'ERROR':
          errorCount++;
          break;
        case 'PROCESSING':
          processedCount++;
          break;
        default:
          pendingCount++;
      }
      
      console.log('');
    });
    
    // 統計サマリー
    console.log('📈 統計サマリー:');
    console.log(`   ✅ 成功: ${successCount}件`);
    console.log(`   🔄 処理中: ${processedCount}件`);
    console.log(`   ❌ エラー: ${errorCount}件`);
    console.log(`   ⏳ 未処理: ${pendingCount}件`);
    
    // 問題診断
    console.log('\n🔍 問題診断:');
    if (pendingCount > 0) {
      console.log(`   ⚠️ ${pendingCount}件のドキュメントが未処理です`);
      console.log('   考えられる原因:');
      console.log('   1. Firebase拡張機能が無効になっている');
      console.log('   2. SMTP認証情報に問題がある');
      console.log('   3. 必須フィールドが不足している');
      console.log('   4. 拡張機能のトリガー設定に問題がある');
    }
    
    if (errorCount > 0) {
      console.log(`   ❌ ${errorCount}件のドキュメントでエラーが発生しています`);
      console.log('   上記のエラー詳細を確認してください');
    }
    
  } catch (error) {
    console.error('❌ 分析中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * Firebase拡張機能の状態を確認
 */
async function checkExtensionStatus(): Promise<void> {
  try {
    console.log('🔧 Firebase拡張機能の状態確認\n');
    
    // 拡張機能のログを確認するためのクエリを実行
    console.log('📋 確認事項:');
    console.log('1. Firebase Console → Extensions → Trigger Email from Firestore');
    console.log('2. 拡張機能が「有効」状態になっているか');
    console.log('3. 設定で MAIL_COLLECTION = "mails" になっているか');
    console.log('4. SMTP設定が正しいか');
    console.log('5. 拡張機能のログにエラーがないか');
    
    console.log('\n🔗 確認用URL:');
    console.log('Firebase Console: https://console.firebase.google.com/project/narratives-crm/extensions');
    console.log('Cloud Functions ログ: https://console.cloud.google.com/functions/list?project=narratives-crm');
    
  } catch (error) {
    console.error('❌ 拡張機能状態確認中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * テストメールの送信
 */
async function sendTestEmail(): Promise<void> {
  try {
    console.log('📧 テストメールを送信しています...\n');
    
    const testEmailData = {
      to: ['caotailangaogang@gmail.com'], // 送信者と同じアドレスでテスト
      message: {
        subject: 'Firebase拡張機能テスト - ' + new Date().toLocaleString('ja-JP'),
        html: `
          <h2>Firebase拡張機能テスト</h2>
          <p>このメールは Firebase Extensions "Trigger Email from Firestore" のテストです。</p>
          <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
          <p>このメールが届いた場合、拡張機能は正常に動作しています。</p>
        `,
        text: `
Firebase拡張機能テスト

このメールは Firebase Extensions "Trigger Email from Firestore" のテストです。
送信時刻: ${new Date().toLocaleString('ja-JP')}
このメールが届いた場合、拡張機能は正常に動作しています。
        `
      },
      attachments: [] // 空の添付ファイル配列を明示的に追加
    };
    
    const mailsCollection = db.collection('mails');
    const docRef = await mailsCollection.add(testEmailData);
    
    console.log(`✅ テストメールを送信しました`);
    console.log(`   ドキュメントID: ${docRef.id}`);
    console.log(`   宛先: ${testEmailData.to[0]}`);
    console.log(`   件名: ${testEmailData.message.subject}`);
    
    console.log('\n⏰ 30秒後に配信状況を確認します...');
    
    // 30秒待機して結果を確認
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const testDoc = await docRef.get();
    const testData = testDoc.data();
    
    console.log('\n📊 テスト結果:');
    if (testData?.delivery) {
      console.log(`   配信状態: ${testData.delivery.state || '未設定'}`);
      console.log(`   開始時刻: ${testData.delivery.startTime ? testData.delivery.startTime.toDate() : '未設定'}`);
      if (testData.delivery.endTime) {
        console.log(`   終了時刻: ${testData.delivery.endTime.toDate()}`);
      }
      if (testData.delivery.error) {
        console.log(`   ❌ エラー: ${JSON.stringify(testData.delivery.error)}`);
      }
      if (testData.delivery.info) {
        console.log(`   ℹ️ 詳細: ${JSON.stringify(testData.delivery.info)}`);
      }
    } else {
      console.log('   ⚠️ 拡張機能による処理が実行されていません');
    }
    
  } catch (error) {
    console.error('❌ テストメール送信中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * メイン診断処理
 */
async function main(): Promise<void> {
  console.log('🚀 Firebase拡張機能メール送信診断を開始します\n');
  
  try {
    // 1. 既存のメールドキュメントを分析
    await analyzeMailDocuments();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. 拡張機能の状態確認
    await checkExtensionStatus();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 3. テストメール送信
    await sendTestEmail();
    
    console.log('\n🎯 次のステップ:');
    console.log('1. Firebase Console で拡張機能の状態を確認');
    console.log('2. Cloud Functions のログを確認');
    console.log('3. SMTP設定を再確認');
    console.log('4. 必要に応じて拡張機能を再インストール');
    
  } catch (error) {
    console.error('\n❌ 診断処理中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main()
  .then(() => {
    console.log('\n✅ 診断が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 診断中にエラーが発生しました:', error);
    process.exit(1);
  });
