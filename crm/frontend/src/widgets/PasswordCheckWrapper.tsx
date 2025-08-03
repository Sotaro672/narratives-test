import React, { useState, useEffect } from 'react';
import { hasTemporaryPassword } from '../services/authService';
import { PasswordChangeForm } from './PasswordChangeForm';
import type { UserModel } from '../models/Users';

interface PasswordCheckWrapperProps {
  children: React.ReactNode;
  user: UserModel | null;
}

export const PasswordCheckWrapper: React.FC<PasswordCheckWrapperProps> = ({
  children,
  user
}) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkTemporaryPassword = async () => {
      try {
        const isTemporary = await hasTemporaryPassword();
        setShowPasswordChange(isTemporary);
      } catch (error) {
        console.error('Error checking temporary password:', error);
      } finally {
        setIsChecking(false);
      }
    };

    if (user) {
      checkTemporaryPassword();
    } else {
      setIsChecking(false);
    }
  }, [user]);

  const handlePasswordChanged = () => {
    setShowPasswordChange(false);
  };

  const handleSkipPasswordChange = () => {
    setShowPasswordChange(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">ユーザー情報を確認中...</span>
        </div>
      </div>
    );
  }

  if (showPasswordChange) {
    return (
      <PasswordChangeForm
        onPasswordChanged={handlePasswordChanged}
        onCancel={handleSkipPasswordChange}
      />
    );
  }

  return <>{children}</>;
};

export default PasswordCheckWrapper;
