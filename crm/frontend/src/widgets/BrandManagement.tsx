import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { crmDb } from '../config/firebase';
import { BrandModel } from '../models/Brands';
import './BrandManagement.css';

interface BrandManagementProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  companyId: string;
}

interface BrandFormData {
  brandName: string;
  brandNameKatakana: string;
  description: string;
  adminUserId: string;
}

const BrandManagement: React.FC<BrandManagementProps> = ({ isOpen, onClose, currentUser, companyId }) => {
  const [brands, setBrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [brandData, setBrandData] = useState<BrandFormData>({
    brandName: '',
    brandNameKatakana: '',
    description: '',
    adminUserId: currentUser?.userId || '',
  });
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);

  // 会社のメンバーリスト取得
  const fetchCompanyMembers = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      // ユーザーのうち、この会社に所属しているメンバーを取得
      const usersCollection = collection(crmDb, 'users');
      const membersQuery = query(
        usersCollection,
        where('belong_to', 'array-contains', companyId)
      );
      
      const querySnapshot = await getDocs(membersQuery);
      const membersList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.user_id,
          name: data.user_name || `${data.last_name || ''} ${data.first_name || ''}`.trim() || data.email,
          email: data.email,
          role: data.role
        };
      });
      
      setCompanyMembers(membersList);
    } catch (error) {
      console.error('Error fetching company members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 会社のブランドリスト取得
  const fetchBrands = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
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
          description: data.description,
          adminUserId: data.admin_user_id,
          createdAt: data.created_at?.toDate()
        };
      });
      
      setBrands(brandsList);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      fetchBrands();
      fetchCompanyMembers();
    }
  }, [isOpen, companyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setBrandData({
      ...brandData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !companyId) {
      alert('ユーザー情報または会社情報が取得できません');
      return;
    }

    // 権限チェック
    if (!currentUser.hasAdminPrivileges()) {
      alert('ブランド作成の権限がありません。ルートユーザーまたはブランド管理者のみが実行できます。');
      return;
    }

    // 入力値検証
    if (!brandData.brandName.trim()) {
      alert('ブランド名を入力してください');
      return;
    }

    if (!brandData.brandNameKatakana.trim()) {
      alert('ブランド名（カナ）を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      // BrandModelインスタンスを作成
      const brand = BrandModel.newBrand({
        companyId,
        brandName: brandData.brandName.trim(),
        brandNameKatakana: brandData.brandNameKatakana.trim(),
        description: brandData.description.trim(),
        adminUserId: brandData.adminUserId,
        createdBy: currentUser.userId,
      });

      // Firestoreにブランドを保存
      const brandsCollection = collection(crmDb, 'brands');
      await addDoc(brandsCollection, brand.toMap());
      
      alert(`✅ ブランド「${brand.brandName}」が正常に作成されました！`);
      
      // フォームをリセットして再取得
      setBrandData({
        brandName: '',
        brandNameKatakana: '',
        description: '',
        adminUserId: currentUser?.userId || '',
      });
      setShowCreateForm(false);
      fetchBrands();
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('ブランドの作成に失敗しました: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // 管理者の名前を取得する関数
  const getAdminName = (adminUserId: string) => {
    const admin = companyMembers.find(member => member.userId === adminUserId);
    return admin ? admin.name : '不明';
  };

  return (
    <div className="brand-management-overlay">
      <div className="brand-management-container">
        <div className="brand-management-header">
          <h2>ブランド管理</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="brand-management-content">
          {isLoading ? (
            <div className="loading">読み込み中...</div>
          ) : (
            <>
              {/* ブランド一覧 */}
              <div className="brands-list-section">
                <div className="section-header">
                  <h3>ブランド一覧</h3>
                  {currentUser && currentUser.hasAdminPrivileges() && (
                    <button 
                      className="create-brand-btn"
                      onClick={() => setShowCreateForm(true)}
                    >
                      ✨ 新規ブランド作成
                    </button>
                  )}
                </div>
                
                {brands.length > 0 ? (
                  <div className="brands-list">
                    {brands.map(brand => (
                      <div key={brand.id} className="brand-item">
                        <div className="brand-info">
                          <h4>{brand.brandName}</h4>
                          <p className="brand-kana">{brand.brandNameKatakana}</p>
                          <p className="brand-description">{brand.description}</p>
                          <div className="brand-meta">
                            <span className="brand-admin">管理者: {getAdminName(brand.adminUserId)}</span>
                            <span className="brand-created">作成日: {brand.createdAt?.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-brands-message">
                    <p>この会社にはブランドがまだ登録されていません。</p>
                    {currentUser && currentUser.hasAdminPrivileges() && (
                      <p>「新規ブランド作成」ボタンをクリックして、最初のブランドを作成しましょう。</p>
                    )}
                  </div>
                )}
              </div>

              {/* ブランド作成フォーム */}
              {showCreateForm && (
                <div className="create-brand-form">
                  <h3>新規ブランド作成</h3>
                  <form onSubmit={handleCreateBrand}>
                    <div className="form-group">
                      <label htmlFor="brandName">ブランド名 *</label>
                      <input
                        type="text"
                        id="brandName"
                        name="brandName"
                        value={brandData.brandName}
                        onChange={handleInputChange}
                        required
                        placeholder="例: NarrativesコレクションA"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="brandNameKatakana">ブランド名（カタカナ） *</label>
                      <input
                        type="text"
                        id="brandNameKatakana"
                        name="brandNameKatakana"
                        value={brandData.brandNameKatakana}
                        onChange={handleInputChange}
                        required
                        placeholder="例: ナラティブズコレクションエー"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="description">ブランド説明</label>
                      <textarea
                        id="description"
                        name="description"
                        value={brandData.description}
                        onChange={handleInputChange}
                        placeholder="ブランドの説明を入力してください"
                        rows={4}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="adminUserId">ブランド管理者 *</label>
                      <select
                        id="adminUserId"
                        name="adminUserId"
                        value={brandData.adminUserId}
                        onChange={handleInputChange}
                        required
                      >
                        {companyMembers.map(member => (
                          <option key={member.userId} value={member.userId}>
                            {member.name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={() => setShowCreateForm(false)}
                        disabled={isLoading}
                      >
                        キャンセル
                      </button>
                      <button 
                        type="submit" 
                        className="submit-btn"
                        disabled={isLoading}
                      >
                        {isLoading ? '作成中...' : '✨ ブランドを作成する'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandManagement;
