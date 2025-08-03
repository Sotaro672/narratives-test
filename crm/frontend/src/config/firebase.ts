// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// CRM専用のFirebase設定（narratives-crm）
const crmConfig = {
  apiKey: "AIzaSyCFF3Io3A_XC_ZfJCU9yQu2-8I6KvKlMWw",
  authDomain: "narratives-crm.firebaseapp.com",
  projectId: "narratives-crm",
  storageBucket: "narratives-crm.firebasestorage.app",
  messagingSenderId: "699392181476",
  appId: "1:699392181476:web:6835fb8d7a4018e09fd8f1"
};

// Firebase アプリを初期化
const app = initializeApp(crmConfig);

// CRM専用の認証とデータベース
export const auth = getAuth(app);
export const db = getFirestore(app);

// 後方互換性のためのエクスポート
export const crmAuth = auth;
export const crmDb = db;
