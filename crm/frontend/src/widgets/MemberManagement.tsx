import React, { useState, useEffect } from 'react';
import { crmDb, crmAuth } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import BusinessUserModel from '../models/BusinessUsers';
import { EmailService } from '../services/emailService';
import { deleteUserFromAuth } from '../services/authService';
import './MemberManagement.css';

interface MemberManagementProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  companyId: string;
}

interface MemberInfo {
  id: string;
  user: BusinessUserModel;
  status: string;
  emailVerified: boolean;
}

const MemberManagement: React.FC<MemberManagementProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  companyId 
}) => {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // メンバー一覧を取得（一回限り）
  const fetchMembers = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const membersQuery = query(
        collection(crmDb, 'business_users'),
        where('belong_to', 'array-contains', companyId)
      );
      
      const querySnapshot = await getDocs(membersQuery);
      const membersList: MemberInfo[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const user = BusinessUserModel.fromDocument({
          data: () => data
        });
        
        membersList.push({
          id: doc.id,
          user: user,
          status: data.status || 'active',
          emailVerified: data.email_verified || false
        });
      });
      
      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching members:', error);
      alert('メンバー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // リアルタイムでメンバー一覧を監視
  const setupRealtimeListener = () => {
    if (!companyId) return;

    const membersQuery = query(
      collection(crmDb, 'business_users'),
      where('belong_to', 'array-contains', companyId)
    );

    const unsubscribeListener = onSnapshot(membersQuery, 
      (querySnapshot) => {
        const membersList: MemberInfo[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const user = BusinessUserModel.fromDocument({
            data: () => data
          });
          
          membersList.push({
            id: doc.id,
            user: user,
            status: data.status || 'active',
            emailVerified: data.email_verified || false
          });
        });
        
        setMembers(membersList);
        console.log('メンバー一覧がリアルタイムで更新されました:', membersList.length);
      },
      (error) => {
        console.error('リアルタイムリスナーエラー:', error);
      }
    );

    setUnsubscribe(() => unsubscribeListener);
  };

  // 役割を変更
  const handleRoleChange = async (memberId: string, newRoleValue: string) => {
    try {
      setLoading(true);
      
      await updateDoc(doc(crmDb, 'business_users', memberId), {
        role: newRoleValue,
        updated_at: new Date()
      });
      
      // ローカル状態を更新
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, user: member.user.copyWith({ role: newRoleValue }) }
          : member
      ));
      
      setEditingMember(null);
      alert('役割を変更しました');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('役割の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // メンバーを削除
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName}さんを削除しますか？この操作は取り消せません。\n\n注意：FirebaseのAuthentication情報も削除されます。`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 対象ユーザーのメールアドレスを取得
      const member = members.find(m => m.id === memberId);
      if (!member) {
        throw new Error('メンバー情報が見つかりません');
      }
      
      const email = member.user.emailAddress;
      
      console.log(`メンバー削除処理開始: ${memberName} (ID: ${memberId}, Email: ${email})`);
      
      // 現在のユーザーが認証されているか確認
      const currentAuthUser = crmAuth.currentUser;
      if (!currentAuthUser) {
        throw new Error('認証情報が取得できません。再ログインしてください。');
      }

      console.log(`削除操作を実行するユーザー: ${currentAuthUser.email}, ユーザーID: ${currentAuthUser.uid}`);
      
      // 現在のユーザーの権限を確認
      if (currentUser.role !== 'admin' && currentUser.role !== 'root') {
        throw new Error('メンバー削除の権限がありません。管理者にお問い合わせください。');
      }
      
      try {
        // Firestoreからユーザーを削除（business_usersコレクション）
        await deleteDoc(doc(crmDb, 'business_users', memberId));
        console.log(`Firestoreからユーザー削除成功: ${memberName} (ID: ${memberId})`);
      } catch (firestoreError) {
        console.error('Firestore削除エラー:', firestoreError);
        
        // 詳細なエラーメッセージ
        let errorMsg = 'Firestoreからの削除に失敗しました';
        if ((firestoreError as any).code === 'permission-denied') {
          errorMsg = 'メンバーを削除する権限がありません。管理者権限があるか確認してください。';
        } else if ((firestoreError as Error).message) {
          errorMsg = `${errorMsg}: ${(firestoreError as Error).message}`;
        }
        
        throw new Error(errorMsg);
      }
      
      // Firebase Authenticationからも削除
      const authResult = await deleteUserFromAuth(email);
      console.log('Firebase Authentication削除結果:', authResult);
      
      // ローカル状態から削除
      setMembers(prev => prev.filter(member => member.id !== memberId));
      
      if (authResult.success) {
        alert(`${memberName}さんを削除しました。Firebase認証情報も削除されました。`);
      } else {
        alert(`${memberName}さんをFirestoreから削除しましたが、Firebase認証情報の削除に失敗しました。\n詳細: ${authResult.message}`);
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('メンバーの削除に失敗しました: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 認証メールを再送信
  const handleResendInvitation = async (member: MemberInfo) => {
    if (!confirm(`${member.user.getFullName()}さんに認証メールを再送信しますか？新しい一時パスワードが発行されます。`)) {
      return;
    }

    try {
      setLoading(true);
      
      await EmailService.resendInvitationEmail(member.id);
      
      // ローカル状態を更新（resendCount を増やすなどの処理）
      await fetchMembers(); // 最新の状態を再取得
      
      alert(`${member.user.getFullName()}さんに認証メールを再送信しました`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('認証メールの再送信に失敗しました: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 役割編集開始
  const startEditingRole = (memberId: string, currentRole: string) => {
    setEditingMember(memberId);
    setNewRole(currentRole);
  };

  // 役割編集キャンセル
  const cancelEditingRole = () => {
    setEditingMember(null);
    setNewRole('');
  };

  // モーダルが開かれた時にリアルタイムリスナーを設定
  useEffect(() => {
    if (isOpen) {
      setupRealtimeListener();
    } else {
      // モーダルが閉じられた時にリスナーを解除
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
    }

    // コンポーネントがアンマウントされる時にリスナーを解除
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
        <div className="modal-content member-management-modal">
        <div className="modal-header">
          <h2>👥 メンバー管理</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>        <div className="member-management-body">
          {loading ? (
            <div className="loading-state">
              <p>📊 メンバー情報を読み込み中...</p>
            </div>
          ) : (
            <>
              <div className="members-header">
                <h3>登録メンバー一覧 ({members.length}名)</h3>
                <button 
                  className="refresh-btn"
                  onClick={fetchMembers}
                  disabled={loading}
                >
                  🔄 更新
                </button>
              </div>

              {members.length === 0 ? (
                <div className="no-members">
                  <p>🚫 登録されているメンバーがいません</p>
                </div>
              ) : (
                <div className="members-list">
                  {members.map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-info">
                        <div className="member-name">
                          <h4>{member.user.getFullName()}</h4>
                          <span className="member-name-katakana">
                            {member.user.getFullNameKatakana()}
                          </span>
                        </div>
                        
                        <div className="member-details">
                          <p className="member-email">
                            📧 {member.user.emailAddress}
                          </p>
                          
                          <div className="member-status">
                            <span className={`status-badge ${member.status}`}>
                              {member.status === 'active' ? '✅ アクティブ' : 
                               member.status === 'invited' ? '📧 招待中' : 
                               '❌ 非アクティブ'}
                            </span>
                            
                            {member.emailVerified ? (
                              <span className="verified-badge">✅ 認証済み</span>
                            ) : (
                              <span className="unverified-badge">⏳ 未認証</span>
                            )}
                          </div>

                          {/* 未認証ユーザーに再送信ボタンを表示 */}
                          {!member.emailVerified && (
                            <div className="resend-section">
                              <button
                                className="resend-invitation-btn"
                                onClick={() => handleResendInvitation(member)}
                                disabled={loading}
                              >
                                📧 認証メール再送信
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="member-actions">
                        <div className="role-section">
                          {editingMember === member.id ? (
                            <div className="role-edit">
                              <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                className="role-select-edit"
                              >
                                <option value="user">一般ユーザー</option>
                                <option value="production_manager">生産計画責任者</option>
                                <option value="token_designer">トークン設計者</option>
                                <option value="customer_support_manager">カスタマーサポート責任者</option>
                                <option value="admin">ブランド管理者</option>
                              </select>
                              <div className="role-edit-actions">
                                <button
                                  className="save-role-btn"
                                  onClick={() => handleRoleChange(member.id, newRole)}
                                  disabled={loading}
                                >
                                  💾 保存
                                </button>
                                <button
                                  className="cancel-role-btn"
                                  onClick={cancelEditingRole}
                                  disabled={loading}
                                >
                                  ❌ キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="role-display">
                              <span className="current-role">
                                🎭 {member.user.getRoleDisplayName()}
                              </span>
                              
                              {/* ルート管理者と自分自身の役割は変更できない */}
                              {member.user.userId !== currentUser.userId && !member.user.isRoot() && (
                                <button
                                  className="edit-role-btn"
                                  onClick={() => startEditingRole(member.id, member.user.role)}
                                  disabled={loading}
                                >
                                  ✏️ 役割変更
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ルート管理者は削除できない & 自分自身は削除できない */}
                        {member.user.userId !== currentUser.userId && !member.user.isRoot() && (
                          <button
                            className="delete-member-btn"
                            onClick={() => handleDeleteMember(member.id, member.user.getFullName())}
                            disabled={loading}
                          >
                            🗑️ 削除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberManagement;
