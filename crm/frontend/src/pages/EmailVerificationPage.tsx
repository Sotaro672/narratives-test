import React, { useEffect, useState } from 'react';
import { crmAuth, crmDb } from '../config/firebase';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const EmailVerificationPage: React.FC = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('メール認証を確認しています...');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get('uid');
        const link = urlParams.get('link');
        
        if (!uid || !link) {
          setStatus('error');
          setMessage('無効な認証リンクです。uidまたはlinkパラメータがありません。');
          return;
        }

        // 認証リンクにリダイレクト
        window.location.href = link;

        // Firebase Authの状態変更を監視
        const unsubscribe = onAuthStateChanged(crmAuth, async (user) => {
          if (user && user.emailVerified) {
            try {
              // Firestoreのビジネスユーザー情報を取得
              const userDocRef = doc(crmDb, 'business_users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (!userDoc.exists()) {
                setStatus('error');
                setMessage('ユーザー情報が見つかりません。');
                return;
              }

              const userData = userDoc.data();
              
              // Firestoreのビジネスユーザー情報を更新
              await updateDoc(userDocRef, {
                email_verified: true,
                status: 'active',
                updated_at: new Date()
              });

              // 一次パスワード通知を作成（バックエンドが自動的にメール送信）
              const temporaryPasswordNotification = {
                notification_id: `tmppass_${user.uid}_${Date.now()}`,
                user_id: user.uid,
                notification_type: 'temporary_password',
                title: '一次パスワードのお知らせ',
                body: `${userData.first_name} ${userData.last_name}様の一次パスワードをお送りします。`,
                created_at: new Date(),
                is_read: false,
                read_at: null,
                processed: false,
                // メール送信用の追加データ
                user_email: userData.email_address,
                user_name: `${userData.last_name} ${userData.first_name}`,
                temporary_password: userData.temporary_password
              };

              // notificationsコレクションに通知を追加（バックエンドがウォッチして自動処理）
              await addDoc(collection(crmDb, 'notifications'), temporaryPasswordNotification);
              
              console.log('Temporary password notification created:', temporaryPasswordNotification.notification_id);

              setStatus('success');
              setMessage('メール認証が完了しました！一次パスワードをメールでお送りしました。');
              
              // 5秒後にメインページにリダイレクト
              setTimeout(() => {
                window.location.href = '/';
              }, 5000);
              
            } catch (error) {
              console.error('Error updating user verification status:', error);
              setStatus('error');
              setMessage('認証の更新に失敗しました。');
            }
          } else if (user && !user.emailVerified) {
            setStatus('error');
            setMessage('メール認証がまだ完了していません。メールを確認してください。');
          }
        });

        return () => unsubscribe();
        
      } catch (error) {
        console.error('Error during email verification:', error);
        setStatus('error');
        setMessage('認証処理中にエラーが発生しました。');
      }
    };

    handleEmailVerification();
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>認証確認中...</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>認証完了！</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
              {message}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
              5秒後にログインページに移動します...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>認証エラー</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem' }}>
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ホームページに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
