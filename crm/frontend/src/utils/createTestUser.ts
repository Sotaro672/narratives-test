import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { crmAuth, crmDb } from '../config/firebase';

export const createTestUser = async () => {
  const email = 'test@example.com';
  const password = 'password123';
  
  try {
    console.log('Creating test user:', email);
    
    // Firebase Authenticationでユーザー作成
    const userCredential = await createUserWithEmailAndPassword(crmAuth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('Firebase user created:', firebaseUser.uid);
    
    // Firestoreにbusiness_userドキュメントを作成
    const userData = {
      user_id: firebaseUser.uid,
      first_name: 'Test',
      first_name_katakana: 'テスト',
      last_name: 'User',
      last_name_katakana: 'ユーザー',
      email_address: email,
      email_verified: true,
      role: 'user',
      status: 'active',
      belong_to: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    await setDoc(doc(crmDb, 'business_users', firebaseUser.uid), userData);
    
    console.log('Test user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    
    return { success: true, email, password };
    
  } catch (error) {
    console.error('Error creating test user:', error);
    return { success: false, error };
  }
};

// ブラウザのコンソールで実行可能にするため、グローバルに追加
(window as any).createTestUser = createTestUser;
