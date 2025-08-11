import { initializeApp } from 'firebase/app';
import { getAuth, updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

// Firebase設定 (CRM設定を使用)
const firebaseConfig = {
  apiKey: "AIzaSyDZuEVrJs1zlkuCqcnGxVFEgqehciGrIQI",
  authDomain: "narratives-test-64976.firebaseapp.com",
  projectId: "narratives-test-64976",
  storageBucket: "narratives-test-64976.firebasestorage.app",
  messagingSenderId: "699392181476",
  appId: "1:699392181476:web:adc3df8e02e644bce62b91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const resetUserPassword = async () => {
  const email = 'caotailangaogang@gmail.com';
  const currentPassword = 'C2YRv7u81hmL';
  const newPassword = 'NewTemp123!';
  const userId = 'b7PVki8oXlf8ngvPZma7G7WjCYp1';

  try {
    console.log('Signing in with current password...');
    
    // 現在のパスワードでログイン
    const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
    console.log('Signed in successfully:', userCredential.user.uid);
    
    // パスワードを更新
    await updatePassword(userCredential.user, newPassword);
    console.log('Password updated successfully');
    
    // Firestoreの一時パスワードも更新
    await updateDoc(doc(db, 'business_users', userId), {
      temporary_password: newPassword,
      updated_at: new Date()
    });
    
    console.log('Firestore updated successfully');
    console.log('New login credentials:');
    console.log('Email:', email);
    console.log('Password:', newPassword);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  }
};

resetUserPassword();
