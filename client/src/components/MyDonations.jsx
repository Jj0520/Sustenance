import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Certificate from './Certificate';
import BackToDashboard from './BackToDashboard';
import './MyDonations.css';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';

const MyDonations = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [stats, setStats] = useState({
    totalDonations: 0,
    impactPercentage: 0,
    pendingDonations: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [modalDonation, setModalDonation] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'goods', 'money'

  useEffect(() => {
    const fetchDonations = async () => {
      if (!token) return;
      try {
        const response = await fetch(buildApiUrl('/api/donations/user'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setDonations(data);
        
        // Calculate stats
        const totalDonations = data.length;
        const approvedDonations = data.filter(d => d.transaction_hash).length;
        const pendingDonations = data.filter(d => d.status === 'pending').length;
        const impactPercentage = totalDonations > 0 
          ? Math.round((approvedDonations / totalDonations) * 100) 
          : 0;
        
        setStats({
          totalDonations: approvedDonations,
          impactPercentage,
          pendingDonations
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching donations:', error);
        setLoading(false);
      }
    };

    fetchDonations();
  }, [token]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-badge approved';
      case 'rejected':
        return 'status-badge rejected';
      case 'pending':
        return 'status-badge pending';
      default:
        return 'status-badge';
    }
  };

  const handleGenerateCertificate = (donation) => {
    setSelectedDonation(donation);
  };

  const handleCloseCertificate = () => {
    setSelectedDonation(null);
  };

  const handleHistoryItemClick = (donation) => {
    setModalDonation(donation);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalDonation(null);
  };

  // Tab filter logic
  const getFilteredDonations = () => {
    if (activeTab === 'goods') {
      return donations.filter(d => d.donation_type === 'goods');
    } else if (activeTab === 'money') {
      return donations.filter(d => d.donation_type === 'money');
    }
    return donations;
  };
  const filteredDonations = getFilteredDonations();

  if (loading) {
    return <div className="loading-container">Loading your donations...</div>;
  }

  return (
    <div className="my-donations-page">
      {selectedDonation && (
        <Certificate 
          donation={selectedDonation} 
          onClose={handleCloseCertificate} 
        />
      )}
      
      <div className="page-header">
        <div className="header-content">
          <div className="back-to-dashboard-wrapper">
            <BackToDashboard />
          </div>
          <h1 className="page-title">My Donations Dashboard</h1>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-row">
          {/* Total Donations Widget */}
          <div className="widget total-donations">
            <h3>Approved Donations</h3>
            <div className="widget-content">
              <div className="big-number">{stats.totalDonations}</div>
              <div className="widget-description">
                Items verified on blockchain
              </div>
            </div>
          </div>

          {/* Impact Percentage Widget */}
          <div className="widget impact-percentage">
            <h3>Total Impact</h3>
            <div className="widget-content">
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${stats.impactPercentage}%` }}
                ></div>
              </div>
              <div className="percentage-value">{stats.impactPercentage}%</div>
              <div className="widget-description">
                of your donations have been approved
              </div>
            </div>
          </div>

          {/* Pending Donations Widget */}
          <div className="widget pending-donations">
            <h3>Pending Requests</h3>
            <div className="widget-content">
              <div className="big-number">{stats.pendingDonations}</div>
              <div className="widget-description">
                Awaiting approval
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          {/* Donation History Widget */}
          <div className="widget donation-history">
            <h3>Donation History</h3>
            {/* Tabs */}
            <div className="donation-tabs">
              <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All</button>
              <button className={activeTab === 'goods' ? 'active' : ''} onClick={() => setActiveTab('goods')}>Goods</button>
              <button className={activeTab === 'money' ? 'active' : ''} onClick={() => setActiveTab('money')}>Monetary</button>
            </div>
            <div className="widget-content scrollable">
              {filteredDonations.length === 0 ? (
                <p className="no-data">No donations yet</p>
              ) : (
                <ul className="history-list">
                  {filteredDonations.map(donation => (
                    <li key={donation.id} className="history-item" onClick={() => handleHistoryItemClick(donation)} style={{cursor: 'pointer'}}>
                      <span className="history-item-type">
                        {donation.donation_type === 'money' ? '💰 Monetary' : donation.item_type || 'Goods'}
                      </span>
                      <span className={getStatusBadgeClass(donation.status)}>
                        {donation.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Certificates Widget */}
          <div className="widget certificates">
            <h3>My Certificates</h3>
            <div className="widget-content">
              {donations.filter(d => d.transaction_hash).length === 0 ? (
                <p className="no-data">No certificates yet</p>
              ) : (
                <div className="certificates-preview">
                  <div className="certificate-count">
                    {donations.filter(d => d.transaction_hash).length}
                  </div>
                  <p>Blockchain verified donations</p>
                  <button className="view-certificates-btn" onClick={() => navigate('/certificates')}>
                    View Certificates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="recent-donations-section">
          <h3>Recent Donations</h3>
          {donations.length === 0 ? (
            <div className="no-donations">
              <p>You haven't made any donations yet.</p>
              <button className="donate-now-button" onClick={() => navigate('/donate')}>
                Donate Now
              </button>
            </div>
          ) : (
            <div className="recent-donations-list">
              {donations.slice(0, 3).map((donation) => (
                <div key={donation.id} className="donation-card">
                  <div className="donation-header">
                    <h4>Donation #{donation.donation_id || donation.id}</h4>
                    <span className={getStatusBadgeClass(donation.status)}>
                      {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="donation-details">
                    <div className="detail-row">
                      <span className="detail-label">Item:</span>
                      <span className="detail-value">{donation.item_type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Quantity:</span>
                      <span className="detail-value">{donation.quantity}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {donation.transaction_hash && (
                      <div className="blockchain-verified">
                        <span className="verified-badge">✓ Blockchain Verified</span>
                        <div className="certificate-actions">
                        <a 
                          href={`https://explorer.aptoslabs.com/txn/${donation.transaction_hash}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link"
                        >
                          View on Explorer
                        </a>
                          <button 
                            onClick={() => handleGenerateCertificate(donation)}
                            className="generate-certificate-btn"
                          >
                            Generate Certificate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donation Summary Modal */}
      {showModal && modalDonation && (
        <div className="donation-modal-overlay" onClick={handleCloseModal}>
          <div className="donation-modal modern-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleCloseModal}>&times;</button>
            <div className="modal-content-2col">
              <div className="modal-left">
                <h2 className="modal-title">Donation Summary</h2>
                <div className="modal-detail-row">
                  <span className="modal-label">Item Type:</span>
                  <span className="modal-value">{modalDonation.item_type}</span>
                </div>
                <div className="modal-detail-row">
                  <span className="modal-label">Quantity:</span>
                  <span className="modal-value">{modalDonation.quantity}</span>
                </div>
                {modalDonation.amount && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Amount:</span>
                    <span className="modal-value">${modalDonation.amount}</span>
                  </div>
                )}
                <div className="modal-detail-row">
                  <span className="modal-label">Status:</span>
                  <span className={`modal-status-badge ${modalDonation.status}`}>{modalDonation.status}</span>
                </div>
                {modalDonation.description && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Description:</span>
                    <span className="modal-value">{modalDonation.description}</span>
                  </div>
                )}
                {modalDonation.condition && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Condition:</span>
                    <span className="modal-value">{modalDonation.condition}</span>
                  </div>
                )}
                {modalDonation.pickup_address && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Pickup Address:</span>
                    <span className="modal-value">{modalDonation.pickup_address}</span>
                  </div>
                )}
                {modalDonation.preferred_date && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Pickup Date:</span>
                    <span className="modal-value">{new Date(modalDonation.preferred_date).toLocaleDateString()}</span>
                  </div>
                )}
                {modalDonation.preferred_time && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Pickup Time:</span>
                    <span className="modal-value">{modalDonation.preferred_time}</span>
                  </div>
                )}
                {modalDonation.created_at && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Date Donated:</span>
                    <span className="modal-value">{new Date(modalDonation.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {modalDonation.recipient_name && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Recipient:</span>
                    <span className="modal-value">{modalDonation.recipient_name}</span>
                  </div>
                )}
                {modalDonation.transaction_hash && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Transaction Hash:</span>
                    <span className="modal-value">{modalDonation.transaction_hash}</span>
                  </div>
                )}
              </div>
              <div className="modal-right">
                <div className="modal-icon-bg">
                  <span className="modal-icon">🎁</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDonations; 