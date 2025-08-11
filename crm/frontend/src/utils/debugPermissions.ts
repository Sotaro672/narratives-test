import { doc, getDoc } from 'firebase/firestore';
import { crmDb } from '../config/firebase';
import { getAuth } from 'firebase/auth';

export async function debugCurrentUserPermissions() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.log('DEBUG: No user logged in');
    return;
  }
  
  console.log('DEBUG: Current Firebase Auth User:', {
    uid: currentUser.uid,
    email: currentUser.email,
    emailVerified: currentUser.emailVerified
  });
  
  try {
    // unified_users コレクションから情報を取得
    const unifiedUserDoc = await getDoc(doc(crmDb, 'unified_users', currentUser.uid));
    console.log('DEBUG: Unified User Document exists:', unifiedUserDoc.exists());
    
    if (unifiedUserDoc.exists()) {
      const unifiedUserData = unifiedUserDoc.data();
      console.log('DEBUG: Unified User Data:', unifiedUserData);
      console.log('DEBUG: CRM Permission:', unifiedUserData?.permissions?.crm);
      console.log('DEBUG: SNS Permission:', unifiedUserData?.permissions?.sns);
    } else {
      console.log('DEBUG: Unified user document does not exist');
    }
    
    // business_users コレクションから情報を取得
    const businessUserDoc = await getDoc(doc(crmDb, 'business_users', currentUser.uid));
    console.log('DEBUG: Business User Document exists:', businessUserDoc.exists());
    
    if (businessUserDoc.exists()) {
      const businessUserData = businessUserDoc.data();
      console.log('DEBUG: Business User Data:', businessUserData);
      console.log('DEBUG: Business User Role:', businessUserData?.role);
      console.log('DEBUG: Business User Belong To:', businessUserData?.belong_to);
    } else {
      console.log('DEBUG: Business user document does not exist');
    }
    
    // users コレクションから情報を取得
    const userDoc = await getDoc(doc(crmDb, 'users', currentUser.uid));
    console.log('DEBUG: User Document exists:', userDoc.exists());
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('DEBUG: User Data:', userData);
      console.log('DEBUG: User Role:', userData?.role);
      console.log('DEBUG: User Belong To:', userData?.belong_to);
    } else {
      console.log('DEBUG: User document does not exist');
    }
    
  } catch (error) {
    console.error('DEBUG: Error fetching user permissions:', error);
  }
}

// Firestoreルールのテスト用関数
export async function testFirestoreRules() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.log('DEBUG: No user logged in for rules test');
    return;
  }
  
  console.log('DEBUG: Testing Firestore rules access...');
  
  try {
    // companies コレクションへの読み取りテスト
    const companiesCollection = doc(crmDb, 'companies', 'test-doc');
    await getDoc(companiesCollection);
    console.log('DEBUG: Companies collection read access: OK');
  } catch (error) {
    console.error('DEBUG: Companies collection read access: FAILED', error);
  }
  
  try {
    // wallets コレクションへの読み取りテスト
    const walletsCollection = doc(crmDb, 'wallets', 'test-doc');
    await getDoc(walletsCollection);
    console.log('DEBUG: Wallets collection read access: OK');
  } catch (error) {
    console.error('DEBUG: Wallets collection read access: FAILED', error);
  }
}
