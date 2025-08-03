import React, { useState } from 'react';
import Header from '../widgets/Header';
import LeftSidebar from '../widgets/LeftSidebar';
import MainBody from '../widgets/MainBody';
import AuthBody from '../widgets/AuthBody';
import OrganizationBody from '../widgets/OrganizationBody';
import NewsField from '../widgets/NewsField';
import Customer from '../widgets/Customer';
import UserModel from '../models/Users';
import { logoutUser } from '../services/authService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { crmDb } from '../config/firebase'; // CRM Firestoreを使用
import './MainScreen.css';

const MainScreen: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 認証状態を管理
  const [showAuthBody, setShowAuthBody] = useState(false); // AuthBodyの表示状態を管理
  const [showOrganizationBody, setShowOrganizationBody] = useState(false); // OrganizationBodyの表示状態を管理
  const [showNewsBody, setShowNewsBody] = useState(false); // NewsFieldの表示状態を管理
  const [showCustomerBody, setShowCustomerBody] = useState(false); // CustomerBodyの表示状態を管理
  const [authMode, setAuthMode] = useState<'signin' | 'login'>('signin'); // 認証モードを管理
  const [currentUser, setCurrentUser] = useState<UserModel | null>(null); // ログインユーザー情報

  // ユーザー情報を再取得する関数
  const refreshCurrentUser = async () => {
    if (currentUser) {
      try {
        console.log('refreshCurrentUser called for user:', currentUser.userId);
        const userDocRef = doc(crmDb, 'users', currentUser.userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Raw user data from Firestore:', userData);
          
          // belong_toフィールドが存在しない場合は追加
          if (!userData.belong_to) {
            console.log('Adding belong_to field to user data');
            await updateDoc(userDocRef, {
              belong_to: [],
              updated_at: new Date()
            });
            
            // 更新後に再度取得
            const updatedUserDoc = await getDoc(userDocRef);
            if (updatedUserDoc.exists()) {
              const updatedUser = UserModel.fromDocument(updatedUserDoc);
              setCurrentUser(updatedUser);
              console.log('User info refreshed with belong_to field:', updatedUser);
              console.log('User belongTo after refresh:', updatedUser.belongTo);
            }
          } else {
            const updatedUser = UserModel.fromDocument(userDoc);
            setCurrentUser(updatedUser);
            console.log('User info refreshed:', updatedUser);
            console.log('User belongTo:', updatedUser.belongTo);
            console.log('belongTo type:', typeof updatedUser.belongTo);
            console.log('belongTo isArray:', Array.isArray(updatedUser.belongTo));
          }
        }
      } catch (error) {
        console.error('Error refreshing user info:', error);
      }
    }
  };

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleAuthChange = async (loginStatus: boolean) => {
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      setCurrentUser(null);
      try {
        await logoutUser();
        console.log('User logged out from Firebase');
      } catch (error) {
        console.error('Error logging out from Firebase:', error);
      }
    }
  };

  const handleShowAuth = (mode: 'signin' | 'login' = 'signin') => {
    setAuthMode(mode);
    setShowAuthBody(true);
  };

  const handleAuthSuccess = async (user?: UserModel) => {
    setIsLoggedIn(true);
    setShowAuthBody(false);
    if (user) {
      console.log('User authenticated:', user.getFullName(), user.getFullNameKatakana());
      console.log('Initial user belongTo:', user.belongTo);
      
      // まず現在のユーザー情報を設定
      setCurrentUser(user);
      
      // ログイン後すぐにユーザー情報を更新（belong_toフィールドを確認・追加）
      try {
        const userDocRef = doc(crmDb, 'users', user.userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Fresh user data after login:', userData);
          
          // belong_toフィールドが存在しない場合は追加
          if (!userData.belong_to) {
            console.log('Adding belong_to field to user data');
            await updateDoc(userDocRef, {
              belong_to: [],
              updated_at: new Date()
            });
            
            // 更新後に再度取得
            const updatedUserDoc = await getDoc(userDocRef);
            if (updatedUserDoc.exists()) {
              const updatedUser = UserModel.fromDocument(updatedUserDoc);
              setCurrentUser(updatedUser);
              console.log('User updated with belong_to field:', updatedUser);
            }
          } else {
            // 最新のユーザー情報でUserModelを作成し直す
            const freshUser = UserModel.fromDocument(userDoc);
            setCurrentUser(freshUser);
            console.log('User updated with fresh data:', freshUser);
            console.log('Fresh user belongTo:', freshUser.belongTo);
          }
        }
      } catch (error) {
        console.error('Error updating user info after login:', error);
      }
    }
  };

  const handleAuthCancel = () => {
    setShowAuthBody(false);
  };

  const handleShowOrganization = () => {
    setShowOrganizationBody(true);
    setShowNewsBody(false); // 他の画面を非表示
    setShowCustomerBody(false);
  };

  const handleShowNews = () => {
    setShowNewsBody(true);
    setShowOrganizationBody(false); // 他の画面を非表示
    setShowCustomerBody(false);
  };

  const handleShowCustomer = () => {
    setShowCustomerBody(true);
    setShowOrganizationBody(false); // 他の画面を非表示
    setShowNewsBody(false);
  };

  const handleCompanyCreated = () => {
    // 会社作成後にユーザー情報を更新
    refreshCurrentUser();
  };

  return (
    <div className="main-screen">
      <LeftSidebar 
        isOpen={isSidebarOpen} 
        onClose={handleSidebarClose} 
        onShowOrganization={handleShowOrganization}
        onShowNews={handleShowNews}
        onShowCustomer={handleShowCustomer}
        currentUser={currentUser}
      />
      
      <div className={`main-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Header 
          onMenuToggle={handleMenuToggle} 
          isSidebarOpen={isSidebarOpen}
          isLoggedIn={isLoggedIn}
          onAuthChange={handleAuthChange}
          onShowAuth={handleShowAuth}
          currentUser={currentUser}
        />
        
        {showOrganizationBody ? (
          <OrganizationBody 
            currentUser={currentUser} 
            onCompanyCreated={handleCompanyCreated}
          />
        ) : showNewsBody ? (
          <div className="news-body">
            <div className="news-container">
              <div className="news-header">
                <h2>📰 ニュース</h2>
                <p>最新のニュースと情報をお届けします</p>
              </div>
              <NewsField />
            </div>
          </div>
        ) : showCustomerBody ? (
          <div className="customer-body">
            <div className="customer-container">
              <div className="customer-header">
                <h2>👥 顧客管理</h2>
                <p>顧客情報の管理と分析</p>
              </div>
              <Customer />
            </div>
          </div>
        ) : (
          <MainBody isLoggedIn={isLoggedIn} />
        )}

        <footer className="main-footer">
          <p>&copy; 2025 Narratives CRM. Built with React + TypeScript + GraphQL + Firebase</p>
        </footer>
      </div>

      {/* AuthBody Modal */}
      {showAuthBody && (
        <AuthBody 
          onAuthSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
          initialMode={authMode}
        />
      )}
    </div>
  );
};

export default MainScreen;
