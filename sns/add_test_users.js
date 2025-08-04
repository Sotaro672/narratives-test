import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "narratives-test-64976"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestUsers() {
  try {
    // 曹太朗ユーザーを追加
    await addDoc(collection(db, "users"), {
      user_id: "caotarou_001",
      first_name: "太朗",
      last_name: "曹",
      email_address: "cao.tarou@narratives-test.com",
      role: "admin",
      created_at: new Date(),
      updated_at: new Date()
    });

    // 他のテストユーザーも追加
    await addDoc(collection(db, "users"), {
      user_id: "user_002",
      first_name: "花子",
      last_name: "佐藤", 
      email_address: "sato.hanako@example.com",
      role: "user",
      created_at: new Date(),
      updated_at: new Date()
    });

    await addDoc(collection(db, "users"), {
      user_id: "user_003",
      first_name: "次郎",
      last_name: "田中",
      email_address: "tanaka.jiro@example.com", 
      role: "user",
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log("Test users added successfully!");
  } catch (error) {
    console.error("Error adding test users: ", error);
  }
}

addTestUsers();
