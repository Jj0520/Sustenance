import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Redirect admin users to admin dashboard
    if (parsedUser?.user?.role === 'admin') {
      navigate('/admin');
      return;
    }
    
    setLoading(false);
  }, [navigate]);

  const handleEditProfileClick = () => {
    navigate('/edit-profile');
  };

  const handleDonateClick = () => {
    navigate('/donate');
  };

  const handleMyDonationsClick = () => {
    navigate('/mydonations');
  };

  const handleChatbotClick = () => {
    navigate('/chatbot');
  };

  const handleSocialFeedClick = () => {
    navigate('/social-feed');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-indicator">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Donor Dashboard</h1>
        <div className="header-right">
          <span className="user-badge">
            Welcome, {user?.user?.name || 'Donor'}
          </span>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Ready to Make a Difference?</h2>
        <p className="donor-description">
          Your generosity can change lives. Donate items, funds, or volunteer your time to support meaningful causes.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={handleDonateClick}>
          <div className="card-icon">🎁</div>
          <h3>Donate Now</h3>
          <p>Make a donation to support causes you care about</p>
        </div>

        <div className="dashboard-card" onClick={handleMyDonationsClick}>
          <div className="card-icon">📋</div>
          <h3>My Donations</h3>
          <p>Track your donation history and impact</p>
        </div>

        <div className="dashboard-card" onClick={handleEditProfileClick}>
          <div className="card-icon">👤</div>
          <h3>Edit Profile</h3>
          <p>Update your personal information and preferences</p>
        </div>

        <div className="dashboard-card" onClick={handleChatbotClick}>
          <div className="card-icon">💬</div>
          <h3>Chat Assistant</h3>
          <p>Get help with donations and platform features</p>
        </div>

        <div className="dashboard-card" onClick={handleSocialFeedClick}>
          <div className="card-icon">📰</div>
          <h3>Social Feed</h3>
          <p>See updates and stories from NGOs you support</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/certificates')}>
          <div className="card-icon">🏆</div>
          <h3>My Certificates</h3>
          <p>View your donation certificates and achievements</p>
        </div>
      </div>

      <div className="impact-section">
        <h3>🌟 Your Impact</h3>
        <p>Every donation makes a difference. Thank you for being part of our community of changemakers.</p>
      </div>
    </div>
  );
};

export default Dashboard; 