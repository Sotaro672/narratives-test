import 'dart:developer';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

Future<void> deleteAllFirestoreData() async {
  await Firebase.initializeApp();
  final db = FirebaseFirestore.instance;
  
  // 削除対象のコレクション一覧
  final collections = [
    'users',
    'avatars', 
    'wallets',
    'shipping_addresses',
    // 他にもコレクションがあれば追加
  ];
  
  for (String collectionName in collections) {
    log('Deleting collection: $collectionName');
    await deleteCollection(db, collectionName);
    log('Deleted collection: $collectionName');
  }
  
  log('All Firestore data deleted successfully!');
}

Future<void> deleteCollection(FirebaseFirestore db, String collectionName) async {
  final collection = db.collection(collectionName);
  final snapshots = await collection.get();
  
  // バッチで削除（効率的）
  WriteBatch batch = db.batch();
  int count = 0;
  
  for (QueryDocumentSnapshot doc in snapshots.docs) {
    batch.delete(doc.reference);
    count++;
    
    // Firestoreのバッチ制限は500件
    if (count >= 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  
  // 残りのドキュメントを削除
  if (count > 0) {
    await batch.commit();
  }
}

void main() async {
  await deleteAllFirestoreData();
}
