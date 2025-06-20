import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerRecipient } from '../api/recipient';
import PasswordInput from './PasswordInput';
import './Auth.css';

const RegisterRecipient = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ngo_name: '',
    founded_date: '',
    ngo_description: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    website: ''
  });
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      let website = formData.website ? formData.website.trim() : '';
      if (website && !/^https?:\/\//i.test(website)) {
        website = 'https://' + website;
      }
      if (website && !/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}/.test(website)) {
        setError('Please enter a valid website URL');
        setLoading(false);
        return;
      }
      Object.keys(formData).forEach(key => {
        if (key !== 'confirmPassword') {
          if (key === 'website') {
            formDataToSend.append('website', website);
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });
      formDataToSend.append('document', document);
      await registerRecipient(formDataToSend);
      toast.success("Registration submitted successfully! Please wait while we process your application.", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting registration');
      toast.error(err.response?.data?.message || 'Error submitting registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>NGO Registration</h2>
        <p className="auth-subtitle">Register your organization to receive donations</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Organization Name *</label>
            <input
              type="text"
              name="ngo_name"
              value={formData.ngo_name}
              onChange={handleChange}
              required
              placeholder="Enter your organization's name"
            />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your organization's email"
            />
          </div>

          <div className="form-group">
            <label>Founded Date *</label>
            <input
              type="date"
              name="founded_date"
              value={formData.founded_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="ngo_description"
              value={formData.ngo_description}
              onChange={handleChange}
              required
              placeholder="Describe your organization's mission and activities"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <PasswordInput
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="text"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              placeholder="Website (e.g. www.example.com)"
            />
          </div>

          <div className="form-group">
            <label>Registration Document (PDF) *</label>
            <input
              type="file"
              name="document"
              onChange={handleFileChange}
              required
              accept=".pdf"
              className="file-input"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterRecipient; 