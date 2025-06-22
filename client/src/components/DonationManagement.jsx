import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './DonationManagement.css';
import { buildApiUrl } from '../../config/api';

const DonationManagement = () => {
  const [donations, setDonations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'goods', 'money'
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser?.user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchDonations();
  }, [navigate]);

  const fetchDonations = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/donations'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDonations(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Tab filter logic
  const getFilteredDonations = () => {
    let filtered = donations.filter(donation =>
      (donation.item_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.status?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
    if (activeTab === 'goods') {
      return filtered.filter(d => d.donation_type === 'goods');
    } else if (activeTab === 'money') {
      return filtered.filter(d => d.donation_type === 'money');
    }
    return filtered;
  };
  const filteredDonations = getFilteredDonations();

  const handleStatusChange = async (id, newStatus) => {
    try {
      const donation = donations.find(d => d.id === id);
      const response = await fetch(buildApiUrl(`/api/admin/donations/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, donation_type: donation?.donation_type })
      });

      if (response.ok) {
        fetchDonations(); // Refresh the donations list
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="donation-management">
      <div className="analytics-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
        <h2>Donation Tracker</h2>
      </div>

      {/* Tabs */}
      <div className="donation-tabs">
        <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All</button>
        <button className={activeTab === 'goods' ? 'active' : ''} onClick={() => setActiveTab('goods')}>Goods</button>
        <button className={activeTab === 'money' ? 'active' : ''} onClick={() => setActiveTab('money')}>Monetary</button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search donations..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Item/Amount</th>
              <th>Description/Message</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDonations.map(donation => (
              <tr key={donation.id}>
                <td>{donation.id}</td>
                <td>{donation.user_name}</td>
                <td>{donation.donation_type === 'money' ? 'Monetary' : 'Goods'}</td>
                <td>
                  {donation.donation_type === 'money'
                    ? `$${donation.amount}`
                    : donation.item_type}
                </td>
                <td>
                  {donation.donation_type === 'money'
                    ? donation.message
                    : donation.description}
                </td>
                <td>{donation.status}</td>
                <td>
                  <select
                    value={donation.status}
                    onChange={(e) => handleStatusChange(donation.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonationManagement; 