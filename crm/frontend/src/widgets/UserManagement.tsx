import React, { useEffect, useState } from 'react';
import { crmAuth } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { AuthenticationEmailService } from '../services/authenticationEmailService';
import './UserManagement.css';

// CRM Backend API エンドポイント（新しいCloud Runサービス）
const CRM_API_BASE_URL = 'https://narratives-crm-backend-221090465383.asia-northeast1.run.app';

// Development proxy endpoint (for local testing only)
const isDevelopment = import.meta.env?.DEV || false;

// Production: CRM Backend base URL (GraphQL endpoint is at /graphql)
const API_BASE_URL = CRM_API_BASE_URL;

// GraphQL スキーマ調査用クエリ
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType {
        name
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

// GraphQL クエリ定義 - usersとwalletsテーブルを取得
const GET_USERS_AND_WALLETS_QUERY = `
  query GetUsersAndWallets {
    users(pagination: {limit: 10}) {
      users {
        user_id
        first_name
        last_name
        first_name_katakana
        last_name_katakana
        email_address
        role
        balance
        status
        created_at
        updated_at
      }
      pageInfo {
        page
        limit
        total
        pages
        hasNext
        hasPrev
      }
    }
    wallets(pagination: {limit: 10}) {
      wallets {
        wallet_address
        user_id
        balance
        currency
        status
        created_at
        updated_at
      }
      pageInfo {
        page
        limit
        total
        pages
        hasNext
        hasPrev
      }
    }
  }
`;

// GraphQL リクエスト関数
const executeGraphQLQuery = async (query: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  
  return result.data;
};

// スキーマ調査関数
const investigateSchema = async (token: string) => {
  try {
    console.log('🔍 Investigating GraphQL schema...');
    const schemaData = await executeGraphQLQuery(INTROSPECTION_QUERY, token);
    console.log('📊 GraphQL Schema Investigation Results:');
    console.log('Available Query fields:', schemaData.__schema.queryType.fields.map((field: any) => ({
      name: field.name,
      type: field.type.name || field.type.kind
    })));
    return schemaData.__schema.queryType.fields;
  } catch (error) {
    console.error('❌ Schema investigation failed:', error);
    return null;
  }
};

interface UserData {
  user_id: string;
  first_name?: string;
  last_name?: string;
  first_name_katakana?: string;
  last_name_katakana?: string;
  email_address?: string;
  role?: string;
  balance?: number;
  status?: string;
  created_at?: any;
  updated_at?: any;
}

interface WalletData {
  wallet_address: string;
  user_id?: string;
  balance?: number;
  currency?: string;
  status?: string;
  created_at?: any;
  updated_at?: any;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(false);
  const [crmAuthUser, setCrmAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  // 認証状態の監視（CRM認証のみ）
  useEffect(() => {
    console.log('Setting up CRM authentication listener...');
    
    // CRM認証状態の監視
    const unsubscribeCrm = onAuthStateChanged(crmAuth, (user) => {
      console.log('CRM Auth state changed:', user?.uid || 'null');
      setCrmAuthUser(user);
      setAuthLoading(false); // CRM認証完了後にローディング終了
    }, (error) => {
      console.warn('CRM Auth error:', error);
      setAuthLoading(false); // エラーが発生してもローディングを終了
    });

    return () => {
      unsubscribeCrm();
    };
  }, []);

  // 業務ユーザーとしてCRMにログイン
  const signInAsCrmUser = async () => {
    if (!loginEmail || !loginPassword) {
      alert('メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      console.log('Attempting CRM user sign in...');
      const result = await signInWithEmailAndPassword(crmAuth, loginEmail, loginPassword);
      console.log('CRM user sign in successful:', result.user.email);
      
      // メール認証が必要かチェック
      if (AuthenticationEmailService.requiresEmailVerification(result.user)) {
        console.log('Email verification required for user:', result.user.email);
        
        try {
          // 認証メールを送信
          await AuthenticationEmailService.sendAuthenticationEmail(result.user, false);
          
          // ユーザーに認証メール送信を通知
          alert(`認証メールを ${result.user.email} に送信しました。メールを確認して認証を完了してください。`);
          
          // 認証完了まで機能制限を表示
          setShowLoginForm(false);
          return;
          
        } catch (emailError) {
          console.error('Failed to send authentication email:', emailError);
          alert('認証メールの送信に失敗しました。管理者にお問い合わせください。');
          return;
        }
      }
      
      // メール認証済みの場合、通常のログイン処理を続行
      console.log('Email verification completed, proceeding with normal login...');
      
      setShowLoginForm(false);
      setLoginEmail('');
      setLoginPassword('');
      
    } catch (error: any) {
      console.error('CRM sign in error:', error);
      let errorMessage = 'ログインに失敗しました。';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'このメールアドレスは登録されていません。';
          break;
        case 'auth/wrong-password':
          errorMessage = 'パスワードが間違っています。';
          break;
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません。';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。';
          break;
        case 'auth/email-not-verified':
          errorMessage = 'メールアドレスが認証されていません。認証メールを確認してください。';
          break;
        default:
          errorMessage = `ログインエラー: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 認証メール再送信
  const resendAuthenticationEmail = async () => {
    if (!crmAuthUser) {
      alert('ログインしてから認証メールを再送信してください。');
      return;
    }

    try {
      console.log('Resending authentication email for user:', crmAuthUser.email);
      await AuthenticationEmailService.resendAuthenticationEmail(crmAuthUser);
      alert(`認証メールを ${crmAuthUser.email} に再送信しました。メールをご確認ください。`);
    } catch (error) {
      console.error('Failed to resend authentication email:', error);
      alert('認証メールの再送信に失敗しました。管理者にお問い合わせください。');
    }
  };

  // ログアウト（CRM認証のみ）
  const handleSignOut = async () => {
    try {
      await signOut(crmAuth);
      console.log('Signed out from CRM successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // ユーザー詳細表示（user_idでウォレットと結合）
  const handleViewDetails = (user: UserData) => {
    const userWallet = wallets.find(wallet => wallet.user_id === user.user_id);
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim() || 'Unknown';
    
    // ユーザーとウォレット情報を結合して表示
    const detailsInfo = `${fullName} さんのプロフィール詳細

📧 メール: ${user.email_address || '未設定'}
👤 役割: ${user.role || '未設定'}
💰 残高（ユーザー）: ${user.balance || 0}
📊 ステータス: ${user.status || 'active'}

💳 ウォレット情報:
${userWallet ? `
- ウォレットアドレス: ${userWallet.wallet_address || '未設定'}
- 残高: ${userWallet.balance || 0} ${userWallet.currency || 'JPY'}
- ステータス: ${userWallet.status || 'active'}
- 作成日: ${userWallet.created_at ? new Date(userWallet.created_at).toLocaleDateString() : '不明'}
` : '- ウォレットが見つかりません'}

📅 アカウント情報:
- 作成日: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : '不明'}
- 更新日: ${user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '不明'}`;
    
    console.log('Viewing details for user:', user);
    console.log('Associated wallet:', userWallet);
    alert(detailsInfo);
  };

  // API接続テスト（CORS診断を含む）
  const testApiConnection = async () => {
    try {
      if (!crmAuthUser) {
        alert('CRM認証が必要です');
        return;
      }
      
      console.log('=== CORS診断開始 ===');
      console.log('Development mode:', isDevelopment);
      console.log('Frontend Origin:', window.location.origin);
      console.log('Direct API URL:', CRM_API_BASE_URL);
      console.log('Using API URL:', API_BASE_URL);
      console.log('CRM Auth User:', crmAuthUser?.uid || 'null');
      
      // 1. まずOPTIONSリクエスト（preflight）を手動で送信してCORSヘッダーを確認
      console.log('1. Testing CORS preflight (OPTIONS request)...');
      try {
        const preflightResponse = await fetch(`${API_BASE_URL}/graphql`, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Authorization, Content-Type',
          },
        });
        
        console.log('Preflight response status:', preflightResponse.status);
        console.log('Preflight response headers:', Object.fromEntries(preflightResponse.headers.entries()));
        
        const allowOrigin = preflightResponse.headers.get('Access-Control-Allow-Origin');
        const allowMethods = preflightResponse.headers.get('Access-Control-Allow-Methods');
        const allowHeaders = preflightResponse.headers.get('Access-Control-Allow-Headers');
        
        console.log('CORS Analysis:');
        console.log('- Access-Control-Allow-Origin:', allowOrigin);
        console.log('- Access-Control-Allow-Methods:', allowMethods);
        console.log('- Access-Control-Allow-Headers:', allowHeaders);
        
        if (!allowOrigin) {
          console.error('❌ CORS Error: No Access-Control-Allow-Origin header');
        } else if (allowOrigin !== '*' && allowOrigin !== window.location.origin) {
          console.error('❌ CORS Error: Origin not allowed. Expected:', window.location.origin, 'Got:', allowOrigin);
        } else {
          console.log('✅ CORS Origin check passed');
        }
        
      } catch (preflightError) {
        console.error('Preflight request failed:', preflightError);
      }
      
      // 2. 認証なしでhealth checkを試す
      console.log('2. Testing health endpoint without auth...');
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Health check response status:', healthResponse.status);
        console.log('Health check response headers:', Object.fromEntries(healthResponse.headers.entries()));
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.text();
          console.log('✅ Health check success:', healthData);
        } else {
          console.log('❌ Health check failed:', healthResponse.statusText);
        }
      } catch (healthError) {
        console.error('❌ Health check error:', healthError);
        console.error('Health error type:', healthError instanceof Error ? healthError.name : 'Unknown');
        console.error('Health error message:', healthError instanceof Error ? healthError.message : String(healthError));
      }
      
      // 3. CRM認証トークンでGraphQL APIテスト
      console.log('3. Testing authenticated GraphQL API request with CRM token...');
      if (!crmAuthUser) {
        console.error('CRM user not authenticated');
        return;
      }
      const crmIdToken = await crmAuthUser.getIdToken();
      console.log('Got CRM ID token, length:', crmIdToken.length);
      
      const response = await fetch(`${API_BASE_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${crmIdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: '{ __schema { queryType { name } } }' 
        })
      });
      
      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API request success:', data);
        alert(`API接続成功！\nレスポンス: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        console.log('❌ API request failed:', errorText);
        alert(`API接続エラー: ${response.status} ${response.statusText}\nレスポンス: ${errorText}`);
      }
      
      console.log('=== CORS診断完了 ===');
      
    } catch (error) {
      console.error('❌ API接続エラー:', error);
      console.error('Error type:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      alert(`API接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}\n詳細をコンソールで確認してください`);
    }
  };

  // ユーザーデータを取得（narratives-test GraphQL APIのusersテーブルから）
  const fetchUsers = async () => {
    console.log('fetchUsers called');
    console.log('CRM Auth User:', crmAuthUser?.uid || 'null');
    
    if (!crmAuthUser) {
      console.warn('No CRM authenticated user, skipping fetch');
      alert('CRM認証が必要です。ログインしてください。');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Starting to fetch from CRM GraphQL API...');
      console.log('API base URL:', CRM_API_BASE_URL);
      console.log('Using CRM authenticated user:', crmAuthUser?.uid);
      
      // CRM認証トークンを取得
      console.log('Getting CRM ID token...');
      if (!crmAuthUser) {
        throw new Error('CRM user not authenticated');
      }
      const crmIdToken = await crmAuthUser.getIdToken();
      console.log('CRM ID token obtained, length:', crmIdToken.length);
      
      // まずスキーマを調査
      console.log('🔍 First, let\'s investigate the available GraphQL schema...');
      const schemaFields = await investigateSchema(crmIdToken);
      
      if (!schemaFields) {
        throw new Error('Unable to investigate GraphQL schema');
      }
      
      // 利用可能なフィールドを確認
      const availableFields = schemaFields.map((field: any) => field.name);
      console.log('Available GraphQL fields:', availableFields);
      
      // usersフィールドが存在するかチェック
      if (!availableFields.includes('users')) {
        console.warn('⚠️ "users" field not found in schema. Available fields:', availableFields);
        
        // 利用可能なフィールドでusersまたはwalletsが見つからない場合のみエラー表示
        if (!availableFields.includes('users') && !availableFields.includes('wallets')) {
          // 代替フィールドを探す
          const userRelatedFields = availableFields.filter((field: string) => 
            field.toLowerCase().includes('user') || 
            field.toLowerCase().includes('wallet') ||
            field.toLowerCase().includes('account')
          );
          
          // 利用可能なフィールドの詳細を表示
          console.log('📋 Current GraphQL schema analysis:');
          console.log('- Available fields:', availableFields);
          console.log('- User-related fields:', userRelatedFields);
          
          // ユーザーに適切なメッセージを表示
          const schemaInfo = `現在のAPIにはusersまたはwalletsフィールドが見つかりません。

利用可能なフィールド:
${availableFields.map((field: string) => `• ${field}`).join('\n')}

ユーザー・ウォレット管理機能を使用するには、適切なAPIエンドポイントが必要です。`;
          
          alert(schemaInfo);
          
          // 空のユーザーリストを設定（エラーではなく、単にデータが無いことを示す）
          setUsers([]);
          setWallets([]);
          console.log('ℹ️ Set empty user list due to schema limitations');
          return;
        }
      }
      
      // GraphQL クエリでusersとwalletsデータを一度に取得
      console.log('✅ "users" field found! Fetching users and wallets via GraphQL...');
      const combinedData = await executeGraphQLQuery(GET_USERS_AND_WALLETS_QUERY, crmIdToken);
      console.log('Combined GraphQL response:', combinedData);
      
      // usersデータを処理 (UserConnectionからusersフィールドを取得)
      const usersList: UserData[] = Array.isArray(combinedData.users?.users) ? combinedData.users.users.map((user: any) => ({
        user_id: user.user_id || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        first_name_katakana: user.first_name_katakana || '',
        last_name_katakana: user.last_name_katakana || '',
        email_address: user.email_address || '',
        role: user.role || '',
        balance: user.balance || 0,
        status: user.status || 'active',
        created_at: user.created_at || null,
        updated_at: user.updated_at || null
      })) : [];
      
      console.log('Users list processed:', usersList.length, 'users');

      // walletsデータを処理 (WalletConnectionからwalletsフィールドを取得)
      const walletsList: WalletData[] = Array.isArray(combinedData.wallets?.wallets) ? combinedData.wallets.wallets.map((wallet: any) => ({
        wallet_address: wallet.wallet_address || '',
        user_id: wallet.user_id || '',
        balance: wallet.balance || 0,
        currency: wallet.currency || 'JPY',
        status: wallet.status || 'active',
        created_at: wallet.created_at || null,
        updated_at: wallet.updated_at || null
      })) : [];
      
      console.log('Wallets list processed:', walletsList.length, 'wallets');

      // usersとwalletsデータを設定
      setUsers(usersList);
      setWallets(walletsList);
      console.log('Fetch completed successfully. Total users:', usersList.length);
    } catch (error) {
      console.error('Error fetching users from CRM API:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code || 'No code',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown name'
      });
      alert(`ユーザー情報の取得に失敗しました\nエラー: ${error instanceof Error ? error.message : 'Unknown error'}\n詳細をコンソールで確認してください`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && crmAuthUser) {
      fetchUsers();
    }
  }, [crmAuthUser, authLoading]);

  return (
    <div className="user-container">
      <div className="user-header">
        <h2>ウォレット管理システム</h2>
        <p>業務ユーザーとしてログインし、narratives-test API ({CRM_API_BASE_URL}) へ接続できます</p>
        <p>🔸 narratives-crm: 業務ユーザー用認証 | 🔸 narratives-test: ユーザー・ウォレット管理API</p>
        <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', marginTop: '10px', fontSize: '14px' }}>
          <strong>📋 現在の状況:</strong> CRM認証でユーザーとウォレット情報を管理します。
        </div>
      </div>

      {authLoading ? (
        <div className="loading-state">
          <p>認証状態を確認中...</p>
        </div>
      ) : !crmAuthUser ? (
        <div className="no-auth">
          <p>この機能を使用するには業務ユーザーとしてログインが必要です。</p>
          <p>CRM認証: {crmAuthUser ? '✅' : '❌'}</p>
          
          {!showLoginForm ? (
            <div style={{ marginTop: '20px' }}>
              <button onClick={() => setShowLoginForm(true)} className="auth-btn">
                👤 業務ユーザーログイン
              </button>
            </div>
          ) : (
            <div className="login-form" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
              <h3>業務ユーザーログイン</h3>
              <div style={{ marginBottom: '10px' }}>
                <label>メールアドレス:</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="your-email@company.com"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>パスワード:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="パスワード"
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div>
                <button onClick={signInAsCrmUser} className="auth-btn">
                  ログイン
                </button>
                <button onClick={() => setShowLoginForm(false)} className="auth-btn" style={{ marginLeft: '10px', backgroundColor: '#ccc' }}>
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="user-info" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <p><strong>業務ユーザー:</strong> {crmAuthUser ? `✅ ${crmAuthUser.email || crmAuthUser.uid}` : '❌ 未認証'}</p>
            
            {/* メール認証状態の表示 */}
            {crmAuthUser && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: AuthenticationEmailService.isUserEmailVerified(crmAuthUser) ? '#d4edda' : '#f8d7da', borderRadius: '5px' }}>
                <p><strong>メール認証:</strong> {AuthenticationEmailService.isUserEmailVerified(crmAuthUser) ? '✅ 認証済み' : '⚠️ 未認証'}</p>
                {!AuthenticationEmailService.isUserEmailVerified(crmAuthUser) && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ color: '#721c24', fontSize: '14px', marginBottom: '10px' }}>
                      ⚠️ セキュリティのため、メール認証が必要です。<br/>
                      {crmAuthUser.email} に送信された認証メールを確認してください。
                    </p>
                    <button 
                      onClick={resendAuthenticationEmail} 
                      className="auth-btn" 
                      style={{ backgroundColor: '#ffc107', color: '#212529', fontSize: '14px', padding: '8px 12px' }}
                    >
                      📧 認証メール再送信
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button onClick={handleSignOut} className="auth-btn" style={{ marginLeft: '10px' }}>
              🚪 ログアウト
            </button>
          </div>
          
          <div className="user-actions">
            <button className="search-btn">
              <span>🔍 ユーザー検索</span>
            </button>
            <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
              <span>🔄 更新</span>
            </button>
            <button className="test-btn" onClick={testApiConnection} disabled={loading}>
              <span>🔧 API接続テスト</span>
            </button>
          </div>

          <div className="user-content">
            {loading ? (
              <div className="loading-state">
                <p>narratives-test APIのusersテーブルからユーザー情報を読み込み中...</p>
              </div>
            ) : (
              <>
                {users.length === 0 ? (
                  <div className="no-users">
                    <p>📋 ユーザー情報が見つかりません</p>
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      API接続テストを実行してスキーマを確認してください。<br/>
                      利用可能な機能: ユーザー管理、ウォレット管理
                    </p>
                  </div>
                ) : (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>名前</th>
                          <th>カタカナ</th>
                          <th>メール</th>
                          <th>役割</th>
                          <th>ユーザー残高</th>
                          <th>ウォレット残高</th>
                          <th>ウォレットアドレス</th>
                          <th>通貨</th>
                          <th>登録日</th>
                          <th>更新日</th>
                          <th>ステータス</th>
                          <th>アクション</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user: UserData) => {
                          const userWallet = wallets.find(wallet => wallet.user_id === user.user_id);
                          const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim() || 'Unknown';
                          const katakanaName = `${user.last_name_katakana || ''} ${user.first_name_katakana || ''}`.trim() || '';
                          return (
                          <tr key={user.user_id}>
                            <td>{user.user_id}</td>
                            <td>{fullName}</td>
                            <td>{katakanaName}</td>
                            <td>{user.email_address}</td>
                            <td>
                              <span className="role-badge">
                                {user.role === 'admin' ? '👑 管理者' : 
                                 user.role === 'user' ? '👤 ユーザー' : 
                                 user.role || '未設定'}
                              </span>
                            </td>
                            <td>
                              <span className="user-balance">
                                {user.balance !== undefined ? user.balance.toLocaleString() : '0'}
                              </span>
                            </td>
                            <td>
                              {userWallet ? (
                                <span className="wallet-balance">
                                  {userWallet.balance !== undefined ? userWallet.balance.toLocaleString() : '0'}
                                </span>
                              ) : (
                                <span className="no-wallet">ウォレットなし</span>
                              )}
                            </td>
                            <td>
                              {userWallet?.wallet_address ? (
                                <span className="wallet-address" title={userWallet.wallet_address}>
                                  {userWallet.wallet_address.substring(0, 10)}...
                                </span>
                              ) : (
                                <span className="no-wallet">未設定</span>
                              )}
                            </td>
                            <td>
                              {userWallet?.currency || 'JPY'}
                            </td>
                            <td>
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString('ja-JP')
                                : '不明'}
                            </td>
                            <td>
                              {user.updated_at
                                ? new Date(user.updated_at).toLocaleDateString('ja-JP')
                                : '不明'}
                            </td>
                            <td>
                              <span className={`status-badge ${user.status || 'active'}`}>
                                {user.status === 'active' ? '✅ アクティブ' : 
                                 user.status === 'inactive' ? '❌ 非アクティブ' : 
                                 user.status || '✅ アクティブ'}
                              </span>
                            </td>
                            <td className="action-buttons">
                              <button 
                                className="message-btn" 
                                title="詳細を表示（ユーザー+ウォレット情報）"
                                onClick={() => handleViewDetails(user)}
                              >
                                📋
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement;
