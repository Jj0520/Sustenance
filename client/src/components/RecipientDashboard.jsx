import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipientDashboard.css';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../contexts/AuthContext';
import RecipientDonations from './RecipientDonations';
import { buildApiUrl } from '../config/api';

const RecipientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, token, login } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankData, setBankData] = useState({
    bank_name: user?.recipient?.bank_name || '',
    bank_account_number: user?.recipient?.bank_account_number || '',
    bank_account_holder: user?.recipient?.bank_account_holder || ''
  });
  const [bankLoading, setBankLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setProfile(parsedUser.recipient);
    // Fetch latest profile from backend
    const fetchProfile = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/recipients/profile'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setProfile(data.recipient);
          login(data.user);
        } else {
          throw new Error(data.message || 'Failed to fetch profile');
        }
      } catch (error) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, token, login]);

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
      login(updatedProfile);
      toast.success('Bank details updated!');
      setShowBankModal(false);
    } catch (error) {
      toast.error('Failed to update bank details');
    } finally {
      setBankLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile) => {
    try {
      const response = await fetch(buildApiUrl('/api/recipients/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProfile)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Profile updated successfully!');
        login(data.user);
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handlePhotoUpload = async (photoFile) => {
    // ...
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      const profileRes = await fetch(buildApiUrl('/api/recipients/profile'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const updatedProfile = await profileRes.json();
      if (profileRes.ok) {
        toast.success('Photo uploaded!');
        login(updatedProfile);
      } else {
        throw new Error(updatedProfile.message || 'Failed to upload photo');
      }
    } catch (error) {
      // ...
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