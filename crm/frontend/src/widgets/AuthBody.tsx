import React, { useState } from 'react';
import { BusinessUserModel } from '../models/BusinessUsers';
import { createUserAccount, loginUser } from '../services/authService';
import { AuthenticationEmailService } from '../services/authenticationEmailService';
import { getCurrentUser } from '../services/authService';
import { sendEmailVerification } from 'firebase/auth';
import './AuthBody.css';

interface AuthBodyProps {
  onAuthSuccess: (user?: BusinessUserModel) => void;
  onCancel: () => void;
  initialMode?: 'signin' | 'login';
}

const AuthBody: React.FC<AuthBodyProps> = ({ onAuthSuccess, onCancel, initialMode = 'signin' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    firstNameKatakana: '',
    lastName: '',
    lastNameKatakana: '',
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // バリデーション
    if (!formData.email || !formData.password) {
      setIsLoading(false);
      alert('Please fill in email and password');
      return;
    }

    if (!isLogin) {
      // Sign In時の追加バリデーション
      if (!formData.firstName || !formData.lastName || 
          !formData.firstNameKatakana || !formData.lastNameKatakana) {
        setIsLoading(false);
        alert('Please fill in all name fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setIsLoading(false);
        alert('Passwords do not match');
        return;
      }
    }

    try {
      if (isLogin) {
        // ログインの場合
        const result = await loginUser(formData.email, formData.password);
        
        if (result.success && result.user) {
          console.log('Login successful:', result.user.emailAddress);
          
          // メール認証が必要かチェック
          const currentUser = getCurrentUser();
          if (currentUser && !currentUser.emailVerified) {
            console.log('User email not verified:', currentUser.email);
            // 通常のサインイン時には認証メールを自動送信しない
            // 必要な場合は「メール認証を再送信」ボタンを表示して、ユーザーが自分でアクションを起こせるようにする
            alert('メール認証が完了していません。認証メールの再送信が必要な場合は、プロフィール画面から実行してください。');
          }
          
          onAuthSuccess(result.user);
        } else {
          alert(result.error || 'ログインに失敗しました');
        }
      } else {
        // サインイン（新規ユーザー作成）の場合
        const result = await createUserAccount({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          firstNameKatakana: formData.firstNameKatakana,
          lastName: formData.lastName,
          lastNameKatakana: formData.lastNameKatakana,
          role: formData.role
        });
        
        if (result.success && result.user) {
          console.log('Sign in successful:', result.user.emailAddress);
          
          // ユーザー作成成功後、Firebase標準とカスタム認証メールを送信
          try {
            const currentUser = getCurrentUser();
            console.log('Current user after signup:', currentUser ? currentUser.email : 'No user');
            console.log('Temporary password from result:', result.temporaryPassword);
            
            if (currentUser) {
              // Firebase標準の認証メールを送信
              try {
                await sendEmailVerification(currentUser, {
                  url: 'https://narratives-crm-site.web.app/auth/verify',
                  handleCodeInApp: true
                });
                console.log('Firebase standard verification email sent successfully');
              } catch (firebaseEmailError) {
                console.error('Firebase standard email failed:', firebaseEmailError);
                console.error('Firebase email error details:', {
                  code: (firebaseEmailError as any).code,
                  message: (firebaseEmailError as any).message
                });
              }
              
              // カスタム認証メールも送信
              try {
                if (result.temporaryPassword) {
                  // 一時パスワードとメールアドレスを含むカスタム認証メールを送信
                  await AuthenticationEmailService.sendAuthenticationEmailWithCredentials(
                    currentUser, 
                    true, // 初回サインアップ
                    result.temporaryPassword,
                    formData.email
                  );
                  console.log('Custom authentication email with credentials sent successfully');
                } else {
                  await AuthenticationEmailService.sendAuthenticationEmail(currentUser, true); // 初回サインアップ
                  console.log('Custom authentication email sent successfully');
                }
              } catch (customEmailError) {
                console.error('Custom email failed:', customEmailError);
                console.error('Custom email error details:', {
                  code: (customEmailError as any).code,
                  message: (customEmailError as any).message,
                  stack: (customEmailError as any).stack
                });
              }
              
              alert('アカウントが作成されました。Firebase標準メールとカスタムメールの両方の送信を試行しました。コンソールでエラーを確認してください。');
              
              // メール送信完了後にサインアウト（管理者の代理作成を防ぐため）
              try {
                await import('../services/authService').then(({ logoutUser }) => logoutUser());
                console.log('User signed out after email sending');
              } catch (signOutError) {
                console.error('Error signing out after email:', signOutError);
              }
            } else {
              console.error('No current user found after account creation');
              alert('アカウントは作成されましたが、ユーザー情報を取得できませんでした。');
            }
          } catch (emailError) {
            console.error('Failed to send authentication emails:', emailError);
            console.error('General email error details:', {
              code: (emailError as any).code,
              message: (emailError as any).message,
              stack: (emailError as any).stack
            });
            // メール送信失敗してもアカウント作成は成功しているので、警告として表示
            alert(`アカウントは作成されましたが、認証メールの送信に失敗しました。エラー: ${(emailError as any).message}`);
          }
          
          onAuthSuccess(result.user);
        } else {
          alert(result.error || 'アカウント作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('認証処理でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      firstNameKatakana: '',
      lastName: '',
      lastNameKatakana: '',
      role: 'user'
    });
  };

  return (
    <div className="auth-body">
      <div className="auth-container">
        <div className="auth-header">
          <h2>{isLogin ? 'Login' : 'Sign In'}</h2>
          <p>{isLogin ? 'Welcome back to Narratives CRM' : 'Join Narratives CRM today'}</p>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="Last name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastNameKatakana">Last Name (カナ)</label>
                  <input
                    type="text"
                    id="lastNameKatakana"
                    name="lastNameKatakana"
                    value={formData.lastNameKatakana}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="セイ"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstNameKatakana">First Name (カナ)</label>
                  <input
                    type="text"
                    id="firstNameKatakana"
                    name="firstNameKatakana"
                    value={formData.firstNameKatakana}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="メイ"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Confirm your password"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-text">
                <span className="spinner"></span>
                {isLogin ? 'Logging In...' : 'Signing In...'}
              </span>
            ) : (
              isLogin ? 'Login' : 'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-alternatives">
          <button className="social-btn google-btn">
            <span>🔍</span>
            Continue with Google
          </button>
          <button className="social-btn github-btn">
            <span>⚡</span>
            Continue with GitHub
          </button>
        </div>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button" 
              className="switch-btn"
              onClick={toggleAuthMode}
            >
              {isLogin ? 'Sign In' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthBody;
