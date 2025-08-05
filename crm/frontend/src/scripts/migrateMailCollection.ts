/**
 * mailコレクションのデータをmailsコレクションに移行するスクリプト
 * Firebase Extensions "Trigger Email from Firestore" は "mails" コレクションを使用するため
 */

import admin from 'firebase-admin';

// Firebase Admin SDK初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'narratives-test-64976', // 正しいプロジェクトIDに変更
    // 本番環境では Application Default Credentials を使用
  });
}

const db = admin.firestore();

interface MailDocument {
  id: string;
  data: admin.firestore.DocumentData;
}

/**
 * mailコレクションからすべてのドキュメントを取得
 */
async function getAllMailDocuments(): Promise<MailDocument[]> {
  try {
    console.log('📧 mailコレクションからドキュメントを取得中...');
    
    const mailCollection = db.collection('mail');
    const querySnapshot = await mailCollection.orderBy(admin.firestore.FieldPath.documentId()).get();
    
    const documents: MailDocument[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`✅ ${documents.length}件のドキュメントを取得しました`);
    return documents;
    
  } catch (error) {
    console.error('❌ mailコレクションの取得中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * mailsコレクションにドキュメントを移行
 */
async function migrateToMailsCollection(documents: MailDocument[]): Promise<void> {
  if (documents.length === 0) {
    console.log('📭 移行するドキュメントがありません');
    return;
  }

  try {
    console.log(`📨 ${documents.length}件のドキュメントをmailsコレクションに移行中...`);
    
    const mailsCollection = db.collection('mails');
    const batch = db.batch();
    let batchCount = 0;
    
    for (const mailDoc of documents) {
      // mailsコレクションに新しいドキュメントを追加
      const newDocRef = mailsCollection.doc();
      batch.set(newDocRef, {
        ...mailDoc.data,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalMailId: mailDoc.id
      });
      
      batchCount++;
      
      // Firestoreのバッチ制限（500件）に達したら実行
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`✅ ${batchCount}件のドキュメントを移行しました`);
        batchCount = 0;
      }
    }
    
    // 残りのドキュメントを移行
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ 残り${batchCount}件のドキュメントを移行しました`);
    }
    
    console.log('✅ すべてのドキュメントの移行が完了しました');
    
  } catch (error) {
    console.error('❌ mailsコレクションへの移行中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 元のmailコレクションからドキュメントを削除
 */
async function deleteOriginalMailDocuments(documents: MailDocument[]): Promise<void> {
  if (documents.length === 0) {
    console.log('📭 削除するドキュメントがありません');
    return;
  }

  try {
    console.log(`🗑️ ${documents.length}件のドキュメントをmailコレクションから削除中...`);
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const mailDoc of documents) {
      const docRef = db.collection('mail').doc(mailDoc.id);
      batch.delete(docRef);
      
      batchCount++;
      
      // Firestoreのバッチ制限（500件）に達したら実行
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`✅ ${batchCount}件のドキュメントを削除しました`);
        batchCount = 0;
      }
    }
    
    // 残りのドキュメントを削除
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ 残り${batchCount}件のドキュメントを削除しました`);
    }
    
    console.log('✅ すべてのドキュメントの削除が完了しました');
    
  } catch (error) {
    console.error('❌ mailコレクションからの削除中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 移行の検証
 */
async function verifyMigration(): Promise<void> {
  try {
    console.log('🔍 移行結果を検証中...');
    
    // mailコレクションの残存ドキュメント数を確認
    const mailCollection = db.collection('mail');
    const mailSnapshot = await mailCollection.get();
    const remainingMailCount = mailSnapshot.size;
    
    // mailsコレクションのドキュメント数を確認
    const mailsCollection = db.collection('mails');
    const mailsSnapshot = await mailsCollection.get();
    const mailsCount = mailsSnapshot.size;
    
    console.log(`📊 検証結果:`);
    console.log(`   - mailコレクション残存ドキュメント: ${remainingMailCount}件`);
    console.log(`   - mailsコレクション総ドキュメント: ${mailsCount}件`);
    
    if (remainingMailCount === 0) {
      console.log('✅ 移行が正常に完了しました！');
    } else {
      console.log('⚠️ まだmailコレクションにドキュメントが残っています');
    }
    
  } catch (error) {
    console.error('❌ 検証中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * メイン移行処理
 */
async function main(): Promise<void> {
  console.log('🚀 mailコレクション → mailsコレクション移行を開始します\n');
  
  try {
    // 1. 現在のmailコレクションからすべてのドキュメントを取得
    const mailDocuments = await getAllMailDocuments();
    
    if (mailDocuments.length === 0) {
      console.log('📭 mailコレクションにドキュメントが存在しません。移行は不要です。');
      return;
    }
    
    // 移行前の確認
    console.log(`\n⚠️ 確認: ${mailDocuments.length}件のドキュメントを移行します`);
    console.log('移行内容:');
    console.log('  - mailコレクション → mailsコレクション');
    console.log('  - 各ドキュメントにmigratedAt, originalMailIdフィールドを追加');
    console.log('  - 移行後、元のmailコレクションのドキュメントを削除');
    console.log('\n処理を続行します...\n');
    
    // 実際の移行処理
    await migrateToMailsCollection(mailDocuments);
    
    console.log('\n⚠️ 元のmailコレクションからドキュメントを削除します');
    await deleteOriginalMailDocuments(mailDocuments);
    
    // 移行結果の検証
    console.log('\n');
    await verifyMigration();
    
    console.log('\n🎉 移行処理が正常に完了しました！');
    console.log('これで Firebase Extensions "Trigger Email from Firestore" が正常に動作します。');
    
  } catch (error) {
    console.error('\n❌ 移行処理中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main()
  .then(() => {
    console.log('\n✅ スクリプトが正常に終了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトの実行中にエラーが発生しました:', error);
    process.exit(1);
  });

export { main as migrateMailCollection };
