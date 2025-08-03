import React from 'react';
import UserModel from '../models/Users';
import './LeftSidebar.css';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onShowOrganization?: () => void;
  onShowNews?: () => void;
  onShowCustomer?: () => void;
  currentUser?: UserModel | null;
}

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  badge?: number;
  isActive?: boolean;
  isComingSoon?: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isOpen, onClose, onShowOrganization, onShowNews, onShowCustomer, currentUser }) => {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', isActive: true },
    { id: 'news', icon: '📰', label: 'ニュース' },
    ...(currentUser && currentUser.canCreateCompany() ? [
      { id: 'organization', icon: '🏢', label: '組織' }
    ] : []),
    { id: 'customers', icon: '👥', label: '顧客', badge: 24 },
    { id: 'orders', icon: '📦', label: 'Orders', badge: 8, isComingSoon: true },
    { id: 'interactions', icon: '💬', label: 'Interactions', badge: 12, isComingSoon: true },
    { id: 'files', icon: '📁', label: 'File Manager' },
    { id: 'analytics', icon: '📈', label: 'Analytics', isComingSoon: true },
    { id: 'reports', icon: '📋', label: 'Reports', isComingSoon: true },
    { id: 'settings', icon: '⚙️', label: 'Settings', isComingSoon: true },
  ];

  const quickActions = [
    { id: 'new-customer', icon: '➕', label: 'New Customer' },
    { id: 'new-order', icon: '🛒', label: 'New Order' },
    { id: 'upload-file', icon: '📤', label: 'Upload File' },
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.id === 'organization' && onShowOrganization) {
      onShowOrganization();
      onClose();
    } else if (item.id === 'news' && onShowNews) {
      onShowNews();
      onClose();
    } else if (item.id === 'customers' && onShowCustomer) {
      onShowCustomer();
      onClose();
    } else if (item.isComingSoon) {
      alert(`${item.label} feature is coming soon!`);
    } else {
      console.log(`Navigate to ${item.label}`);
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`left-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Navigation</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h4 className="nav-section-title">Main Menu</h4>
              <ul className="nav-list">
                {menuItems.map((item) => (
                  <li key={item.id} className="nav-item">
                    <button
                      className={`nav-link ${item.isActive ? 'active' : ''} ${item.isComingSoon ? 'coming-soon' : ''} ${item.id === 'organization' ? 'organization' : ''} ${item.id === 'news' ? 'news' : ''}`}
                      onClick={() => handleMenuItemClick(item)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      {item.badge && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                      {item.isComingSoon && (
                        <span className="coming-soon-badge">Soon</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="nav-section">
              <h4 className="nav-section-title">Quick Actions</h4>
              <ul className="nav-list">
                {quickActions.map((action) => (
                  <li key={action.id} className="nav-item">
                    <button
                      className="nav-link quick-action"
                      onClick={() => handleMenuItemClick(action)}
                    >
                      <span className="nav-icon">{action.icon}</span>
                      <span className="nav-label">{action.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="system-status">
              <div className="status-item">
                <span className="status-indicator active"></span>
                <span className="status-text">GraphQL: Online</span>
              </div>
              <div className="status-item">
                <span className="status-indicator active"></span>
                <span className="status-text">Firebase: Connected</span>
              </div>
            </div>
            
            <div className="version-info">
              <p>Narratives CRM v1.0.0</p>
              <p>Built with React + GraphQL</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeftSidebar;
