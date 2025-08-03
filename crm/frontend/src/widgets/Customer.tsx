import React, { useEffect, useState } from 'react';
import { snsAuth, crmAuth } from '../config/firebase';
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import './Customer.css';

// narratives-test API エンドポイント
const NARRATIVES_API_BASE_URL = 'https://narratives-api-765852113927.asia-northeast1.run.app';

// Development proxy endpoint (for local testing only)
const isDevelopment = import.meta.env.DEV;

// Production: Use Firebase Functions proxy to avoid CORS
const PRODUCTION_API_BASE_URL = '/api';

// 開発環境ではViteプロキシを使用
const API_BASE_URL = isDevelopment ? '/proxy-api' : PRODUCTION_API_BASE_URL;

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

// GraphQL クエリ定義 - usersテーブルを使用
const GET_USERS_QUERY = `
  query GetUsers {
    users {
      user_id
      first_name
      last_name
      first_name_katakana
      last_name_katakana
      email_address
      role
      created_at
      updated_at
    }
  }
`;

const GET_WALLETS_QUERY = `
  query GetWallets {
    wallets {
      id
      user_id
      wallet_address
      balance
      created_at
      updated_at
    }
  }
`;

// GraphQL リクエスト関数
const executeGraphQLQuery = async (query: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/query`, {
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
  created_at?: any;
  updated_at?: any;
}

interface WalletData {
  id: string;
  user_id?: string;
  wallet_address?: string;
  balance?: number;
  created_at?: any;
  updated_at?: any;
}

interface CustomerData {
  id: string;
  name: string;
  katakanaName: string;
  email: string;
  role: string;
  status: string;
  wallet?: WalletData;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const Customer: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snsAuthUser, setSnsAuthUser] = useState<User | null>(null);
  const [crmAuthUser, setCrmAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  // 認証状態の監視（デュアル認証）
  useEffect(() => {
    console.log('Setting up dual authentication listeners...');
    
    // SNS認証状態の監視
    const unsubscribeSns = onAuthStateChanged(snsAuth, (user) => {
      console.log('SNS Auth state changed:', user?.uid || 'null');
      setSnsAuthUser(user);
    }, (error) => {
      console.warn('SNS Auth error:', error);
      // エラーが発生してもアプリケーションを続行
    });

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
      unsubscribeSns();
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
      
      // CRM認証成功後、SNS側は匿名認証（情報収集用）
      console.log('Setting up SNS anonymous auth for data collection...');
      const snsResult = await signInAnonymously(snsAuth);
      console.log('SNS anonymous auth successful:', snsResult.user.uid);
      
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
        default:
          errorMessage = `ログインエラー: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 匿名認証でログイン（テスト用）
  const signInAnonymouslyForTest = async () => {
    try {
      console.log('Attempting anonymous sign in to SNS platform...');
      const result = await signInAnonymously(snsAuth);
      console.log('SNS anonymous sign in successful:', result.user.uid);
      
      // SNS認証成功後、自動的にCRM側も認証
      console.log('Attempting anonymous sign in to CRM platform...');
      const crmResult = await signInAnonymously(crmAuth);
      console.log('CRM anonymous sign in successful:', crmResult.user.uid);
      
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      alert('認証に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // ログアウト（両方から）
  const handleSignOut = async () => {
    try {
      await Promise.all([
        signOut(snsAuth),
        signOut(crmAuth)
      ]);
      console.log('Signed out from both platforms successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // メッセージ送信機能
  const handleSendMessage = (userId: string) => {
    const customer = customers.find((c: CustomerData) => c.id === userId);
    if (customer) {
      const message = prompt(`${customer.name} さんにメッセージを送信:`);
      if (message && message.trim()) {
        // TODO: Firestoreのmessagesコレクションに投稿
        console.log('Sending message to:', userId, 'Message:', message);
        alert(`${customer.name} さんにメッセージを送信しました: "${message}"`);
      }
    }
  };

  // プロフィール詳細表示
  const handleViewProfile = (userId: string) => {
    const customer = customers.find((c: CustomerData) => c.id === userId);
    if (customer) {
      console.log('Viewing profile for:', customer);
      alert(`${customer.name} さんのプロフィール詳細\n\nメール: ${customer.email}\n役割: ${customer.role}\nウォレット: ${customer.wallet?.wallet_address || '未設定'}\n残高: ${customer.wallet?.balance || 0} ETH`);
    }
  };

  // トークン出品機能
  const handleCreateToken = (userId: string) => {
    const customer = customers.find((c: CustomerData) => c.id === userId);
    if (customer) {
      const tokenName = prompt(`${customer.name} さん向けのトークン名:`);
      if (tokenName && tokenName.trim()) {
        // TODO: Firestoreのtokensコレクションに作成
        console.log('Creating token for:', userId, 'Token name:', tokenName);
        alert(`${customer.name} さん向けのトークン "${tokenName}" を出品しました`);
      }
    }
  };

  // API接続テスト（CORS診断を含む）
  const testApiConnection = async () => {
    try {
      if (!snsAuthUser) {
        alert('SNS認証が必要です');
        return;
      }
      
      console.log('=== CORS診断開始 ===');
      console.log('Development mode:', isDevelopment);
      console.log('Frontend Origin:', window.location.origin);
      console.log('Direct API URL:', NARRATIVES_API_BASE_URL);
      console.log('Using API URL:', API_BASE_URL);
      console.log('SNS Auth User:', snsAuthUser.uid);
      console.log('CRM Auth User:', crmAuthUser?.uid || 'null');
      
      // 1. まずOPTIONSリクエスト（preflight）を手動で送信してCORSヘッダーを確認
      console.log('1. Testing CORS preflight (OPTIONS request)...');
      try {
        const preflightResponse = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET',
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
      
      // 3. SNS認証トークンでAPIテスト
      console.log('3. Testing authenticated API request with SNS token...');
      const snsIdToken = await snsAuthUser.getIdToken();
      console.log('Got SNS ID token, length:', snsIdToken.length);
      
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${snsIdToken}`,
          'Content-Type': 'application/json',
        },
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
  // 注意: customersテーブルは存在しないため、usersテーブルを使用する
  const fetchCustomers = async () => {
    console.log('fetchCustomers called');
    console.log('SNS Auth User:', snsAuthUser?.uid || 'null');
    console.log('CRM Auth User:', crmAuthUser?.uid || 'null');
    
    if (!snsAuthUser) {
      console.warn('No SNS authenticated user, skipping fetch');
      alert('SNS認証が必要です。ログインしてください。');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Starting to fetch from narratives-test GraphQL API...');
      console.log('API base URL:', NARRATIVES_API_BASE_URL);
      console.log('Using SNS authenticated user:', snsAuthUser.uid);
      
      // SNS認証トークンを取得
      console.log('Getting SNS ID token...');
      const snsIdToken = await snsAuthUser.getIdToken();
      console.log('SNS ID token obtained, length:', snsIdToken.length);
      
      // まずスキーマを調査
      console.log('🔍 First, let\'s investigate the available GraphQL schema...');
      const schemaFields = await investigateSchema(snsIdToken);
      
      if (!schemaFields) {
        throw new Error('Unable to investigate GraphQL schema');
      }
      
      // 利用可能なフィールドを確認
      const availableFields = schemaFields.map((field: any) => field.name);
      console.log('Available GraphQL fields:', availableFields);
      
      // usersフィールドが存在するかチェック
      if (!availableFields.includes('users')) {
        console.warn('⚠️ "users" field not found in schema. Available fields:', availableFields);
        
        // 代替フィールドを探す
        const userRelatedFields = availableFields.filter((field: string) => 
          field.toLowerCase().includes('user') || 
          field.toLowerCase().includes('customer') ||
          field.toLowerCase().includes('account')
        );
        
        if (userRelatedFields.length > 0) {
          console.log('🔍 Found potential user-related fields:', userRelatedFields);
          alert(`"users"フィールドが見つかりません。\n\n利用可能なフィールド: ${availableFields.join(', ')}\n\nユーザー関連フィールド: ${userRelatedFields.join(', ')}\n\nコンソールで詳細を確認してください。`);
        } else {
          alert(`GraphQLスキーマに"users"フィールドが存在しません。\n\n利用可能なフィールド: ${availableFields.join(', ')}\n\nAPI開発者に正しいフィールド名を確認してください。`);
        }
        
        return;
      }
      
      // GraphQL クエリでusersデータを取得
      console.log('✅ "users" field found! Fetching users via GraphQL...');
      const usersData = await executeGraphQLQuery(GET_USERS_QUERY, snsIdToken);
      console.log('Users GraphQL response:', usersData);
      
      const usersList: UserData[] = Array.isArray(usersData.users) ? usersData.users.map((user: any) => ({
        user_id: user.user_id || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        first_name_katakana: user.first_name_katakana || '',
        last_name_katakana: user.last_name_katakana || '',
        email_address: user.email_address || '',
        role: user.role || '',
        created_at: user.created_at || null,
        updated_at: user.updated_at || null
      })) : [];
      
      console.log('Users list processed:', usersList.length, 'users');

      // GraphQL クエリでwalletsデータを取得
      console.log('Fetching wallets via GraphQL...');
      let walletsList: WalletData[] = [];
      
      try {
        const walletsData = await executeGraphQLQuery(GET_WALLETS_QUERY, snsIdToken);
        console.log('Wallets GraphQL response:', walletsData);
        
        walletsList = Array.isArray(walletsData.wallets) ? walletsData.wallets.map((wallet: any) => ({
          id: wallet.id || '',
          user_id: wallet.user_id || '',
          wallet_address: wallet.wallet_address || '',
          balance: wallet.balance || 0,
          created_at: wallet.created_at || null,
          updated_at: wallet.updated_at || null
        })) : [];
      } catch (walletsError) {
        console.warn('Error fetching wallets (non-critical):', walletsError);
        walletsList = []; // フォールバック
      }
      
      console.log('Wallets list processed:', walletsList.length, 'wallets');

      // usersとwalletsを結合してCustomerDataに変換
      const customersList: CustomerData[] = usersList.map((user) => {
        const userWallet = walletsList.find(wallet => wallet.user_id === user.user_id);
        return {
          id: user.user_id,
          name: `${user.last_name || ''} ${user.first_name || ''}`.trim() || 'Unknown',
          katakanaName: `${user.last_name_katakana || ''} ${user.first_name_katakana || ''}`.trim() || '',
          email: user.email_address || '',
          role: user.role || '',
          status: 'active', // narratives-testに存在するユーザーは基本的にactive
          wallet: userWallet,
          createdAt: user.created_at ? new Date(user.created_at) : null,
          updatedAt: user.updated_at ? new Date(user.updated_at) : null
        };
      });

      setCustomers(customersList);
      console.log('Fetch completed successfully. Total customers:', customersList.length);
      
    } catch (error) {
      console.error('Error fetching users from narratives-test API:', error);
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
    if (!authLoading && snsAuthUser) {
      fetchCustomers();
    }
  }, [snsAuthUser, authLoading]);

  return (
    <div className="customer-container">
      <div className="customer-header">
        <h2>SNSユーザー管理システム</h2>
        <p>業務ユーザーとしてログインし、narratives-test API ({NARRATIVES_API_BASE_URL}) からSNSユーザー情報を収集・管理できます</p>
        <p>🔸 narratives-crm: 業務ユーザー用認証 | 🔸 narratives-test: SNS情報収集専用</p>
      </div>

      {authLoading ? (
        <div className="loading-state">
          <p>認証状態を確認中...</p>
        </div>
      ) : (!crmAuthUser && !snsAuthUser) ? (
        <div className="no-auth">
          <p>この機能を使用するには業務ユーザーとしてログインが必要です。</p>
          <p>CRM認証: {crmAuthUser ? '✅' : '❌'}</p>
          <p>SNS認証: {snsAuthUser ? '✅' : '❌'}</p>
          
          {!showLoginForm ? (
            <div style={{ marginTop: '20px' }}>
              <button onClick={() => setShowLoginForm(true)} className="auth-btn">
                👤 業務ユーザーログイン
              </button>
              <button onClick={signInAnonymouslyForTest} className="auth-btn" style={{ marginLeft: '10px' }}>
                🔐 テスト用匿名ログイン
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
            <p><strong>SNS情報収集:</strong> {snsAuthUser ? `✅ 認証済み (${snsAuthUser.uid.substring(0, 8)}...)` : '❌ 未認証'}</p>
            <button onClick={handleSignOut} className="auth-btn" style={{ marginLeft: '10px' }}>
              🚪 ログアウト
            </button>
          </div>
          
          <div className="customer-actions">
            <button className="search-btn">
              <span>🔍 ユーザー検索</span>
            </button>
            <button className="refresh-btn" onClick={fetchCustomers} disabled={loading}>
              <span>🔄 更新</span>
            </button>
            <button className="test-btn" onClick={testApiConnection} disabled={loading}>
              <span>🔧 API接続テスト</span>
            </button>
          </div>

          <div className="customer-content">
            {loading ? (
              <div className="loading-state">
                <p>narratives-test APIのusersテーブルからユーザー情報を読み込み中...</p>
              </div>
            ) : (
              <>
                {customers.length === 0 ? (
                  <div className="no-customers">
                    <p>narratives-test APIのusersテーブルに登録されているユーザーがいません</p>
                  </div>
                ) : (
                  <div className="customers-table-container">
                    <table className="customers-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>名前</th>
                          <th>カタカナ</th>
                          <th>メール</th>
                          <th>役割</th>
                          <th>ウォレットアドレス</th>
                          <th>残高</th>
                          <th>登録日</th>
                          <th>更新日</th>
                          <th>ステータス</th>
                          <th>アクション</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer: CustomerData) => (
                          <tr key={customer.id}>
                            <td>{customer.id}</td>
                            <td>{customer.name}</td>
                            <td>{customer.katakanaName}</td>
                            <td>{customer.email}</td>
                            <td>
                              <span className="role-badge">
                                {customer.role === 'admin' ? '👑 管理者' : 
                                 customer.role === 'user' ? '👤 ユーザー' : 
                                 customer.role || '未設定'}
                              </span>
                            </td>
                            <td>
                              {customer.wallet?.wallet_address ? (
                                <span className="wallet-address" title={customer.wallet.wallet_address}>
                                  {customer.wallet.wallet_address.substring(0, 10)}...
                                </span>
                              ) : (
                                <span className="no-wallet">未設定</span>
                              )}
                            </td>
                            <td>
                              {customer.wallet?.balance !== undefined ? (
                                <span className="balance">
                                  {customer.wallet.balance.toLocaleString()} ETH
                                </span>
                              ) : (
                                <span className="no-balance">-</span>
                              )}
                            </td>
                            <td>
                              {customer.createdAt
                                ? customer.createdAt.toLocaleDateString('ja-JP')
                                : '不明'}
                            </td>
                            <td>
                              {customer.updatedAt
                                ? customer.updatedAt.toLocaleDateString('ja-JP')
                                : '不明'}
                            </td>
                            <td>
                              <span className={`status-badge ${customer.status}`}>
                                {customer.status === 'active'
                                  ? '✅ アクティブ'
                                  : customer.status === 'inactive'
                                  ? '❌ 非アクティブ'
                                  : customer.status === 'invited'
                                  ? '📧 招待済み'
                                  : '🆕 新規'}
                              </span>
                            </td>
                            <td className="action-buttons">
                              <button 
                                className="message-btn" 
                                title="メッセージを送信"
                                onClick={() => handleSendMessage(customer.id)}
                              >
                                📧 メッセージ
                              </button>
                              <button 
                                className="view-btn" 
                                title="プロフィール詳細"
                                onClick={() => handleViewProfile(customer.id)}
                              >
                                👁️ 詳細
                              </button>
                              <button 
                                className="token-btn" 
                                title="トークン出品"
                                onClick={() => handleCreateToken(customer.id)}
                              >
                                🪙 出品
                              </button>
                            </td>
                          </tr>
                        ))}
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

export default Customer;
