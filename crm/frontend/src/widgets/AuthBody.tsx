import React, { useState } from 'react';
import { BusinessUserModel } from '../models/BusinessUsers';
import { createUserAccount, loginUser, getCurrentUser } from '../services/authService';
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

    if (!formData.email || !formData.password) {
      setIsLoading(false);
      alert('Please fill in email and password');
      return;
    }

    if (!isLogin) {
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
        const result = await loginUser(formData.email, formData.password);
        if (result.success && result.user) {
          console.log('Login successful:', result.user.emailAddress);
          const currentUser = getCurrentUser();
          if (currentUser && !currentUser.emailVerified) {
            alert('メール認証が完了していません。認証メールの再送信はプロフィール画面から実行してください。');
          }
          onAuthSuccess(result.user);
        } else {
          alert(result.error || 'ログインに失敗しました');
        }
      } else {
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
          const currentUser = getCurrentUser();
          if (currentUser) {
            try {
              await sendEmailVerification(currentUser, {
                url: 'https://narratives-crm-site.web.app/auth/verify',
                handleCodeInApp: true
              });
              console.log('Firebase verification email sent successfully');
              alert('アカウントが作成されました。認証メールを送信しました。');
            } catch (firebaseEmailError) {
              console.error('Firebase standard email failed:', firebaseEmailError);
              alert('アカウントは作成されましたが、認証メールの送信に失敗しました。');
            }
          } else {
            alert('アカウントは作成されましたが、ユーザー情報を取得できませんでした。');
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
                  <input type="text" id="lastName" name="lastName"
                    value={formData.lastName} onChange={handleInputChange}
                    required={!isLogin} placeholder="Last name" />
                </div>
                <div className="form-group">
                  <label htmlFor="lastNameKatakana">Last Name (カナ)</label>
                  <input type="text" id="lastNameKatakana" name="lastNameKatakana"
                    value={formData.lastNameKatakana} onChange={handleInputChange}
                    required={!isLogin} placeholder="セイ" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName"
                    value={formData.firstName} onChange={handleInputChange}
                    required={!isLogin} placeholder="First name" />
                </div>
                <div className="form-group">
                  <label htmlFor="firstNameKatakana">First Name (カナ)</label>
                  <input type="text" id="firstNameKatakana" name="firstNameKatakana"
                    value={formData.firstNameKatakana} onChange={handleInputChange}
                    required={!isLogin} placeholder="メイ" />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email"
              value={formData.email} onChange={handleInputChange}
              required placeholder="Enter your email" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password"
              value={formData.password} onChange={handleInputChange}
              required placeholder="Enter your password" />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleInputChange}
                required={!isLogin} placeholder="Confirm your password" />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
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
            <button type="button" className="switch-btn" onClick={toggleAuthMode}>
              {isLogin ? 'Sign In' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthBody;
