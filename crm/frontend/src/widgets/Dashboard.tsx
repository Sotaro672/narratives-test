import React, { useState, useEffect } from 'react';
import './Dashboard.css';

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  revenue: number;
  activeProjects: number;
}

interface RecentActivity {
  id: number;
  type: 'customer' | 'order' | 'project' | 'interaction';
  description: string;
  time: string;
  status?: 'success' | 'pending' | 'warning';
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalOrders: 0,
    revenue: 0,
    activeProjects: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      // 実際のAPIコール用の遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStats({
        totalCustomers: 1247,
        totalOrders: 3456,
        revenue: 892340,
        activeProjects: 28
      });

      setRecentActivities([
        {
          id: 1,
          type: 'customer',
          description: 'New customer registration: John Smith',
          time: '5 minutes ago',
          status: 'success'
        },
        {
          id: 2,
          type: 'order',
          description: 'Order #ORD-2025-0789 completed',
          time: '12 minutes ago',
          status: 'success'
        },
        {
          id: 3,
          type: 'project',
          description: 'Project "Website Redesign" updated',
          time: '25 minutes ago',
          status: 'pending'
        },
        {
          id: 4,
          type: 'interaction',
          description: 'Customer support ticket resolved',
          time: '1 hour ago',
          status: 'success'
        },
        {
          id: 5,
          type: 'order',
          description: 'Payment pending for Order #ORD-2025-0788',
          time: '2 hours ago',
          status: 'warning'
        }
      ]);

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      customer: '👤',
      order: '🛒',
      project: '📋',
      interaction: '💬'
    };
    return icons[type] || '📄';
  };

  const getStatusColor = (status?: string) => {
    const colors: { [key: string]: string } = {
      success: '#10B981',
      pending: '#F59E0B',
      warning: '#EF4444'
    };
    return colors[status || 'success'] || '#6B7280';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Monitor your business performance</p>
        </div>
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <p>Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Customers</h3>
            <p className="stat-number">{stats.totalCustomers.toLocaleString()}</p>
            <span className="stat-change positive">+12% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-number">{stats.totalOrders.toLocaleString()}</p>
            <span className="stat-change positive">+8% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Revenue</h3>
            <p className="stat-number">{formatCurrency(stats.revenue)}</p>
            <span className="stat-change positive">+15% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <h3>Active Projects</h3>
            <p className="stat-number">{stats.activeProjects}</p>
            <span className="stat-change neutral">No change</span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-activities">
        <h3>Recent Activities</h3>
        <div className="activities-list">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{getActivityIcon(activity.type)}</div>
              <div className="activity-content">
                <p className="activity-description">{activity.description}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
              <div 
                className="activity-status"
                style={{ backgroundColor: getStatusColor(activity.status) }}
              ></div>
            </div>
          ))}
        </div>
        <button className="view-all-btn">View All Activities</button>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <span className="action-icon">➕</span>
            <span>Add Customer</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📋</span>
            <span>Create Order</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📊</span>
            <span>View Reports</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
