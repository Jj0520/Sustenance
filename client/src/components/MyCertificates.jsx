import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Certificate from './Certificate';
import BackToDashboard from './BackToDashboard';
import './MyCertificates.css';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

const MyCertificates = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    fetchUserDonations();
  }, [navigate]);

  const fetchUserDonations = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const response = await fetch(buildApiUrl('/api/donations/user'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter donations that are approved/completed and eligible for certificates
        const approvedDonations = data.filter(donation => 
          (donation.status === 'approved' || donation.status === 'completed') && 
          (donation.transaction_hash || donation.donation_type === 'goods')
        );
        setDonations(approvedDonations);
      } else {
        setError('Failed to fetch donations');
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setError('Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = (donation) => {
    console.log('Viewing certificate for donation:', donation);
    setSelectedDonation(donation);
    setShowCertificate(true);
  };

  const handleCloseCertificate = () => {
    setShowCertificate(false);
    setSelectedDonation(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (donation) => {
    if (donation.donation_type === 'money') {
      return `$${parseFloat(donation.amount).toFixed(2)}`;
    } else {
      return `${donation.quantity} ${donation.item_type}`;
    }
  };

  if (loading) {
    return (
      <div className="certificates-container">
        <div className="page-header">
          <div className="header-content">
            <div className="back-to-dashboard-wrapper">
              <BackToDashboard />
            </div>
            <h1 className="page-title">My Certificates</h1>
          </div>
        </div>
        <div className="loading-indicator">Loading your certificates...</div>
      </div>
    );
  }

  return (
    <div className="certificates-container">
      <div className="page-header">
        <div className="header-content">
          <div className="back-to-dashboard-wrapper">
            <BackToDashboard />
          </div>
          <h1 className="page-title">My Certificates</h1>
          <p className="page-subtitle">View and download your verified donation certificates</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {donations.length === 0 ? (
        <div className="no-certificates">
          <div className="no-certificates-icon">📜</div>
          <h3>No Certificates Available</h3>
          <p>You don't have any verified donation certificates yet.</p>
          <p>Complete a donation to receive your first certificate!</p>
          <button 
            className="donate-btn"
            onClick={() => navigate('/donate')}
          >
            Make a Donation
          </button>
        </div>
      ) : (
        <div className="certificates-grid">
          {donations.map((donation) => (
            <div key={`${donation.donation_type}-${donation.id}`} className="certificate-card">
              <div className="certificate-header">
                <div className="certificate-icon">
                  {donation.donation_type === 'money' ? '💰' : '📦'}
                </div>
                <div className="certificate-type">
                  {donation.donation_type === 'money' ? 'Monetary Donation' : 'Goods Donation'}
                </div>
              </div>
              
              <div className="certificate-details">
                <div className="detail-item">
                  <span className="label">Amount/Item:</span>
                  <span className="value">{formatAmount(donation)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Recipient:</span>
                  <span className="value">{donation.recipient_name || 'General Fund'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(donation.created_at)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Transaction:</span>
                  {donation.transaction_hash ? (
                    <a 
                      href={`https://explorer.aptoslabs.com/txn/${donation.transaction_hash}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="value transaction-hash clickable"
                      title="View on Aptos Explorer"
                    >
                      {`${donation.transaction_hash.slice(0, 8)}...${donation.transaction_hash.slice(-8)}`}
                    </a>
                  ) : (
                    <span className="value transaction-hash">Pending</span>
                  )}
                </div>
              </div>
              
              <div className="certificate-actions">
                <button 
                  className="view-certificate-btn"
                  onClick={() => {
                    console.log('Button clicked!', donation);
                    handleViewCertificate(donation);
                  }}
                >
                  View Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCertificate && selectedDonation && (
        <Certificate
          donation={selectedDonation}
          onClose={handleCloseCertificate}
        />
      )}
      

    </div>
  );
};

export default MyCertificates; 