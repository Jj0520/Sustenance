import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BackToDashboard.css';

const BackToDashboard = ({ customText, customPath }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackClick = () => {
    if (customPath) {
      navigate(customPath);
      return;
    }
    if (user?.userType === 'recipient' || user?.recipient) {
      navigate('/recipient/dashboard');
    } else if (user?.user?.role === 'admin') {
      navigate('/admin');
    } else if (user?.user?.role === 'donor' || user?.user?.role === 'user') {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <button onClick={handleBackClick} className="back-to-dashboard-btn">
      <span className="back-icon">←</span>
      {customText || 'Back to Dashboard'}
    </button>
  );
};

export default BackToDashboard; 