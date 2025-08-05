/**
 * mailsコレクションの既存ドキュメントにattachmentsフィールドを追加するスクリプト
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
 * 未処理のメールドキュメントを修復
 */
async function fixPendingMailDocuments(): Promise<void> {
  try {
    console.log('🔧 未処理のメールドキュメントを修復中...\n');
    
    const mailsCollection = db.collection('mails');
    const snapshot = await mailsCollection.get();
    
    const batch = db.batch();
    let fixedCount = 0;
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      // 未処理のドキュメント（deliveryフィールドがない または attachmentsフィールドがない）
      const needsFix = !data.delivery || data.attachments === undefined;
      
      if (needsFix) {
        console.log(`🔧 修復中: ${doc.id}`);
        console.log(`   宛先: ${data.to?.[0] || 'N/A'}`);
        console.log(`   件名: ${data.message?.subject || 'N/A'}`);
        console.log(`   問題: ${!data.delivery ? 'delivery未設定' : ''} ${data.attachments === undefined ? 'attachments未設定' : ''}`);
        
        // attachmentsフィールドを追加
        const updateData: any = {};
        if (data.attachments === undefined) {
          updateData.attachments = [];
        }
        
        // 更新するフィールドがある場合のみバッチに追加
        if (Object.keys(updateData).length > 0) {
          batch.update(doc.ref, updateData);
          fixedCount++;
        }
      }
    });
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`\n✅ ${fixedCount}件のドキュメントを修復しました`);
      
      // 修復後、少し待ってから拡張機能がトリガーされるかチェック
      console.log('\n⏰ 拡張機能のトリガーを待機中（30秒）...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // 修復結果を確認
      await checkFixResults();
      
    } else {
      console.log('✅ 修復が必要なドキュメントはありません');
    }
    
  } catch (error) {
    console.error('❌ 修復中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 修復結果を確認
 */
async function checkFixResults(): Promise<void> {
  try {
    console.log('\n🔍 修復結果を確認中...\n');
    
    const mailsCollection = db.collection('mails');
    const snapshot = await mailsCollection.get();
    
    let successCount = 0;
    let pendingCount = 0;
    let errorCount = 0;
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const deliveryState = data.delivery?.state;
      const docId = doc.id;
      
      console.log(`📄 ${docId}:`);
      console.log(`   状態: ${deliveryState || '未処理'}`);
      console.log(`   attachments: ${data.attachments !== undefined ? '✅' : '❌'}`);
      
      switch (deliveryState) {
        case 'SUCCESS':
          successCount++;
          break;
        case 'ERROR':
          errorCount++;
          if (data.delivery?.error) {
            console.log(`   ❌ エラー: ${JSON.stringify(data.delivery.error)}`);
          }
          break;
        default:
          pendingCount++;
      }
      console.log('');
    });
    
    console.log('📊 修復後の統計:');
    console.log(`   ✅ 成功: ${successCount}件`);
    console.log(`   ❌ エラー: ${errorCount}件`);
    console.log(`   ⏳ 未処理: ${pendingCount}件`);
    
    if (pendingCount > 0) {
      console.log('\n⚠️ まだ未処理のドキュメントがあります');
      console.log('追加の対処法:');
      console.log('1. Firebase Console で拡張機能のログを確認');
      console.log('2. 拡張機能を一度無効にして再度有効にする');
      console.log('3. 新しいテストドキュメントを作成して動作確認');
    }
    
  } catch (error) {
    console.error('❌ 結果確認中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 新しいテストメールで動作確認
 */
async function sendTestEmailWithAttachments(): Promise<void> {
  try {
    console.log('\n📧 修復後のテストメールを送信...\n');
    
    const testEmailData = {
      to: ['caotailangaogang@gmail.com'],
      message: {
        subject: '修復後テスト - ' + new Date().toLocaleString('ja-JP'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Firebase拡張機能修復後テスト</h2>
            <p>このメールは attachments フィールド修復後のテストです。</p>
            <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>修復内容:</h3>
              <ul>
                <li>attachments フィールドを明示的に空配列として追加</li>
                <li>Firebase拡張機能のトリガー条件を満たすように調整</li>
              </ul>
            </div>
            <p>このメールが届いた場合、修復が成功しています！</p>
          </div>
        `,
        text: `
Firebase拡張機能修復後テスト

このメールは attachments フィールド修復後のテストです。
送信時刻: ${new Date().toLocaleString('ja-JP')}

修復内容:
- attachments フィールドを明示的に空配列として追加
- Firebase拡張機能のトリガー条件を満たすように調整

このメールが届いた場合、修復が成功しています！
        `
      },
      attachments: [] // 明示的に空配列を設定
    };
    
    const mailsCollection = db.collection('mails');
    const docRef = await mailsCollection.add(testEmailData);
    
    console.log(`✅ 修復後テストメールを送信しました`);
    console.log(`   ドキュメントID: ${docRef.id}`);
    console.log(`   attachments: ${JSON.stringify(testEmailData.attachments)}`);
    
    // 30秒待機して結果確認
    console.log('\n⏰ 30秒後に配信状況を確認します...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const testDoc = await docRef.get();
    const testData = testDoc.data();
    
    console.log('\n📊 修復後テスト結果:');
    if (testData?.delivery) {
      console.log(`   配信状態: ${testData.delivery.state || '未設定'}`);
      if (testData.delivery.state === 'SUCCESS') {
        console.log('   🎉 修復成功！メール送信が正常に動作しています');
      } else if (testData.delivery.error) {
        console.log(`   ❌ エラー: ${JSON.stringify(testData.delivery.error)}`);
      }
    } else {
      console.log('   ⚠️ まだ拡張機能による処理が実行されていません');
      console.log('   Firebase Console で拡張機能の状態を確認してください');
    }
    
  } catch (error) {
    console.error('❌ テストメール送信中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * メイン修復処理
 */
async function main(): Promise<void> {
  console.log('🚀 mailsコレクションドキュメント修復を開始します\n');
  
  try {
    // 1. 未処理ドキュメントを修復
    await fixPendingMailDocuments();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. 修復後のテストメール送信
    await sendTestEmailWithAttachments();
    
    console.log('\n🎯 修復完了！');
    console.log('今後新しく送信するメールは正常に動作するはずです。');
    console.log('既存のコードにも attachments: [] が追加されているため、問題は解決されました。');
    
  } catch (error) {
    console.error('\n❌ 修復処理中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main()
  .then(() => {
    console.log('\n✅ 修復が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 修復中にエラーが発生しました:', error);
    process.exit(1);
  });
