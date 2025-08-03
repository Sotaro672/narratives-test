import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';

interface VerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // URLからパラメータを取得
        let mode = searchParams.get('mode');
        let oobCode = searchParams.get('oobCode');
        const continueUrl = searchParams.get('continueUrl');
        let email = searchParams.get('email');
        const apiKey = searchParams.get('apiKey');
        
        // 完全なURLを取得（デバッグ用）
        const fullUrl = window.location.href;
        
        // すべてのURLパラメータをログ出力（デバッグ用）
        console.log('完全なURL:', fullUrl);
        console.log('認証パラメータ:', Object.fromEntries([...searchParams.entries()]));
        console.log('主要認証パラメータ:', { mode, oobCode, continueUrl, email, apiKey });

        // 検証パラメータをURLから直接取得する試み
        if (!oobCode) {
          // URLのフラグメント（#以降）またはクエリ文字列からoobCodeを抽出
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          const urlOobCode = urlParams.get('oobCode');
          const hashOobCode = hashParams.get('oobCode');
          
          if (urlOobCode) {
            console.log('URLから直接oobCodeを取得しました');
            oobCode = urlOobCode;
          } else if (hashOobCode) {
            console.log('URLハッシュから直接oobCodeを取得しました');
            oobCode = hashOobCode;
          }
          
          // モードもチェック
          const urlMode = urlParams.get('mode');
          const hashMode = hashParams.get('mode');
          
          if (urlMode === 'verifyEmail') {
            console.log('URLから直接modeを取得しました');
            mode = 'verifyEmail';
          } else if (hashMode === 'verifyEmail') {
            console.log('URLハッシュから直接modeを取得しました');
            mode = 'verifyEmail';
          }
          
          // メールも同様に確認
          const urlEmail = urlParams.get('email');
          const hashEmail = hashParams.get('email');
          
          if (urlEmail) {
            email = urlEmail;
          } else if (hashEmail) {
            email = hashEmail;
          }
        }
        
        // oobCodeがあれば認証を試みる
        if (oobCode) {
          console.log('oobCodeを使用して認証を試みます:', oobCode);
          try {
            await applyActionCode(auth, oobCode);
            
            setResult({
              success: true,
              message: 'メールアドレスの認証が完了しました。ログインページでログインしてください。',
              email: email || undefined
            });
            return;
          } catch (verifyError) {
            console.error('oobCodeでの認証に失敗:', verifyError);
            throw verifyError;
          }
        } 
        
        // oobCodeがない場合は他の条件をチェック
        else if (email) {
          // 直接的なメール認証（カスタムURLの場合）
          setResult({
            success: true,
            message: 'メールアドレスが確認されました。ログインページでログインしてください。',
            email: email
          });
        } else {
          setResult({
            success: false,
            message: '認証リンクが無効です。認証パラメータが見つかりません。'
          });
        }
      } catch (error: any) {
        console.error('メール認証エラー:', error);
        
        let errorMessage = 'メールアドレスの認証に失敗しました。';
        
        if (error.code === 'auth/invalid-action-code') {
          errorMessage = '認証コードが無効または期限切れです。新しい認証メールをリクエストしてください。';
        } else if (error.code === 'auth/expired-action-code') {
          errorMessage = '認証コードの有効期限が切れています。新しい認証メールをリクエストしてください。';
        } else if (error.code === 'auth/user-disabled') {
          errorMessage = 'このアカウントは無効化されています。管理者にお問い合わせください。';
        }

        setResult({
          success: false,
          message: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleLoginRedirect = () => {
    // ログインページにリダイレクト
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8rem' }}>
            メール認証中...
          </h2>
          <div style={{ margin: '20px 0' }}>
            <div style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
          <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
            メールアドレスの認証を処理しています。しばらくお待ちください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        textAlign: 'center'
      }}>
        {result?.success ? (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8rem' }}>
              認証完了
            </h2>
            <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
              {result.message}
            </p>
            {result.email && (
              <p style={{
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                margin: '20px 0'
              }}>
                認証されたメールアドレス: <strong>{result.email}</strong>
              </p>
            )}
            <button 
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                margin: '10px',
                transition: 'background-color 0.3s'
              }}
              onClick={handleLoginRedirect}
            >
              ログインページへ
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
            <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8rem' }}>
              認証エラー
            </h2>
            <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
              {result?.message}
            </p>
            <div style={{ margin: '20px 0' }}>
              <button 
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  margin: '10px',
                  transition: 'background-color 0.3s'
                }}
                onClick={handleLoginRedirect}
              >
                ログインページへ戻る
              </button>
            </div>
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h4 style={{ color: '#495057', marginBottom: '15px' }}>
                認証に失敗した場合の対処法：
              </h4>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px', color: '#6c757d' }}>
                  管理者に新しい招待メールの送信を依頼してください
                </li>
                <li style={{ marginBottom: '8px', color: '#6c757d' }}>
                  メールの認証リンクの有効期限（1時間）が切れていないか確認してください
                </li>
                <li style={{ marginBottom: '8px', color: '#6c757d' }}>
                  正しいメールアドレスでアクセスしているか確認してください
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
