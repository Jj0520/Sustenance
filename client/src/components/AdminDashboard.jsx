import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './AdminDashboard.css';
import { toast } from 'react-hot-toast';
import { buildApiUrl } from '../../config/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/donations'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Only show approved donations for signing
      const approvedDonations = data.filter(donation => donation.status === 'approved');
      setDonations(approvedDonations);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch donations');
      setLoading(false);
    }
  };

  const handleSignTransaction = async (donationId) => {
    try {
      const response = await fetch(buildApiUrl(`/api/donations/${donationId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        throw new Error('Failed to sign transaction');
      }

      // Update local state
      setDonations(donations.filter(d => d.id !== donationId));
      toast.success('Transaction signed successfully');
    } catch (error) {
      console.error('Error signing transaction:', error);
      toast.error('Failed to sign transaction');
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading-indicator">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-right">
          <span className="admin-badge">
            Administrator
          </span>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Welcome, {user?.user?.name || 'Administrator'}</h2>
        <p className="admin-description">
          Manage the platform, oversee donations, and ensure everything runs smoothly for our community.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/admin/users')}>
          <div className="card-icon">👥</div>
          <h3>User Management</h3>
          <p>Manage user accounts and permissions</p>
        </div>
        
        <div className="dashboard-card" onClick={() => navigate('/admin/recipients')}>
          <div className="card-icon">🏢</div>
          <h3>NGO Applications</h3>
          <p>Review and manage NGO registration requests</p>
        </div>
        
        <div className="dashboard-card" onClick={() => navigate('/admin/donations')}>
          <div className="card-icon">📊</div>
          <h3>Donation Tracker</h3>
          <p>Monitor and manage all donation activities</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/admin/SignTransactions')}>
          <div className="card-icon">✍️</div>
          <h3>Sign Transactions</h3>
          <p>Process and verify blockchain transactions</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/admin/analytics')}>
          <div className="card-icon">📈</div>
          <h3>Analytics & Reports</h3>
          <p>View platform statistics and generate reports</p>
        </div>

        {/* <div className="dashboard-card" onClick={() => navigate('/admin/settings')}>
          <div className="card-icon">⚙️</div>
          <h3>System Settings</h3>
          <p>Configure platform settings and preferences</p>
        </div> */}
      </div>

      <div className="admin-stats">
        <h3>📋 Platform Overview</h3>
        <p>Keep track of platform activity and ensure smooth operations for all users.</p>
      </div>
    </div>
  );
};

export default AdminDashboard; 