import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToDashboard from './BackToDashboard';
import './DonateGoods.css';

const DonateGoods = () => {
  const navigate = useNavigate();
  const [donationData, setDonationData] = useState({
    itemType: '',
    quantity: '',
    description: '',
    condition: 'new',
    pickupAddress: '',
    preferredDate: '',
    preferredTime: ''
  });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const validateDateTime = (date, time) => {
    const now = new Date();
    const selectedDateTime = new Date(`${date}T${time}`);
    return selectedDateTime > now;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDonationData({
      ...donationData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Validate date and time when either is changed
    if (name === 'preferredDate' || name === 'preferredTime') {
      if (donationData.preferredDate && donationData.preferredTime) {
        const isValid = validateDateTime(
          name === 'preferredDate' ? value : donationData.preferredDate,
          name === 'preferredTime' ? value : donationData.preferredTime
        );
        
        if (!isValid) {
          setErrors({
            ...errors,
            datetime: 'Selected date and time must be in the future'
          });
        } else {
          setErrors({
            ...errors,
            datetime: ''
          });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate date and time before submission
    if (donationData.preferredDate && donationData.preferredTime) {
      const isValid = validateDateTime(donationData.preferredDate, donationData.preferredTime);
      if (!isValid) {
        setErrors({
          ...errors,
          datetime: 'Selected date and time must be in the future'
        });
        return;
      }
    }

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
        return;
      }
      
      const { token } = JSON.parse(userData);

      const response = await fetch('http://localhost:5001/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(donationData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit donation');
      }

      const result = await response.json();
      setSubmitStatus({
        message: 'Donation scheduled successfully!',
        type: 'success'
      });

      // Clear form after successful submission
      setDonationData({
        itemType: '',
        quantity: '',
        description: '',
        condition: 'new',
        pickupAddress: '',
        preferredDate: '',
        preferredTime: ''
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus({
        message: 'Failed to schedule donation. Please try again.',
        type: 'error'
      });
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-box">
        <BackToDashboard customText="Back to Donate Options" customPath="/donate" />
        
        <h2>Donate Goods</h2>
        
        {submitStatus.message && (
          <div className={`status-message ${submitStatus.type}`}>
            {submitStatus.message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="donation-form">
          <div className="form-group">
            <label>Item Type</label>
            <select 
              name="itemType" 
              value={donationData.itemType}
              onChange={handleChange}
              required
            >
              <option value="">Select Item Type</option>
              <option value="food">Food</option>
              <option value="clothes">Clothes</option>
              <option value="furniture">Furniture</option>
              <option value="electronics">Electronics</option>
              <option value="books">Books</option>
              <option value="toys">Toys</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={donationData.quantity}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={donationData.description}
              onChange={handleChange}
              required
              placeholder="Please provide details about the items"
            />
          </div>

          <div className="form-group">
            <label>Condition</label>
            <select
              name="condition"
              value={donationData.condition}
              onChange={handleChange}
              required
            >
              <option value="new">New</option>
              <option value="likeNew">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>

          <div className="form-group">
            <label>Pickup Address</label>
            <textarea
              name="pickupAddress"
              value={donationData.pickupAddress}
              onChange={handleChange}
              required
              placeholder="Enter the pickup address"
            />
          </div>

          <div className="form-group">
            <label>Preferred Pickup Date</label>
            <input
              type="date"
              name="preferredDate"
              value={donationData.preferredDate}
              onChange={handleChange}
              required
              min={getCurrentDateTime()}
            />
          </div>

          <div className="form-group">
            <label>Preferred Pickup Time</label>
            <input
              type="time"
              name="preferredTime"
              value={donationData.preferredTime}
              onChange={handleChange}
              required
            />
          </div>

          {errors.datetime && (
            <div className="error-message">
              {errors.datetime}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={errors.datetime}
          >
            Schedule Donation
          </button>
        </form>
      </div>
    </div>
  );
};

export default DonateGoods; 