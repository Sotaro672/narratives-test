import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_HEALTH } from '../models/graphql';
import NewsField from './NewsField';
import './MainBody.css';

interface MainBodyProps {
  isLoggedIn: boolean;
}

const MainBody: React.FC<MainBodyProps> = ({ isLoggedIn }) => {
  const { data, loading, error } = useQuery(GET_HEALTH);

  // ログイン状態に応じて適切なコンポーネントを表示
  if (isLoggedIn) {
    return (
      <div className="main-body">
        <div className="welcome-section">
          <h2>ダッシュボード</h2>
          <p>CRMシステムへようこそ。各種機能をご利用ください。</p>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h4>📊 概要</h4>
              <p>システムの使用状況と統計情報</p>
              <button className="dashboard-btn">詳細を見る</button>
            </div>

            <div className="dashboard-card">
              <h4>👥 顧客管理</h4>
              <p>顧客情報の登録・編集・管理</p>
              <button className="dashboard-btn">管理画面へ</button>
            </div>

            <div className="dashboard-card">
              <h4>💰 ウォレット</h4>
              <p>Solanaウォレットの管理</p>
              <button className="dashboard-btn">ウォレット確認</button>
            </div>
          </div>
        </div>

        {/* ログイン状態でもNewsFieldを表示 */}
        <NewsField />
      </div>
    );
  }

  return (
    <div className="main-body">
      <div className="welcome-section">
        <h2>Narratives CRMへようこそ</h2>
        <p>顧客管理、注文処理、インタラクション管理を効率的に行えます。</p>
      </div>

      {/* NewsField を上部に移動 */}
      <NewsField />

      <div className="status-section">
        <h3>システム状況</h3>
        <div className="status-cards">
          <div className="status-card">
            <h4>GraphQLサーバー</h4>
            {loading && <p className="status-loading">確認中...</p>}
            {error && <p className="status-error">エラー: {error.message}</p>}
            {data && (
              <div className="status-success">
                <p>✅ 接続済み</p>
                <p className="status-message">{data.health}</p>
              </div>
            )}
          </div>

          <div className="status-card">
            <h4>Firebaseストレージ</h4>
            <div className="status-success">
              <p>✅ 利用可能</p>
              <p className="status-message">narratives-crm project</p>
            </div>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h3>利用可能な機能</h3>
        <div className="features-grid">
          <div className="feature-card active">
            <h4>📁 ファイルアップロード</h4>
            <p>Firebaseストレージにアバターやファイルをアップロード</p>
            <button className="feature-btn">利用可能</button>
          </div>

          <div className="feature-card active">
            <h4>🔍 GraphQL Playground</h4>
            <p>GraphQLクエリとミューテーションのテスト</p>
            <a 
              href="https://narratives-crm-699392181476-hdgue3uuja-uc.a.run.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="feature-btn"
            >
              Playgroundを開く
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainBody;
