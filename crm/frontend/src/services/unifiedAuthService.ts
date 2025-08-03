import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UnifiedUserModel, UnifiedUserDocument } from '../models/UnifiedUser';

export interface UnifiedAuthResult {
  success: boolean;
  user?: UnifiedUserModel;
  error?: string;
  requiresPasswordChange?: boolean;
}

/**
 * 統合ユーザーアカウントを作成（CRM用）
 */
export const createUnifiedUserAccount = async (userData: {
  email: string;
  password: string;
  firstName: string;
  firstNameKatakana: string;
  lastName: string;
  lastNameKatakana: string;
  role?: string;
  enableCrm?: boolean;
  enableSns?: boolean;
}): Promise<UnifiedAuthResult> => {
  try {
    // Firebase Authenticationでユーザー作成
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const firebaseUser = userCredential.user;

    // 統合ユーザーデータを作成
    const unifiedUserDoc: UnifiedUserDocument = {
      user_id: firebaseUser.uid,
      email: userData.email,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      is_active: true,
      permissions: {
        crm: userData.enableCrm ?? true,
        sns: userData.enableSns ?? false
      }
    };

    // CRMプロファイルを追加（CRM権限がある場合）
    if (userData.enableCrm ?? true) {
      unifiedUserDoc.crm_profile = {
        first_name: userData.firstName,
        first_name_katakana: userData.firstNameKatakana,
        last_name: userData.lastName,
        last_name_katakana: userData.lastNameKatakana,
        role: userData.role || 'user',
        status: 'active',
        belong_to: [],
        email_verified: false
      };

      // 既存のbusiness_usersコレクションにも保存（後方互換性）
      await setDoc(doc(db, 'business_users', firebaseUser.uid), {
        user_id: firebaseUser.uid,
        first_name: userData.firstName,
        first_name_katakana: userData.firstNameKatakana,
        last_name: userData.lastName,
        last_name_katakana: userData.lastNameKatakana,
        email_address: userData.email,
        email_verified: false,
        role: userData.role || 'user',
        status: 'active',
        belong_to: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }

    // unified_usersコレクションに保存
    await setDoc(doc(db, 'unified_users', firebaseUser.uid), unifiedUserDoc);

    // UnifiedUserModelを作成して返す
    const unifiedUser: UnifiedUserModel = {
      userId: firebaseUser.uid,
      email: userData.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      permissions: {
        crm: userData.enableCrm ?? true,
        sns: userData.enableSns ?? false
      }
    };

    if (userData.enableCrm ?? true) {
      unifiedUser.crmProfile = {
        firstName: userData.firstName,
        firstNameKatakana: userData.firstNameKatakana,
        lastName: userData.lastName,
        lastNameKatakana: userData.lastNameKatakana,
        role: (userData.role || 'user') as 'admin' | 'manager' | 'user',
        status: 'active',
        belongTo: [],
        emailVerified: false
      };
    }

    console.log('Unified user created:', unifiedUser.email);
    
    return {
      success: true,
      user: unifiedUser
    };
    
  } catch (error: any) {
    console.error('Error creating unified user account:', error);
    
    let errorMessage = 'アカウント作成に失敗しました';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'このメールアドレスは既に使用されています';
        break;
      case 'auth/invalid-email':
        errorMessage = 'メールアドレスの形式が正しくありません';
        break;
      case 'auth/weak-password':
        errorMessage = 'パスワードは6文字以上で入力してください';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * 統合ユーザーサインイン
 */
export const signInUnifiedUser = async (email: string, password: string): Promise<UnifiedAuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // unified_usersから情報を取得
    const unifiedUserDoc = await getDoc(doc(db, 'unified_users', firebaseUser.uid));
    
    if (!unifiedUserDoc.exists()) {
      // 既存のbusiness_usersから移行が必要な場合
      const businessUserDoc = await getDoc(doc(db, 'business_users', firebaseUser.uid));
      
      if (businessUserDoc.exists()) {
        // business_usersからunified_usersに移行
        const businessData = businessUserDoc.data();
        const unifiedUserData: UnifiedUserDocument = {
          user_id: firebaseUser.uid,
          email: firebaseUser.email || email,
          created_at: businessData.created_at || serverTimestamp(),
          updated_at: serverTimestamp(),
          is_active: true,
          permissions: {
            crm: true,
            sns: false // デフォルトでCRMのみ
          },
          crm_profile: {
            first_name: businessData.first_name,
            first_name_katakana: businessData.first_name_katakana,
            last_name: businessData.last_name,
            last_name_katakana: businessData.last_name_katakana,
            role: businessData.role,
            status: businessData.status,
            belong_to: businessData.belong_to || [],
            email_verified: businessData.email_verified || false
          }
        };

        await setDoc(doc(db, 'unified_users', firebaseUser.uid), unifiedUserData);
        console.log('Migrated business_user to unified_user');
      } else {
        throw new Error('ユーザー情報が見つかりません');
      }
    }

    // 最新のunified_usersデータを取得
    const finalUnifiedUserDoc = await getDoc(doc(db, 'unified_users', firebaseUser.uid));
    const userData = finalUnifiedUserDoc.data() as UnifiedUserDocument;

    const unifiedUser: UnifiedUserModel = {
      userId: userData.user_id,
      email: userData.email,
      createdAt: userData.created_at?.toDate() || new Date(),
      updatedAt: userData.updated_at?.toDate() || new Date(),
      isActive: userData.is_active,
      permissions: userData.permissions
    };

    if (userData.crm_profile) {
      unifiedUser.crmProfile = {
        firstName: userData.crm_profile.first_name,
        firstNameKatakana: userData.crm_profile.first_name_katakana,
        lastName: userData.crm_profile.last_name,
        lastNameKatakana: userData.crm_profile.last_name_katakana,
        role: userData.crm_profile.role as 'admin' | 'manager' | 'user',
        status: userData.crm_profile.status as 'active' | 'inactive' | 'suspended',
        belongTo: userData.crm_profile.belong_to,
        emailVerified: userData.crm_profile.email_verified
      };
    }

    if (userData.sns_profile) {
      unifiedUser.snsProfile = {
        displayName: userData.sns_profile.display_name,
        avatarUrl: userData.sns_profile.avatar_url,
        bio: userData.sns_profile.bio,
        isPublic: userData.sns_profile.is_public
      };
    }

    return {
      success: true,
      user: unifiedUser
    };

  } catch (error: any) {
    console.error('Error signing in unified user:', error);
    
    let errorMessage = 'サインインに失敗しました';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'ユーザーが見つかりません';
        break;
      case 'auth/wrong-password':
        errorMessage = 'パスワードが正しくありません';
        break;
      case 'auth/invalid-email':
        errorMessage = 'メールアドレスの形式が正しくありません';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * SNSアクセス権限を有効化
 */
export const enableSnsAccess = async (userId: string, snsProfile: {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isPublic?: boolean;
}): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'unified_users', userId);
    
    await updateDoc(userDocRef, {
      'permissions.sns': true,
      sns_profile: {
        display_name: snsProfile.displayName,
        avatar_url: snsProfile.avatarUrl || '',
        bio: snsProfile.bio || '',
        is_public: snsProfile.isPublic ?? true
      },
      updated_at: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error enabling SNS access:', error);
    return false;
  }
};

/**
 * 現在のユーザーが指定されたシステムにアクセス権限を持っているかチェック
 */
export const hasSystemAccess = async (userId: string, system: 'crm' | 'sns'): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'unified_users', userId));
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data() as UnifiedUserDocument;
    return userData.permissions[system] || false;
  } catch (error) {
    console.error('Error checking system access:', error);
    return false;
  }
};

/**
 * 統合サインアウト
 */
export const signOutUnified = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};
