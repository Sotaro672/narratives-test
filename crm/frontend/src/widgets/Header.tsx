import React, { useState, useEffect, useRef } from 'react';
import { BusinessUserModel } from '../models/BusinessUsers';
import NotificationModel from '../models/Notifications';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { crmDb, crmAuth } from '../config/firebase'; // CRM Firestoreを使用
import PasswordChangeModal from '../components/PasswordChangeModal';
import './Header.css';
import './Notifications.css';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
  isLoggedIn: boolean;
  onAuthChange: (loginStatus: boolean) => void;
  onShowAuth: (mode?: 'signin' | 'login') => void;
  currentUser?: BusinessUserModel | null;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, isSidebarOpen, isLoggedIn, onAuthChange, onShowAuth, currentUser }) => {
  const [isAdminBarOpen, setIsAdminBarOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const adminBarRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<User | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);

  const handlePasswordChange = () => {
    setIsPasswordChangeModalOpen(true);
    setIsAdminBarOpen(false);
  };

  // ユーザーの所属会社情報を取得
  const fetchCompanyName = async (user: BusinessUserModel) => {
    console.log('fetchCompanyName called with user:', user);
    console.log('user.belongTo:', user.belongTo);
    console.log('user.belongTo type:', typeof user.belongTo);
    console.log('user.belongTo length:', user.belongTo?.length);
    console.log('user object keys:', Object.keys(user));
    
    // belongToが配列で、要素が存在するかチェック
    if (Array.isArray(user.belongTo) && user.belongTo.length > 0) {
      try {
        // 最初の所属会社の情報を取得
        const companyId = user.belongTo[0];
        console.log('Fetching company with ID:', companyId);
        console.log('Company ID type:', typeof companyId);
        
        if (!companyId || typeof companyId !== 'string') {
          console.error('Invalid company ID:', companyId);
          setCompanyName(null);
          return;
        }
        
        const companyDoc = await getDoc(doc(crmDb, 'companies', companyId));
        
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          console.log('Company data found:', companyData);
          console.log('Company name fields:', {
            company_name: companyData.company_name,
            companyName: companyData.companyName
          });
          // company_nameとcompanyNameの両方をチェック
          const displayName = companyData.company_name || companyData.companyName || null;
          setCompanyName(displayName);
          console.log('Set company name to:', displayName);
        } else {
          console.log('Company document does not exist for ID:', companyId);
          setCompanyName(null);
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setCompanyName(null);
      }
    } else {
      console.log('User has no belongTo companies or belongTo is empty');
      console.log('belongTo value:', user.belongTo);
      setCompanyName(null);
    }
  };

  // ユーザー情報が変更されたときに会社名を取得
  useEffect(() => {
    console.log('Header useEffect - isLoggedIn:', isLoggedIn);
    console.log('Header useEffect - currentUser:', currentUser);
    console.log('Header useEffect - currentUser ID:', currentUser?.userId);
    console.log('Header useEffect - currentUser belongTo:', currentUser?.belongTo);
    
    if (isLoggedIn && currentUser) {
      fetchCompanyName(currentUser);
    } else {
      setCompanyName(null);
    }
  }, [isLoggedIn, currentUser]);

  // Firebase認証状態を監視
  useEffect(() => {
    console.log('Setting up Firebase Auth state listener...');
    const unsubscribe = onAuthStateChanged(crmAuth, (user) => {
      console.log('Firebase Auth state changed in Header:', user?.uid || 'null');
      console.log('Firebase Auth user email:', user?.email);
      setFirebaseAuthUser(user);
      setFirebaseAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleUserNameClick = () => {
    setIsAdminBarOpen(!isAdminBarOpen);
  };

  const handleSignIn = () => {
    setIsAdminBarOpen(false);
    onShowAuth('signin');
  };

  const handleLogin = () => {
    setIsAdminBarOpen(false);
    onShowAuth('login');
  };

  const handleLogout = () => {
    onAuthChange(false);
    setIsAdminBarOpen(false);
  };

  // adminbarの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminBarRef.current && !adminBarRef.current.contains(event.target as Node)) {
        setIsAdminBarOpen(false);
      }
    };

    if (isAdminBarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminBarOpen]);

  // ユーザーの通知を取得
  const fetchNotifications = (userId: string) => {
    console.log('Fetching notifications for user ID:', userId);
    
    // クエリを修正 - フィールドパスを明示的に指定し、厳密な等価性を確保
    const notificationsQuery = query(
      collection(crmDb, 'notifications'),
      where('user_id', '==', userId)
      // created_atでのソートは一時的に無効化
    );

    console.log('Notifications query created for user_id:', userId);

    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
      console.log('Notifications snapshot received, docs count:', querySnapshot.size);
      console.log('Notifications snapshot empty?:', querySnapshot.empty);
      
      if (querySnapshot.empty) {
        console.log('No notifications found for user:', userId);
      }
      
      querySnapshot.docs.forEach(doc => {
        console.log('Document found with ID:', doc.id);
        console.log('Document data:', JSON.stringify(doc.data()));
      });
      
      const notificationsList: NotificationModel[] = [];
      let unread = 0;
      
      querySnapshot.forEach((doc) => {
        console.log('Processing notification doc ID:', doc.id);
        const data = doc.data();
        console.log('Raw notification data:', JSON.stringify(data));
        
        try {
          // Firestoreからのデータを直接マッピング
          const mappedData = {
            notificationId: data.notification_id || doc.id,
            userId: data.user_id,
            inquiryId: data.inquiry_id,
            notificationType: data.notification_type,
            title: data.title || '',
            body: data.body || '',
            isRead: data.is_read === true,
            createdAt: data.created_at ? 
                      (typeof data.created_at.toDate === 'function' ? data.created_at.toDate() : new Date(data.created_at)) : 
                      new Date(),
            readAt: data.read_at ? 
                   (typeof data.read_at.toDate === 'function' ? data.read_at.toDate() : new Date(data.read_at)) : 
                   null
          };
          
          console.log('Mapped notification data:', mappedData);
          
          const notification = new NotificationModel({
            notificationId: mappedData.notificationId,
            userId: mappedData.userId,
            inquiryId: mappedData.inquiryId,
            notificationType: mappedData.notificationType,
            title: mappedData.title,
            body: mappedData.body,
            isRead: mappedData.isRead,
            createdAt: mappedData.createdAt,
            readAt: mappedData.readAt,
          });
          
          console.log('Created notification model:', notification);
          notificationsList.push(notification);
          
          if (!notification.isRead) {
            unread++;
          }
        } catch (error) {
          console.error('Error creating notification model:', error);
          console.error('Problematic data:', data);
        }
      });
      
      console.log('Final notifications list length:', notificationsList.length);
      console.log('Final unread count:', unread);
      
      // リストが空でも空の配列を設定する（重要）
      setNotifications(notificationsList);
      setUnreadCount(unread);
    }, (error) => {
      console.error('Error in notifications listener:', error);
      // ネットワークエラーやQUICプロトコルエラーの場合は、空の通知リストを設定
      if (error.code === 'unavailable' || error.message?.includes('QUIC')) {
        console.warn('Network connectivity issue, setting empty notifications list');
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return unsubscribe;
  };
  
  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    // 通知メニューを開いたら管理バーを閉じる
    if (!isNotificationsOpen) {
      setIsAdminBarOpen(false);
    }
  };

  // 通知メニューの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // ユーザーがログインしたら通知を取得（Firebase認証状態を確認）
  useEffect(() => {
    let notificationsUnsubscribe: (() => void) | null = null;
    
    // Firebase認証が準備完了かつユーザーがログインしている場合のみ通知を取得
    if (firebaseAuthReady && isLoggedIn && currentUser && currentUser.userId && firebaseAuthUser) {
      console.log('===== User logged in and Firebase Auth ready, setting up notifications listener =====');
      console.log('Current user object:', currentUser);
      console.log('Current user ID:', currentUser.userId);
      console.log('Firebase Auth user ID:', firebaseAuthUser.uid);
      console.log('Firebase Auth user email:', firebaseAuthUser.email);
      
      // ユーザーIDが有効な文字列であることを確認
      if (typeof currentUser.userId === 'string' && currentUser.userId.trim() !== '') {
        notificationsUnsubscribe = fetchNotifications(currentUser.userId);
        console.log('Notifications listener set up for user:', currentUser.userId);
      } else {
        console.error('Invalid user ID for notifications:', currentUser.userId);
      }
    } else {
      console.log('Waiting for Firebase Auth or user not logged in');
      console.log('firebaseAuthReady:', firebaseAuthReady);
      console.log('isLoggedIn:', isLoggedIn);
      console.log('currentUser:', currentUser);
      console.log('firebaseAuthUser:', firebaseAuthUser?.uid || 'null');
    }
    
    return () => {
      if (notificationsUnsubscribe) {
        console.log('Cleaning up notifications listener');
        notificationsUnsubscribe();
      }
    };
  }, [isLoggedIn, currentUser, firebaseAuthReady, firebaseAuthUser]);

  return (
    <>
      <header className="header">
        <div className="header-left">
        <button 
          className={`menu-toggle ${isSidebarOpen ? 'active' : ''}`}
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="logo-section">
          <h1 className="logo-title">
            {isLoggedIn && companyName ? companyName : "Your Company Name"}
          </h1>
          <span className="logo-subtitle">Narratives CRM</span>
        </div>
      </div>

      <div className="header-center">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search customers, orders, interactions..." 
            className="search-input"
          />
          <button className="search-btn" aria-label="Search">
            🔍
          </button>
        </div>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <div className="notification-container" ref={notificationsRef}>
            <button 
              className="action-btn notification-btn" 
              title="Notifications"
              onClick={toggleNotifications}
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>通知 ({notifications.length})</h3>
                </div>
                <div className="notifications-content">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">
                      <p>新しい通知はありません</p>
                      {isLoggedIn && currentUser && (
                        <p className="debug-info">
                          ユーザーID: {currentUser.userId}<br/>
                          通知クエリステータス: {notifications !== null ? "実行済み" : "未実行"}<br/>
                          Firestore接続: {crmDb ? "成功" : "失敗"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="notifications-list">
                      {notifications.map((notification, index) => {
                        try {
                          console.log(`Rendering notification ${index}:`, notification);
                          const details = notification.getDetailedInfo();
                          console.log(`Notification ${index} details:`, details);
                          
                          return (
                            <div 
                              key={notification.notificationId || index} 
                              className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                            >
                              <div className="notification-icon">
                                {details.icon}
                              </div>
                              <div className="notification-content">
                                <div className="notification-header">
                                  <span className="notification-title">{notification.title}</span>
                                  <span className="notification-time">{details.timeAgo}</span>
                                </div>
                                <div className="notification-body">
                                  {notification.body.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                  ))}
                                </div>
                                <div className="notification-footer">
                                  <span className={`notification-type ${details.isUrgent ? 'urgent' : ''}`}>
                                    {details.typeDisplayName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        } catch (error) {
                          console.error(`Error rendering notification ${index}:`, error);
                          return (
                            <div key={`error-${index}`} className="notification-error">
                              通知の表示中にエラーが発生しました
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button className="action-btn settings-btn" title="Settings">
            ⚙️
          </button>
          
          <div className="user-profile" onClick={handleUserNameClick} ref={adminBarRef}>
            <img 
              src={isLoggedIn 
                ? "https://placehold.co/32x32/4F46E5/white?text=U" 
                : "https://placehold.co/32x32/666666/white?text=?"
              } 
              alt="User Avatar" 
              className="user-avatar"
            />
            <span className="user-name">
              {isLoggedIn && currentUser 
                ? `${currentUser.getFullName()} (${currentUser.getRoleDisplayName()})` 
                : "Guest"
              }
            </span>
            <button className="dropdown-arrow">▼</button>
            
            {/* Admin Bar */}
            {isAdminBarOpen && (
              <div className="admin-bar">
                <div className="admin-menu">
                  <div className="admin-header">
                    <h3>{isLoggedIn ? "Admin Panel" : "Authentication"}</h3>
                    {isLoggedIn && currentUser && (
                      <div className="user-role-info">
                        <p className="role-name">{currentUser.getRoleDisplayName()}</p>
                        <p className="role-description">{currentUser.getRoleDescription()}</p>
                        <div className="permissions-list">
                          <span>権限: </span>
                          {currentUser.getPermissions().join(', ') || 'なし'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="admin-content">
                    {isLoggedIn ? (
                      // ログイン済みの場合の管理メニュー
                      <>
                        <button className="admin-btn password" onClick={handlePasswordChange}>
                          🔑 パスワード変更
                        </button>
                        <button className="admin-btn logout" onClick={handleLogout}>Logout</button>
                      </>
                    ) : (
                      // ログアウト状態の場合の認証メニュー
                      <>
                        <button className="admin-btn login" onClick={handleSignIn}>Sign In</button>
                        <button className="admin-btn login" onClick={handleLogin}>Login</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    
    {/* パスワード変更モーダル */}
    <PasswordChangeModal
      isOpen={isPasswordChangeModalOpen}
      onClose={() => setIsPasswordChangeModalOpen(false)}
    />
    </>
  );
};

export default Header;
