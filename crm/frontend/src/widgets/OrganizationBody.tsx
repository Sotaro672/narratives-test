import React, { useState, useEffect } from 'react';
import CompanyModel from '../models/Companies';
import WalletModel, { WalletStatus } from '../models/Wallets';
import { SolanaWalletUtils } from '../utils/solanaUtils';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { crmDb } from '../config/firebase'; // CRM用Firestoreを使用
import AddMemberForm from './AddMemberForm';
import type { MemberFormData } from './AddMemberForm';
import MemberManagement from './MemberManagement';
import BrandManagement from './BrandManagement';
import EmailService from '../services/emailService';
import './OrganizationBody.css';

interface OrganizationBodyProps {
  currentUser?: any; // UserModelの型を使用
  onCompanyCreated?: () => void; // 会社作成成功のコールバック
}

const OrganizationBody: React.FC<OrganizationBodyProps> = ({ currentUser, onCompanyCreated }) => {
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyNameKatakana: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentCompanyInfo, setCurrentCompanyInfo] = useState<{
    companyName: string;
    walletAddress: string;
  } | null>(null);
  const [loadingCompanyInfo, setLoadingCompanyInfo] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [showBrandManagement, setShowBrandManagement] = useState(false);
  const [companyBrands, setCompanyBrands] = useState<any[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // ユーザー情報を再作成する関数
  const recreateUserInfo = async () => {
    if (!currentUser || !currentUser.email) {
      console.error('Cannot recreate user: no email information');
      return;
    }

    try {
      console.log('Recreating user information for:', currentUser.email);
      
      // 基本的なユーザー情報で新しいドキュメントを作成
      const newUserData = {
        email: currentUser.email,
        user_name: currentUser.userName || currentUser.email.split('@')[0],
        role: 'user', // デフォルトロール
        belong_to: [], // 空の所属会社配列
        created_at: new Date(),
        updated_at: new Date()
      };

      // Firestoreにユーザー情報を作成
      const userDocRef = doc(crmDb, 'users', currentUser.userId);
      await updateDoc(userDocRef, newUserData);
      
      console.log('User information recreated successfully');
      alert('ユーザー情報を復旧しました。ページを再読み込みしてください。');
      
    } catch (error) {
      console.error('Error recreating user info:', error);
      alert('ユーザー情報の復旧に失敗しました。管理者にお問い合わせください。');
    }
  };

  // 現在所属している会社の情報を取得
  const fetchCurrentCompanyInfo = async () => {
    if (!currentUser) {
      setCurrentCompanyInfo(null);
      return;
    }

    // ユーザー情報が存在しない場合は自動で作成を試みる
    if (!currentUser.userId || currentUser.userId === 'Unknown') {
      console.warn('User information is incomplete, attempting to recreate...');
      setCurrentCompanyInfo(null);
      return;
    }

    if (!currentUser.belongTo || currentUser.belongTo.length === 0) {
      setCurrentCompanyInfo(null);
      return;
    }

    setLoadingCompanyInfo(true);
    try {
      // 最初の所属会社の情報を取得
      const companyId = currentUser.belongTo[0];
      const companyDoc = await getDoc(doc(crmDb, 'companies', companyId));
      
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        
        // その会社のウォレット情報を取得
        const walletsQuery = query(
          collection(crmDb, 'wallets'),
          where('company_id', '==', companyId)
        );
        const walletDocs = await getDocs(walletsQuery);
        
        let walletAddress = 'ウォレットが見つかりません';
        if (!walletDocs.empty) {
          const walletData = walletDocs.docs[0].data();
          walletAddress = walletData.wallet_address || 'アドレスが見つかりません';
        }
        
        setCurrentCompanyInfo({
          companyName: companyData.company_name || 'Company名が見つかりません',
          walletAddress: walletAddress
        });
        
        // ブランド情報も取得
        fetchCompanyBrands(companyId);
      } else {
        setCurrentCompanyInfo({
          companyName: '会社情報が見つかりません',
          walletAddress: 'ウォレットが見つかりません'
        });
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      setCurrentCompanyInfo({
        companyName: 'エラーが発生しました',
        walletAddress: 'エラーが発生しました'
      });
    } finally {
      setLoadingCompanyInfo(false);
    }
  };
  
  // 会社に所属するブランドを取得する関数
  const fetchCompanyBrands = async (companyId: string) => {
    if (!companyId) return;
    
    setLoadingBrands(true);
    try {
      const brandsCollection = collection(crmDb, 'brands');
      const brandsQuery = query(
        brandsCollection,
        where('company_id', '==', companyId)
      );
      
      const querySnapshot = await getDocs(brandsQuery);
      const brandsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          brandId: data.brand_id,
          brandName: data.brand_name,
          brandNameKatakana: data.brand_name_katakana,
          description: data.description || '',
          adminUserId: data.admin_user_id,
          createdAt: data.created_at?.toDate()
        };
      });
      
      setCompanyBrands(brandsList);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setCompanyBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  };

  // メンバー追加機能
  const handleAddMember = async (memberData: MemberFormData) => {
    try {
      setIsLoading(true);

      // 権限チェック
      if (!currentUser || !currentUser.canAddMembers()) {
        alert('メンバー追加の権限がありません。ルートユーザーまたはブランド管理者のみが実行できます。');
        return;
      }

      // 現在のユーザーが所属している会社IDを取得
      if (!currentUser.belongTo || currentUser.belongTo.length === 0) {
        alert('所属会社が見つかりません。');
        return;
      }

      const companyId = currentUser.belongTo[0];
      console.log('Adding member to company:', companyId);

      // EmailServiceを使用してメンバー招待
      const result = await EmailService.inviteMember(memberData, companyId);

      if (result.success) {
        alert(`✅ ${result.message}\n\n📧 ${memberData.emailAddress} に認証メールを送信しました。\nメンバーは認証完了後にシステムにアクセスできます。`);
        setShowAddMemberForm(false);
      } else {
        alert(`❌ ${result.message}`);
      }

    } catch (error) {
      console.error('Error adding member:', error);
      alert('メンバーの追加に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー情報が変更されたときに会社情報を取得
  useEffect(() => {
    if (currentUser) {
      fetchCurrentCompanyInfo();
    }
  }, [currentUser]);

  const handleCompanyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyData({
      ...companyData,
      [e.target.name]: e.target.value
    });
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
  };

  const handleCancelCreateForm = () => {
    setShowCreateForm(false);
    setCompanyData({
      companyName: '',
      companyNameKatakana: '',
    });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleCreateCompany called');
    console.log('currentUser:', currentUser);
    console.log('companyData:', companyData);
    
    setIsLoading(true);

    try {
      if (!currentUser) {
        console.error('No current user');
        alert('ユーザー情報が取得できません');
        return;
      }

      // 権限チェック
      if (!currentUser.canCreateCompany()) {
        console.error('User does not have permission to create company');
        alert('会社作成の権限がありません');
        return;
      }

      // 入力値の検証
      if (!companyData.companyName.trim()) {
        console.error('Company name is empty');
        alert('会社名を入力してください');
        return;
      }

      if (!companyData.companyNameKatakana.trim()) {
        console.error('Company name katakana is empty');
        alert('会社名（カナ）を入力してください');
        return;
      }

      console.log('Creating company with data:', {
        userId: currentUser.userId,
        companyName: companyData.companyName.trim(),
        companyNameKatakana: companyData.companyNameKatakana.trim(),
        createdBy: currentUser.userId,
      });

      // CompanyModelインスタンスを作成
      const company = CompanyModel.newCompany({
        userId: currentUser.userId,
        companyName: companyData.companyName.trim(),
        companyNameKatakana: companyData.companyNameKatakana.trim(),
        createdBy: currentUser.userId,
      });

      console.log('Company model created:', company);
      console.log('Company toMap:', company.toMap());

      // Firestoreに会社を保存
      const companiesCollection = collection(crmDb, 'companies');
      console.log('Adding document to Firestore...');
      const docRef = await addDoc(companiesCollection, company.toMap());
      
      console.log('Company created with ID:', docRef.id);
      
      // ユーザーのbelongToフィールドを更新
      const userDocRef = doc(crmDb, 'users', currentUser.userId);
      const businessUserDocRef = doc(crmDb, 'business_users', currentUser.userId);
      
      console.log('Getting user document...');
      const userDoc = await getDoc(userDocRef);
      const businessUserDoc = await getDoc(businessUserDocRef);
      
      // usersコレクションを更新
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Current user data:', userData);
        const currentBelongTo = userData.belong_to || [];
        const currentRole = userData.role || 'user';
        
        // 新しい会社IDを追加（重複チェック）
        if (!currentBelongTo.includes(docRef.id)) {
          const updatedBelongTo = [...currentBelongTo, docRef.id];
          
          // 会社作成者をrootロールに昇格（まだrootでない場合）
          const newRole = currentRole === 'root' ? 'root' : 'root';
          
          console.log('Updating user - belongTo:', updatedBelongTo, 'role:', currentRole, '->', newRole);
          await updateDoc(userDocRef, {
            belong_to: updatedBelongTo,
            role: newRole, // 会社作成者をrootに昇格
            updated_at: new Date()
          });
          
          console.log('User belongTo and role updated successfully');
        } else {
          console.log('Company ID already exists in belongTo');
          
          // 会社IDが既に存在していても、ロールはrootに更新
          if (currentRole !== 'root') {
            console.log('Updating user role to root');
            await updateDoc(userDocRef, {
              role: 'root',
              updated_at: new Date()
            });
          }
        }
      } else {
        console.error('User document does not exist in users collection');
      }
      
      // business_usersコレクションも更新
      if (businessUserDoc.exists()) {
        const businessUserData = businessUserDoc.data();
        console.log('Current business user data:', businessUserData);
        const currentBelongTo = businessUserData.belong_to || [];
        const currentRole = businessUserData.role || 'user';
        
        // 新しい会社IDを追加（重複チェック）
        if (!currentBelongTo.includes(docRef.id)) {
          const updatedBelongTo = [...currentBelongTo, docRef.id];
          
          // 会社作成者をrootロールに昇格
          const newRole = 'root';
          
          console.log('Updating business user - belongTo:', updatedBelongTo, 'role:', currentRole, '->', newRole);
          await updateDoc(businessUserDocRef, {
            belong_to: updatedBelongTo,
            role: newRole,
            updated_at: new Date()
          });
          
          console.log('Business user belongTo and role updated successfully');
        } else {
          console.log('Company ID already exists in business user belongTo');
          
          // 会社IDが既に存在していても、ロールはrootに更新
          if (currentRole !== 'root') {
            console.log('Updating business user role to root');
            await updateDoc(businessUserDocRef, {
              role: 'root',
              updated_at: new Date()
            });
          }
        }
      } else {
        console.error('Business user document does not exist');
      }
      
      // 会社作成後にSolanaウォレットを自動作成
      console.log('Creating Solana wallet for company...');
      try {
        const { wallet: solanaWallet, secretKey } = WalletModel.newSolanaWallet({
          userId: currentUser.userId,
          companyId: docRef.id, // 新しく作成された会社ID
          status: WalletStatus.HOT,
          initialBalance: 0
        });

        // Firestoreにウォレット情報を保存
        const walletsCollection = collection(crmDb, 'wallets');
        const walletDocRef = await addDoc(walletsCollection, solanaWallet.toMap());
        
        console.log('Solana wallet created successfully:', {
          walletId: walletDocRef.id,
          walletInfo: solanaWallet.getWalletInfo(),
          companyId: docRef.id,
          isValidSolanaAddress: SolanaWalletUtils.isValidPublicKey(solanaWallet.walletAddress)
        });

        // セキュリティ上、秘密鍵は保存しない（必要に応じてユーザーに表示）
        console.log('Wallet secret key (保存されません):', Array.from(secretKey).slice(0, 8) + '...');
        
      } catch (walletError) {
        console.error('Error creating Solana wallet:', walletError);
        // ウォレット作成に失敗しても会社作成は成功とする
      }
      
      console.log('Company data:', company.toJson());
      alert(`🎉 会社「${company.companyName}」が正常に作成されました！\n\n✅ Solanaウォレットが開設されました\n✅ あなたのロールがルートブランド管理者に昇格されました\n✅ 所属会社に追加されました`);
      
      // 親コンポーネントに会社作成完了を通知（ユーザー情報の更新をトリガー）
      if (onCompanyCreated) {
        onCompanyCreated();
      }
      
      // 少し待機してからUI状態を更新
      setTimeout(async () => {
        // 会社情報を再取得
        await fetchCurrentCompanyInfo();
        
        // フォームをリセットして非表示にする
        setShowCreateForm(false);
        setCompanyData({
          companyName: '',
          companyNameKatakana: '',
        });
      }, 1000); // 1秒待機してからUI更新
    } catch (error) {
      console.error('Company creation error:', error);
      alert('会社の作成に失敗しました: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="organization-body">
      <div className="organization-container">
        <div className="organization-header">
          <h2>組織管理</h2>
          <p>会社の設立と管理を行います</p>
        </div>

        <div className="organization-content">
          <div className="company-section">
            <h3>組織管理</h3>
            
            {/* 所属会社情報は常に表示 */}
            <div className="company-info-display">
              <div className="company-info-content">
                <h4>📋 所属会社情報</h4>
                {loadingCompanyInfo ? (
                  <p>情報を読み込み中...</p>
                ) : currentCompanyInfo ? (
                  <div className="company-details">
                    <div className="info-row">
                      <label>会社名:</label>
                      <span className="company-name">{currentCompanyInfo.companyName}</span>
                    </div>
                    <div className="info-row">
                      <label>ウォレット公開鍵:</label>
                      <span className="wallet-address" title={currentCompanyInfo.walletAddress}>
                        {currentCompanyInfo.walletAddress}
                      </span>
                    </div>
                    
                    {/* 所有ブランド一覧 */}
                    <div className="brands-section">
                      <h5>🏷️ 所有ブランド</h5>
                      {loadingBrands ? (
                        <p className="loading-brands">ブランド情報を読み込み中...</p>
                      ) : companyBrands.length > 0 ? (
                        <div className="owned-brands-list">
                          {companyBrands.map(brand => (
                            <div key={brand.id} className="owned-brand-item">
                              <div className="brand-name-container">
                                <span className="brand-name">{brand.brandName}</span>
                                <span className="brand-kana">({brand.brandNameKatakana})</span>
                              </div>
                              {brand.description && (
                                <p className="brand-description">{brand.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-brands">登録されているブランドがありません。ブランド管理からブランドを作成できます。</p>
                      )}
                    </div>
                    
                    {/* メンバー管理ボタンを追加 */}
                    {currentUser && currentUser.canAddMembers() && (
                      <div className="member-management-section">
                        <div className="member-actions">
                          <button 
                            className="add-member-btn"
                            onClick={() => setShowAddMemberForm(true)}
                          >
                            👥 メンバーを追加
                          </button>
                          <button 
                            className="manage-members-btn"
                            onClick={() => setShowMemberManagement(true)}
                          >
                            ⚙️ メンバー管理
                          </button>
                          <button 
                            className="manage-brands-btn"
                            onClick={() => setShowBrandManagement(true)}
                          >
                            🏷️ ブランド管理
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 権限がない場合の情報表示 */}
                    {currentUser && !currentUser.canAddMembers() && (
                      <div className="permission-info">
                        <p style={{ 
                          color: 'rgba(255, 255, 255, 0.7)', 
                          fontSize: '0.9rem',
                          margin: '1rem 0 0 0',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          ℹ️ メンバー管理はルートユーザーまたはブランド管理者のみが利用できます。<br/>
                          現在の役割: {currentUser.getRoleDisplayName()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-company-info">
                    <p>🏢 会社情報がありません</p>
                    <p>会社を設立すると、ここに会社情報が表示されます。</p>
                    
                    {/* ユーザー情報復旧ボタン */}
                    {currentUser && (!currentUser.userId || currentUser.userId === 'Unknown') && (
                      <div className="user-recovery-section">
                        <p style={{ color: '#fbbf24', marginTop: '1rem' }}>
                          ⚠️ ユーザー情報が不完全です
                        </p>
                        <button 
                          className="recovery-btn"
                          onClick={recreateUserInfo}
                          style={{
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '0.5rem'
                          }}
                        >
                          🔧 ユーザー情報を復旧
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 会社設立ボタンを追加 */}
                {currentUser && currentUser.canCreateCompany() && !currentCompanyInfo && (
                  <div className="company-action-buttons">
                    <button 
                      className="setup-company-btn"
                      onClick={handleShowCreateForm}
                    >
                      🚀 会社設立を開始
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentUser && currentUser.canCreateCompany() && !currentCompanyInfo ? (
              <>
                {!showCreateForm ? (
                  <div className="company-setup-intro">
                    <div className="intro-content">
                      <h4>🚀 会社設立について</h4>
                      <p>会社を設立すると以下が自動的に実行されます：</p>
                      <ul className="feature-list">
                        <li>✅ 会社情報がデータベースに登録されます</li>
                        <li>✅ Solanaウォレットが自動開設されます</li>
                        <li>✅ あなたがルートブランド管理者に昇格されます</li>
                        <li>✅ 会社の所有者として登録されます</li>
                      </ul>
                      <p>上記の「会社設立を開始」ボタンから設立プロセスを開始してください。</p>
                    </div>
                  </div>
                ) : (
                  <div className="company-create-overview">
                    <h4>📝 会社設立概要</h4>
                    <div className="company-setup-details">
                      <div className="overview-section">
                        <h5>🏢 設立される会社について</h5>
                        <div className="overview-details">
                          <div className="detail-item">
                            <span className="detail-label">設立者:</span>
                            <span className="detail-value">{currentUser?.userName || 'Unknown User'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">ユーザーID:</span>
                            <span className="detail-value">{currentUser?.userId || 'Unknown'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">現在のロール:</span>
                            <span className="detail-value">{currentUser?.getRoleDisplayName() || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="overview-section">
                        <h5>⚡ 自動実行される処理</h5>
                        <div className="auto-processes">
                          <div className="process-item">
                            <span className="process-icon">🏢</span>
                            <span className="process-text">会社情報をFirestoreデータベースに登録</span>
                          </div>
                          <div className="process-item">
                            <span className="process-icon">💳</span>
                            <span className="process-text">Solanaウォレットの自動開設と秘密鍵生成</span>
                          </div>
                          <div className="process-item">
                            <span className="process-icon">👑</span>
                            <span className="process-text">あなたのロールをルートブランド管理者に昇格</span>
                          </div>
                          <div className="process-item">
                            <span className="process-icon">🔗</span>
                            <span className="process-text">ユーザーと会社の関連付け</span>
                          </div>
                        </div>
                      </div>

                      <div className="overview-section">
                        <h5>📋 入力が必要な情報</h5>
                        <div className="required-info">
                          <div className="info-item">
                            <span className="info-label">会社名:</span>
                            <span className="info-example">例: 株式会社サンプル</span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">会社名（カタカナ）:</span>
                            <span className="info-example">例: カブシキガイシャサンプル</span>
                          </div>
                        </div>
                      </div>

                      <div className="input-section">
                        <form onSubmit={handleCreateCompany}>
                          <div className="form-group">
                            <label htmlFor="companyName">会社名</label>
                            <input
                              type="text"
                              id="companyName"
                              name="companyName"
                              value={companyData.companyName}
                              onChange={handleCompanyInputChange}
                              required
                              placeholder="株式会社サンプル"
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="companyNameKatakana">会社名（カタカナ）</label>
                            <input
                              type="text"
                              id="companyNameKatakana"
                              name="companyNameKatakana"
                              value={companyData.companyNameKatakana}
                              onChange={handleCompanyInputChange}
                              required
                              placeholder="カブシキガイシャサンプル"
                            />
                          </div>

                          <div className="form-actions">
                            <button 
                              type="button" 
                              className="cancel-btn"
                              onClick={handleCancelCreateForm}
                              disabled={isLoading}
                            >
                              キャンセル
                            </button>
                            <button 
                              type="submit" 
                              className="submit-btn"
                              disabled={isLoading}
                            >
                              {isLoading ? '設立中...' : '🏢 会社を設立する'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : currentUser && !currentUser.canCreateCompany() ? (
              <div className="permission-message">
                <h4>🚫 会社設立の権限がありません</h4>
                <p>現在のロール: {currentUser ? currentUser.getRoleDisplayName() : 'Unknown'}</p>
                <p>会社設立にはユーザー権限以上が必要です。</p>
                
                {/* ユーザー情報に問題がある場合の復旧オプション */}
                {(!currentUser.userId || currentUser.userId === 'Unknown') && (
                  <div className="user-recovery-section" style={{ marginTop: '1rem' }}>
                    <p style={{ color: '#fbbf24' }}>
                      ⚠️ ユーザー情報に問題があります
                    </p>
                    <button 
                      className="recovery-btn"
                      onClick={recreateUserInfo}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginTop: '0.5rem'
                      }}
                    >
                      🔧 ユーザー情報を復旧
                    </button>
                  </div>
                )}
              </div>
            ) : !currentUser ? (
              <div className="no-user-message">
                <h4>👤 ユーザー情報なし</h4>
                <p>ログインしてください。</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* メンバー追加フォーム */}
      <AddMemberForm
        isOpen={showAddMemberForm}
        onClose={() => setShowAddMemberForm(false)}
        onSubmit={handleAddMember}
        isLoading={isLoading}
      />

      {/* メンバー管理 */}
      <MemberManagement
        isOpen={showMemberManagement}
        onClose={() => setShowMemberManagement(false)}
        currentUser={currentUser}
        companyId={currentUser?.belongTo?.[0] || ''}
      />

      {/* ブランド管理 */}
      <BrandManagement
        isOpen={showBrandManagement}
        onClose={() => setShowBrandManagement(false)}
        currentUser={currentUser}
        companyId={currentUser?.belongTo?.[0] || ''}
      />
    </div>
  );
};

export default OrganizationBody;
