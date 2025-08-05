// ユーザーコレクション同期スクリプト
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyAXWj3TYhGvyFD16BNz2aF6ZkBMWw2M4M",
  authDomain: "narratives-test-64976.firebaseapp.com",
  projectId: "narratives-test-64976",
  storageBucket: "narratives-test-64976.firebasestorage.app",
  messagingSenderId: "221090465383",
  appId: "1:221090465383:web:c6e5b9f5e2b4a8b9d8a9e1"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncUserCollections() {
  try {
    console.log('🔍 Checking users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersData = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      usersData.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Found ${usersData.length} users in 'users' collection`);
    
    console.log('🔍 Checking business_users collection...');
    const businessUsersSnapshot = await getDocs(collection(db, 'business_users'));
    const businessUsersData = [];
    
    businessUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      businessUsersData.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Found ${businessUsersData.length} users in 'business_users' collection`);
    
    // users collection のデータを business_users collection にコピー
    for (const user of usersData) {
      const businessUserExists = businessUsersData.find(bu => bu.id === user.id);
      
      if (!businessUserExists) {
        console.log(`📋 Copying user ${user.id} to business_users collection`);
        try {
          await setDoc(doc(db, 'business_users', user.id), {
            user_id: user.user_id || user.id,
            email: user.email,
            user_name: user.user_name,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role || 'user',
            belong_to: user.belong_to || [],
            created_at: user.created_at || new Date(),
            updated_at: new Date(),
            email_verified: user.email_verified || false,
            status: user.status || 'active'
          });
          console.log(`✅ Successfully copied user ${user.id}`);
        } catch (error) {
          console.error(`❌ Error copying user ${user.id}:`, error);
        }
      } else {
        // 既存のbusiness_userのbelong_toフィールドを更新
        if (user.belong_to && user.belong_to.length > 0) {
          const businessUser = businessUserExists;
          const currentBelongTo = businessUser.belong_to || [];
          const shouldUpdate = JSON.stringify(currentBelongTo.sort()) !== JSON.stringify(user.belong_to.sort());
          
          if (shouldUpdate) {
            console.log(`🔄 Updating belong_to for user ${user.id}`);
            console.log(`   From: ${JSON.stringify(currentBelongTo)}`);
            console.log(`   To:   ${JSON.stringify(user.belong_to)}`);
            
            try {
              await updateDoc(doc(db, 'business_users', user.id), {
                belong_to: user.belong_to,
                role: user.role || businessUser.role || 'user',
                updated_at: new Date()
              });
              console.log(`✅ Successfully updated user ${user.id}`);
            } catch (error) {
              console.error(`❌ Error updating user ${user.id}:`, error);
            }
          }
        }
      }
    }
    
    console.log('🎉 User collections synchronization completed!');
    
    // 最終確認
    console.log('\n📊 Final verification:');
    const finalBusinessUsersSnapshot = await getDocs(collection(db, 'business_users'));
    console.log(`business_users collection now has ${finalBusinessUsersSnapshot.size} documents`);
    
    // 会社所属のユーザーを表示
    const usersWithCompanies = [];
    finalBusinessUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.belong_to && data.belong_to.length > 0) {
        usersWithCompanies.push({
          id: doc.id,
          email: data.email,
          belong_to: data.belong_to,
          role: data.role
        });
      }
    });
    
    console.log(`\n👥 Users with company associations (${usersWithCompanies.length}):`);
    usersWithCompanies.forEach(user => {
      console.log(`   ${user.email} (${user.role}) -> Companies: ${user.belong_to.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
  }
}

// スクリプト実行
syncUserCollections().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
