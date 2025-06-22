import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipientDashboard.css';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';
import RecipientDonations from './RecipientDonations';
import { buildApiUrl } from '../config/api';

const RecipientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({
    bank_name: user?.recipient?.bank_name || '',
    bank_account_number: user?.recipient?.bank_account_number || '',
    bank_account_holder: user?.recipient?.bank_account_holder || ''
  });
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    // Fetch latest profile from backend
    const fetchProfile = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/recipients/profile'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const profile = await response.json();
          const updatedUser = { ...parsedUser, recipient: { ...parsedUser.recipient, ...profile } };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleSocialFeedClick = () => {
    navigate('/social-feed');
  };

  const openBankModal = () => {
    setBankData({
      bank_name: user?.recipient?.bank_name || '',
      bank_account_number: user?.recipient?.bank_account_number || '',
      bank_account_holder: user?.recipient?.bank_account_holder || ''
    });
    setShowBankModal(true);
  };
  const closeBankModal = () => setShowBankModal(false);

  const handleBankChange = (e) => {
    setBankData({ ...bankData, [e.target.name]: e.target.value });
  };

  const handleBankSave = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const formDataToSend = new FormData();
      formDataToSend.append('bank_name', bankData.bank_name);
      formDataToSend.append('bank_account_number', bankData.bank_account_number);
      formDataToSend.append('bank_account_holder', bankData.bank_account_holder);
      const response = await fetch(buildApiUrl('/api/recipients/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      if (!response.ok) throw new Error('Failed to update bank details');
      // Fetch latest profile
      const profileRes = await fetch(buildApiUrl('/api/recipients/profile'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updatedProfile = await profileRes.json();
      // Update user in state and localStorage
      const updatedUser = { ...user, recipient: { ...user.recipient, ...updatedProfile } };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Bank details updated!');
      setShowBankModal(false);
    } catch (error) {
      toast.error('Failed to update bank details');
    } finally {
      setBankLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="recipient-dashboard-container">
        <div className="loading-indicator">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="recipient-dashboard-container">
      <div className="dashboard-header">
        <h1>NGO Dashboard</h1>
        <div className="header-right">
          <span className={`status-badge ${user?.recipient?.status || 'pending'}`}>
            Status: {user?.recipient?.status || 'Pending'}
          </span>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Welcome, {user?.recipient?.ngo_name}</h2>
        <p className="ngo-description">
          Manage your donations, update your profile, and view your verification status.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/recipient/donations')}>
          <div className="card-icon">📦</div>
          <h3>Donation Management</h3>
          <p>View and manage incoming donations</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/recipient/profile')}>
          <div className="card-icon">👤</div>
          <h3>Edit Profile</h3>
          <p>Update your NGO information</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/recipient/reports')}>
          <div className="card-icon">📊</div>
          <h3>Reports & Analytics</h3>
          <p>View donation statistics and reports</p>
        </div>

        <div className="dashboard-card" onClick={handleSocialFeedClick}>
          <div className="card-icon">📰</div>
          <h3>Social Feed</h3>
          <p>See updates and stories from NGOs</p>
        </div>

        {/* Payment Method Card */}
        <div className="dashboard-card payment-method-card" onClick={openBankModal} style={{cursor: 'pointer'}}>
          <div className="card-icon">🏦</div>
          <h3>Payment Method</h3>
          <p style={{marginBottom: 8}}>
            <strong>Bank Name:</strong> {user?.recipient?.bank_name || <span style={{color:'#aaa'}}>Not set</span>}<br/>
            <strong>Account Number:</strong> {user?.recipient?.bank_account_number || <span style={{color:'#aaa'}}>Not set</span>}<br/>
            <strong>Account Holder:</strong> {user?.recipient?.bank_account_holder || <span style={{color:'#aaa'}}>Not set</span>}
          </p>
        </div>
      </div>

      {user?.recipient?.status === 'pending' && (
        <div className="verification-notice">
          <h3>⚠️ Verification Pending</h3>
          <p>Your NGO account is currently under review. We'll notify you once the verification is complete.</p>
        </div>
      )}

      {/* Bank Edit Modal */}
      {showBankModal && (
        <div className="modal-overlay" onClick={closeBankModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 400}}>
            <button className="close-button" onClick={closeBankModal}>&times;</button>
            <h2>Edit Bank Details</h2>
            <form onSubmit={handleBankSave} className="profile-form">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={bankData.bank_name}
                  onChange={handleBankChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={bankData.bank_account_number}
                  onChange={handleBankChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Account Holder</label>
                <input
                  type="text"
                  name="bank_account_holder"
                  value={bankData.bank_account_holder}
                  onChange={handleBankChange}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={closeBankModal} disabled={bankLoading}>Cancel</button>
                <button type="submit" className="submit-button" disabled={bankLoading}>{bankLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientDashboard; 