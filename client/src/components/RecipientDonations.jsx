import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BackToDashboard from './BackToDashboard';
import './RecipientDonations.css';

const RecipientDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'monetary', 'goods'
  const navigate = useNavigate();

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

    fetchDonations();
  }, [navigate]);

  const fetchDonations = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const response = await fetch('http://localhost:5001/api/recipients/donations', {
        headers: {
          'Authorization': `Bearer ${userData.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch donations');
      }

      const data = await response.json();
      setDonations(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('Failed to load donations');
      setLoading(false);
    }
  };

  const handleStatusChange = async (donationId, newStatus) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const donation = donations.find(d => d.id === donationId);
      const response = await fetch(`http://localhost:5001/api/donations/${donationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify({ status: newStatus, donation_type: donation?.donation_type })
      });

      if (!response.ok) {
        throw new Error('Failed to update donation status');
      }

      setDonations(donations.map(donation =>
        donation.id === donationId
          ? { ...donation, status: newStatus }
          : donation
      ));

      toast.success(`Donation status updated to ${newStatus}`);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating donation status:', error);
      toast.error('Failed to update donation status');
    }
  };

  const openModal = (donation) => {
    setSelectedDonation(donation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedDonation(null);
    setIsModalOpen(false);
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-badge-pending';
      case 'approved':
        return 'status-badge-approved';
      case 'rejected':
        return 'status-badge-rejected';
      case 'completed':
        return 'status-badge-completed';
      default:
        return '';
    }
  };

  const viewReceipt = (receiptPath) => {
    if (receiptPath) {
      window.open(`http://localhost:5001/uploads/receipts/${receiptPath}`, '_blank');
    }
  };

  const getFilteredDonations = () => {
    let filtered = donations.filter(donation =>
      (donation.item_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       donation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       donation.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       donation.donor_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (activeTab) {
      case 'monetary':
        return filtered.filter(donation => donation.donation_type === 'money');
      case 'goods':
        return filtered.filter(donation => donation.donation_type === 'goods' || !donation.donation_type);
      default:
        return filtered;
    }
  };

  const filteredDonations = getFilteredDonations();

  if (loading) {
    return <div className="loading">Loading donations...</div>;
  }

  return (
    <div className="recipient-donations">
      <div className="header">
        <h2>Donation Management</h2>
        <BackToDashboard customText="Back to Dashboard" customPath="/recipient/dashboard" />
      </div>

      <div className="donation-tabs">
        <button 
          className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Donations ({donations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'monetary' ? 'active' : ''}`}
          onClick={() => setActiveTab('monetary')}
        >
          💰 Monetary ({donations.filter(d => d.donation_type === 'money').length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'goods' ? 'active' : ''}`}
          onClick={() => setActiveTab('goods')}
        >
          📦 Goods ({donations.filter(d => d.donation_type === 'goods' || !d.donation_type).length})
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search donations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="donations-grid">
        {filteredDonations.length === 0 ? (
          <div className="no-donations">
            No donations found
          </div>
        ) : (
          filteredDonations.map((donation) => (
            <div 
              key={donation.id} 
              className="donation-card"
              onClick={() => openModal(donation)}
            >
              <div className="donation-header">
                <h3>
                  {donation.donation_type === 'money' ? '💰' : '📦'} 
                  Donation #{donation.id}
                </h3>
                <span className={`status-badge ${getStatusBadgeClass(donation.status)}`}>
                  {donation.status}
                </span>
              </div>
              
              <div className="donation-summary">
                <p><strong>Donor:</strong> {donation.donor_name || 'Anonymous'}</p>
                <p><strong>Type:</strong> {donation.donation_type === 'money' ? 'Monetary' : 'Goods'}</p>
                {donation.donation_type === 'money' ? (
                  <p><strong>Amount:</strong> ${donation.amount}</p>
                ) : (
                  <p><strong>Item:</strong> {donation.item_type}</p>
                )}
                <p><strong>Date:</strong> {new Date(donation.created_at).toLocaleDateString()}</p>
                {donation.donation_type === 'money' && donation.receipt_path && (
                  <button 
                    className="view-receipt-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewReceipt(donation.receipt_path);
                    }}
                  >
                    View Receipt
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for donation details */}
      {isModalOpen && selectedDonation && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Donation Details</h2>
              <button className="close-button" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-details">
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <p><strong>Donation ID:</strong> {selectedDonation.id}</p>
                  <p><strong>Donor:</strong> {selectedDonation.donor_name || 'Anonymous'}</p>
                  <p><strong>Type:</strong> {selectedDonation.donation_type === 'money' ? 'Monetary' : 'Goods'}</p>
                  <p><strong>Status:</strong> {selectedDonation.status}</p>
                  <p><strong>Date Received:</strong> {new Date(selectedDonation.created_at).toLocaleString()}</p>
                </div>

                {selectedDonation.donation_type === 'money' ? (
                  <div className="detail-section">
                    <h3>Monetary Donation Details</h3>
                    <p><strong>Amount:</strong> ${selectedDonation.amount}</p>
                    {selectedDonation.message && (
                      <p><strong>Message:</strong> {selectedDonation.message}</p>
                    )}
                    {selectedDonation.receipt_path && (
                      <div className="receipt-section">
                        <p><strong>Payment Receipt:</strong></p>
                        <button 
                          className="view-receipt-btn large"
                          onClick={() => viewReceipt(selectedDonation.receipt_path)}
                        >
                          📄 View Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="detail-section">
                    <h3>Goods Donation Details</h3>
                    <p><strong>Item Type:</strong> {selectedDonation.item_type}</p>
                    <p><strong>Quantity:</strong> {selectedDonation.quantity}</p>
                    <p><strong>Description:</strong> {selectedDonation.description}</p>
                    <p><strong>Condition:</strong> {selectedDonation.condition}</p>
                    <p><strong>Pickup Address:</strong> {selectedDonation.pickup_address}</p>
                    <p><strong>Preferred Date:</strong> {selectedDonation.preferred_date ? new Date(selectedDonation.preferred_date).toLocaleDateString() : 'Not specified'}</p>
                    <p><strong>Preferred Time:</strong> {selectedDonation.preferred_time || 'Not specified'}</p>
                    {selectedDonation.message && (
                      <p><strong>Message:</strong> {selectedDonation.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedDonation.status === 'pending' && (
              <div className="modal-actions">
                <button
                  className="approve-button"
                  onClick={() => handleStatusChange(selectedDonation.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="reject-button"
                  onClick={() => handleStatusChange(selectedDonation.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            )}
            
            {selectedDonation.status === 'approved' && (
              <div className="modal-actions">
                <button
                  className="complete-button"
                  onClick={() => handleStatusChange(selectedDonation.id, 'completed')}
                >
                  Mark as Received
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientDonations; 