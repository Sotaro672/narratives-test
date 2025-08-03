// 既存ユーザーにbelongToフィールドを追加するスクリプト
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const addBelongToFieldToUser = async (userId: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // belong_toフィールドが存在しない場合のみ追加
      if (!userData.belong_to) {
        await updateDoc(userDocRef, {
          belong_to: [],
          updated_at: new Date()
        });
        
        console.log(`Added belong_to field to user ${userId}`);
        return true;
      } else {
        console.log(`User ${userId} already has belong_to field`);
        return false;
      }
    } else {
      console.error(`User ${userId} not found`);
      return false;
    }
  } catch (error) {
    console.error('Error updating user data:', error);
    return false;
  }
};

// 使用例
// addBelongToFieldToUser('3BKKcrziN4WRloBB2DHcSHizhX23');
