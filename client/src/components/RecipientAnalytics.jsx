import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import BackToDashboard from './BackToDashboard';
import './RecipientAnalytics.css';
import { AuthContext } from '../../contexts/AuthContext';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { buildApiUrl } from '../../config/api';

const RecipientAnalytics = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    totalDonations: 0,
    totalAmount: 0,
    totalGoods: 0,
    monthlyTrend: [],
    statusBreakdown: {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    },
    topDonors: [],
    recentDonations: [],
    categoryBreakdown: {},
    monthlyGrowth: 0
  });
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '30d', '90d', '1y'

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (!parsedUser.recipient) {
      navigate('/dashboard');
      return;
    }

    fetchAnalyticsData();
  }, [navigate, timeFilter]);

  const fetchAnalyticsData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/api/recipients/analytics?filter=${timeFilter}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '0.0%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
      completed: '#17a2b8'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return (
      <div className="recipient-analytics-container">
        <div className="loading-indicator">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="recipient-analytics-container">
      <div className="analytics-header">
        <BackToDashboard customText="Back to Dashboard" customPath="/recipient/dashboard" />
        <div className="header-content">
          <h1>Reports & Analytics</h1>
          <div className="time-filter">
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card total-donations">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <h3>Total Donations</h3>
            <div className="metric-value">{analyticsData.totalDonations}</div>
            <div className="metric-change positive">
              {formatPercentage(analyticsData.monthlyGrowth)} this month
            </div>
          </div>
        </div>

        <div className="metric-card total-amount">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Total Amount</h3>
            <div className="metric-value">{formatCurrency(analyticsData.totalMoney)}</div>
            <div className="metric-subtitle">Monetary donations</div>
          </div>
        </div>

        <div className="metric-card total-goods">
          <div className="metric-icon">📋</div>
          <div className="metric-content">
            <h3>Goods Donations</h3>
            <div className="metric-value">{analyticsData.totalGoods}</div>
            <div className="metric-subtitle">Items received</div>
          </div>
        </div>

        <div className="metric-card success-rate">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Success Rate</h3>
            <div className="metric-value">
              {analyticsData.totalDonations > 0 
                ? Math.round(((analyticsData.statusBreakdown.approved + analyticsData.statusBreakdown.completed) / analyticsData.totalDonations) * 100)
                : 0}%
            </div>
            <div className="metric-subtitle">Approved + Completed</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Donation Status Overview</h3>
          <div className="status-chart">
            {Object.entries(analyticsData.statusBreakdown).map(([status, count]) => (
              <div key={status} className="status-bar">
                <div className="status-label">
                  <span className="status-dot" style={{ backgroundColor: getStatusColor(status) }}></span>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
                <div className="status-progress">
                  <div 
                    className="status-fill" 
                    style={{ 
                      width: analyticsData.totalDonations > 0 
                        ? `${(count / analyticsData.totalDonations) * 100}%` 
                        : '0%',
                      backgroundColor: getStatusColor(status)
                    }}
                  ></div>
                </div>
                <div className="status-count">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3>Donation Categories</h3>
          <div className="category-chart">
            {Object.entries(analyticsData.categoryBreakdown).length > 0 ? (
              Object.entries(analyticsData.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="category-item">
                  <div className="category-name">{category}</div>
                  <div className="category-bar">
                    <div 
                      className="category-fill"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(analyticsData.categoryBreakdown))) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="category-count">{count}</div>
                </div>
              ))
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Donors Section */}
      <div className="donors-section">
        <h3>Top Donors</h3>
        <div className="donors-list">
          {analyticsData.topDonors.length > 0 ? (
            analyticsData.topDonors.map((donor, index) => (
              <div key={donor.id} className="donor-item">
                <div className="donor-rank">#{index + 1}</div>
                <div className="donor-info">
                  <div className="donor-name">{donor.name}</div>
                  <div className="donor-stats">
                    {donor.totalAmount > 0 && (
                      <span className="donor-amount">{formatCurrency(donor.totalAmount)}</span>
                    )}
                    <span className="donor-count">{donor.donationCount} donations</span>
                  </div>
                </div>
                <div className="donor-badge">
                  {donor.donationCount >= 10 ? '🏆' : donor.donationCount >= 5 ? '🥈' : '🥉'}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No donor data available</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h3>Recent Donation Activity</h3>
        <div className="activity-list">
          {analyticsData.recentDonations.length > 0 ? (
            analyticsData.recentDonations.map((donation) => (
              <div key={donation.id} className="activity-item">
                <div className="activity-icon">
                  {donation.donation_type === 'money' ? '💰' : '📦'}
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {donation.donation_type === 'money' 
                      ? `${formatCurrency(donation.amount)} donation`
                      : `${donation.item_type} donation`
                    }
                  </div>
                  <div className="activity-meta">
                    From {donation.donor_name} • {new Date(donation.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`activity-status status-${donation.status}`}>
                  {donation.status}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No recent activity</div>
          )}
        </div>
      </div>

      {/* Insights Section */}
      <div className="insights-section">
        <h3>📈 Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Most Popular Donation Type</h4>
            <p>
              {analyticsData.totalAmount > 0 && analyticsData.totalGoods > 0
                ? analyticsData.totalAmount > analyticsData.totalGoods * 50 
                  ? 'Monetary donations are more common'
                  : 'Goods donations are more popular'
                : analyticsData.totalAmount > 0 
                  ? 'Only monetary donations received'
                  : 'Only goods donations received'
              }
            </p>
          </div>
          
          <div className="insight-card">
            <h4>Approval Rate</h4>
            <p>
              {analyticsData.totalDonations > 0
                ? `${Math.round(((analyticsData.statusBreakdown.approved + analyticsData.statusBreakdown.completed) / analyticsData.totalDonations) * 100)}% of donations are approved`
                : 'No donations to analyze yet'
              }
            </p>
          </div>
          
          <div className="insight-card">
            <h4>Growth Trend</h4>
            <p>
              {analyticsData.monthlyGrowth > 0 
                ? `Donations increased by ${formatPercentage(analyticsData.monthlyGrowth)} this month`
                : analyticsData.monthlyGrowth < 0
                  ? `Donations decreased by ${formatPercentage(Math.abs(analyticsData.monthlyGrowth))} this month`
                  : 'No significant change in donation volume'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientAnalytics; 