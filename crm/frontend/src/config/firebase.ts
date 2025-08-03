// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 統合されたNarratives Firebase設定（narratives-test-64976）
const narrativesConfig = {
  apiKey: "AIzaSyDZuEVrJs1zlkuCqcnGxVFEgqehciGrIQI",
  authDomain: "narratives-test-64976.firebaseapp.com",
  projectId: "narratives-test-64976",
  storageBucket: "narratives-test-64976.firebasestorage.app",
  messagingSenderId: "221090465383",
  appId: "1:221090465383:web:49c7e3b0009547c99576c2",
  measurementId: "G-S8WZENK6EY"
};

// Firebase アプリを初期化
const app = initializeApp(narrativesConfig);

// 統合された認証とデータベース
export const auth = getAuth(app);
export const db = getFirestore(app);

// 後方互換性のためのエクスポート
export const crmAuth = auth;
export const crmDb = db;
export const snsAuth = auth; 
export const snsDb = db;
