import React, { useState } from 'react';
import './AddMemberForm.css';

interface AddMemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memberData: MemberFormData) => void;
  isLoading?: boolean;
}

export interface MemberFormData {
  firstName: string;
  firstNameKatakana: string;
  lastName: string;
  lastNameKatakana: string;
  emailAddress: string;
  role: string;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    firstNameKatakana: '',
    lastName: '',
    lastNameKatakana: '',
    emailAddress: '',
    role: 'user'
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = '名前（名）は必須です';
    }

    if (!formData.firstNameKatakana.trim()) {
      newErrors.firstNameKatakana = '名前（名）カタカナは必須です';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = '名前（姓）は必須です';
    }

    if (!formData.lastNameKatakana.trim()) {
      newErrors.lastNameKatakana = '名前（姓）カタカナは必須です';
    }

    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = '有効なメールアドレスを入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
      // フォームをリセット
      setFormData({
        firstName: '',
        firstNameKatakana: '',
        lastName: '',
        lastNameKatakana: '',
        emailAddress: '',
        role: 'user'
      });
      setErrors({});
    }
  };

  const handleCancel = () => {
    // フォームをリセット
    setFormData({
      firstName: '',
      firstNameKatakana: '',
      lastName: '',
      lastNameKatakana: '',
      emailAddress: '',
      role: 'user'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🧑‍💼 新しいメンバーを追加</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-member-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lastName">姓 *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? 'error' : ''}
                placeholder="例: 田中"
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="firstName">名 *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? 'error' : ''}
                placeholder="例: 太郎"
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="lastNameKatakana">姓（カタカナ） *</label>
              <input
                type="text"
                id="lastNameKatakana"
                name="lastNameKatakana"
                value={formData.lastNameKatakana}
                onChange={handleInputChange}
                className={errors.lastNameKatakana ? 'error' : ''}
                placeholder="例: タナカ"
              />
              {errors.lastNameKatakana && <span className="error-message">{errors.lastNameKatakana}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="firstNameKatakana">名（カタカナ） *</label>
              <input
                type="text"
                id="firstNameKatakana"
                name="firstNameKatakana"
                value={formData.firstNameKatakana}
                onChange={handleInputChange}
                className={errors.firstNameKatakana ? 'error' : ''}
                placeholder="例: タロウ"
              />
              {errors.firstNameKatakana && <span className="error-message">{errors.firstNameKatakana}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="emailAddress">メールアドレス *</label>
            <input
              type="email"
              id="emailAddress"
              name="emailAddress"
              value={formData.emailAddress}
              onChange={handleInputChange}
              className={errors.emailAddress ? 'error' : ''}
              placeholder="例: tanaka@example.com"
            />
            {errors.emailAddress && <span className="error-message">{errors.emailAddress}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role">役割</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="role-select"
            >
              <option value="user">一般ユーザー</option>
              <option value="production_manager">生産計画責任者</option>
              <option value="token_designer">トークン設計者</option>
              <option value="customer_support_manager">カスタマーサポート責任者</option>
              <option value="admin">ブランド管理者</option>
            </select>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleCancel}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  📧 認証メール送信中...
                </>
              ) : (
                'メンバーを追加'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberForm;
