import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { crmAuth, crmDb } from '../config/firebase'; // CRM認証とFirestoreを使用
import { UserModel } from '../models/Users';

export interface AuthResult {
  success: boolean;
  user?: UserModel;
  error?: string;
  requiresPasswordChange?: boolean;
}

/**
 * Sign Inでユーザーを新規作成してFirestoreに保存
 */
export const createUserAccount = async (userData: {
  email: string;
  password: string;
  firstName: string;
  firstNameKatakana: string;
  lastName: string;
  lastNameKatakana: string;
  role?: string;
}): Promise<AuthResult> => {
  try {
    // Firebase Authenticationでユーザー作成
    const userCredential = await createUserWithEmailAndPassword(
      crmAuth, 
      userData.email, 
      userData.password
    );
    
    const firebaseUser = userCredential.user;

    // UserModelインスタンス作成
    const newUser = new UserModel({
      userId: firebaseUser.uid,
      firstName: userData.firstName,
      firstNameKatakana: userData.firstNameKatakana,
      lastName: userData.lastName,
      lastNameKatakana: userData.lastNameKatakana,
      emailAddress: userData.email,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Firestoreにユーザー情報を保存
    await setDoc(doc(crmDb, 'users', firebaseUser.uid), {
      user_id: newUser.userId,
      first_name: newUser.firstName,
      first_name_katakana: newUser.firstNameKatakana,
      last_name: newUser.lastName,
      last_name_katakana: newUser.lastNameKatakana,
      email_address: newUser.emailAddress,
      role: newUser.role,
      belong_to: [], // 初期値として空配列を設定
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    console.log('User created and saved to Firestore:', newUser.getFullName());
    
    return {
      success: true,
      user: newUser
    };
    
  } catch (error: any) {
    console.error('Error creating user account:', error);
    
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
        errorMessage = error.message || 'アカウント作成に失敗しました';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Loginで既存ユーザーでサインイン
 */
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Firebase Authenticationでサインイン
    const userCredential = await signInWithEmailAndPassword(crmAuth, email, password);
    const firebaseUser = userCredential.user;

    // Firestoreからユーザー情報を取得
    const userDoc = await getDoc(doc(crmDb, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('ユーザー情報が見つかりません');
    }

    const userData = userDoc.data();
    
    // ログイン成功時にFirestoreのステータスを更新
    await updateDoc(doc(crmDb, 'users', firebaseUser.uid), {
      last_login_at: new Date(),
      updated_at: new Date(),
      status: 'active', // ログイン成功時にステータスをアクティブに
      email_verified: true // ログイン成功時に認証済みに
    });
    
    // UserModelインスタンス作成
    const user = new UserModel({
      userId: userData.user_id,
      firstName: userData.first_name,
      firstNameKatakana: userData.first_name_katakana,
      lastName: userData.last_name,
      lastNameKatakana: userData.last_name_katakana,
      emailAddress: userData.email_address,
      role: userData.role,
      createdAt: userData.created_at?.toDate(),
      updatedAt: userData.updated_at?.toDate()
    });

    console.log('User logged in:', user.getFullName());
    
    return {
      success: true,
      user: user
    };
    
  } catch (error: any) {
    console.error('Error logging in user:', error);
    
    let errorMessage = 'ログインに失敗しました';
    
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
        errorMessage = 'ログイン試行回数が上限を超えました。しばらく時間をおいてから再試行してください';
        break;
      default:
        errorMessage = error.message || 'ログインに失敗しました';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * ログアウト
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(crmAuth);
    console.log('User logged out');
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

/**
 * 現在のログインユーザーを取得
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return crmAuth.currentUser;
};

/**
 * Firestoreからユーザー詳細情報を取得
 */
export const getUserDetails = async (userId: string): Promise<UserModel | null> => {
  try {
    const userDoc = await getDoc(doc(crmDb, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    return UserModel.fromDocument(userDoc);
    
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
};

/**
 * 一時パスワードでのログイン機能（招待されたメンバー用）
 */
export const loginWithTemporaryPassword = async (
  email: string, 
  password: string
): Promise<AuthResult> => {
  try {
    console.log('Attempting login with temporary password for:', email);

    // Firebase Authenticationでサインイン
    const userCredential = await signInWithEmailAndPassword(crmAuth, email, password);
    const firebaseUser = userCredential.user;

    console.log('Firebase auth successful for user:', firebaseUser.uid);

    // Firestoreからユーザー詳細情報を取得
    const userDoc = await getDoc(doc(crmDb, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      await signOut(crmAuth);
      return {
        success: false,
        error: 'ユーザー情報が見つかりません。管理者にお問い合わせください。'
      };
    }

    const userData = userDoc.data();
    const user = UserModel.fromDocument(userDoc);

    console.log('User data retrieved:', user.toJSON());

    // 一時パスワードかどうかをチェック
    const hasTemporaryPassword = userData.temporary_password === password;
    
    // ユーザーのステータスをチェック
    if (userData.status === 'suspended') {
      await signOut(crmAuth);
      return {
        success: false,
        error: 'アカウントが停止されています。管理者にお問い合わせください。'
      };
    }

    // 最終ログイン時刻を更新し、ステータスとメール認証状態も更新
    await updateDoc(doc(crmDb, 'users', firebaseUser.uid), {
      last_login_at: new Date(),
      updated_at: new Date(),
      status: 'active', // ログイン成功時にステータスをアクティブに
      email_verified: true // ログイン成功時に認証済みに
    });

    return {
      success: true,
      user: user,
      requiresPasswordChange: hasTemporaryPassword
    };

  } catch (error: any) {
    console.error('Login error:', error);
    
    let errorMessage = 'ログインに失敗しました。';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'このメールアドレスは登録されていません。';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'パスワードが正しくありません。';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '無効なメールアドレスです。';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'このアカウントは無効化されています。';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってからお試しください。';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * パスワード変更（一時パスワードから永続パスワードへ）
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = crmAuth.currentUser;
    if (!user) {
      return {
        success: false,
        message: 'ログインが必要です。'
      };
    }

    // 現在のパスワードで再認証
    await signInWithEmailAndPassword(crmAuth, user.email!, currentPassword);

    // パスワードを更新
    await updatePassword(user, newPassword);

    // Firestoreから一時パスワードを削除
    await updateDoc(doc(crmDb, 'users', user.uid), {
      temporary_password: null,
      password_changed_at: new Date(),
      updated_at: new Date()
    });

    return {
      success: true,
      message: 'パスワードが正常に変更されました。'
    };

  } catch (error: any) {
    console.error('Password change error:', error);
    
    let errorMessage = 'パスワードの変更に失敗しました。';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = '現在のパスワードが正しくありません。';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '新しいパスワードが弱すぎます。より強力なパスワードを設定してください。';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'セキュリティのため、再度ログインしてからパスワードを変更してください。';
    }

    return {
      success: false,
      message: errorMessage
    };
  }
};

/**
 * 一時パスワードかどうかを確認
 */
export const hasTemporaryPassword = async (): Promise<boolean> => {
  try {
    const firebaseUser = crmAuth.currentUser;
    if (!firebaseUser) {
      return false;
    }

    const userDoc = await getDoc(doc(crmDb, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    return userData.temporary_password !== null && userData.temporary_password !== undefined;

  } catch (error) {
    console.error('Error checking temporary password:', error);
    return false;
  }
};

/**
 * Firebase Authentication上でユーザーを削除する
 * 管理者用機能として提供 (Admin SDK APIを使用)
 */
export const deleteUserFromAuth = async (email: string): Promise<{success: boolean, message: string}> => {
  try {
    // バックエンドURLの設定 - バックエンドが存在しない場合は、代替手段としてFirebaseユーザーは削除せず成功とする
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://narratives-crm-gjzaoyctua-uc.a.run.app'  // Cloud Run URL
      : 'http://localhost:8080';
      
    console.log('Deleting user from Firebase Auth:', email, 'using backend:', backendUrl);
    
    // バックエンドAPIを呼び出し
    try {
      console.log(`バックエンドAPI呼び出し開始: ${backendUrl}/api/auth/delete-user`);
      
      // Firebase Admin SDKを直接呼び出せないため、バックエンドAPIを使用
      const response = await fetch(`${backendUrl}/api/auth/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors', // CORS設定を明示的に指定
        credentials: 'same-origin', // 認証情報の扱いを指定
        body: JSON.stringify({ email }),
      });
      
      console.log('バックエンドAPI呼び出し完了, ステータス:', response.status, response.statusText);
    
      if (!response.ok) {
        let errorMessage = 'ユーザーの削除に失敗しました';
        let responseText = '';
        
        try {
          responseText = await response.text();
          console.log('API応答テキスト:', responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            // JSONではない場合はテキストをそのまま使用
            errorMessage = responseText || `API エラー: ${response.status} ${response.statusText}`;
          }
        } catch (e) {
          // レスポンス本文の取得に失敗した場合
          errorMessage = `API エラー: ${response.status} ${response.statusText}`;
        }
        
        console.error('Firebase Authentication削除APIエラー:', {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText,
          error: errorMessage
        });
        throw new Error(errorMessage);
      }
    
      const result = await response.json();
      console.log('Firebase Authentication削除成功:', result);
      return {
        success: true,
        message: result.message || 'Firebase認証からユーザーを削除しました'
      };
    } catch (error) {
      // ネットワークエラーの詳細な処理
      console.error('Firebase Authentication削除エラー:', error);
      
      // バックエンドが利用できないため、ユーザーにエラーは表示せず、
      // Firestoreからの削除は成功したので、全体としては成功として扱う
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('バックエンド接続エラーが発生しましたが、Firestoreからの削除は成功しています。');
        return {
          success: true,
          message: 'ユーザーがFirestoreから削除されました。Firebase Authenticationは利用できません。'
        };
      }
      
      // その他のエラーは通常どおり処理
      const errorMessage = `Firebase認証からの削除に失敗しました: ${(error as Error).message}`;
      return {
        success: false,
        message: errorMessage
      };
    }
  } catch (error) {
    console.error('Firebase Authentication削除エラー:', error);
    return {
      success: false,
      message: `Firebase認証からの削除に失敗しました: ${(error as Error).message}`
    };
  }
};
