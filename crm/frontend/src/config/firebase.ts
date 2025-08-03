// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// CRM管理用のFirebase設定（narratives-crm）
const crmConfig = {
  apiKey: "AIzaSyCFF3Io3A_XC_ZfJCU9yQu2-8I6KvKlMWw",
  authDomain: "narratives-crm.firebaseapp.com",
  projectId: "narratives-crm",
  storageBucket: "narratives-crm.firebasestorage.app",
  messagingSenderId: "699392181476",
  appId: "1:699392181476:web:6835fb8d7a4018e09fd8f1"
};

// SNSプラットフォーム用のFirebase設定（narratives-test）
const snsConfig = {
  apiKey: "AIzaSyDZuEVrJs1zlkuCqcnGxVFEgqehciGrIQI",
  authDomain: "narratives-test-64976.firebaseapp.com",
  projectId: "narratives-test-64976",
  storageBucket: "narratives-test-64976.firebasestorage.app",
  messagingSenderId: "221090465383",
  appId: "1:221090465383:web:49c7e3b0009547c99576c2",
  measurementId: "G-S8WZENK6EY"
};

// 両方のFirebaseアプリを初期化
const crmApp = initializeApp(crmConfig, "crm");
const snsApp = initializeApp(snsConfig, "sns");

// CRM用認証（narratives-crm プロジェクト）
export const crmAuth = getAuth(crmApp);
export const crmDb = getFirestore(crmApp);

// SNS用認証（narratives-test プロジェクト）
export const snsAuth = getAuth(snsApp);
export const snsDb = getFirestore(snsApp);

// 後方互換性のため、デフォルトでSNS認証を使用
export const auth = snsAuth;
export const db = snsDb;
