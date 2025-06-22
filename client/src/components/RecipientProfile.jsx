import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BackToDashboard from './BackToDashboard';
import './RecipientProfile.css';
import { AuthContext } from '../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';

const RecipientProfile = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    ngo_name: '',
    founded_date: '',
    ngo_description: '',
    email: '',
    address: '',
    phone: '',
    website: ''
  });

  useEffect(() => {
    // Fetch current NGO profile data
    const fetchProfile = async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/recipients/profile`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setFormData({
          ngo_name: data.ngo_name || '',
          founded_date: data.founded_date ? new Date(data.founded_date).toISOString().split('T')[0] : '',
          ngo_description: data.ngo_description || '',
          email: data.email || '',
          address: data.address || '',
          phone: data.phone || '',
          website: data.website || ''
        });
        if (data.profile_image) {
          setImagePreview(data.profile_image);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
      }
    };

    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      let website = formData.website.trim();
      if (website && !/^https?:\/\//i.test(website)) {
        website = 'https://' + website;
      }
      // Optionally, validate plausible domain
      if (website && !/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}/.test(website)) {
        toast.error('Please enter a valid website URL');
        setLoading(false);
        return;
      }
      Object.keys(formData).forEach(key => {
        if (key === 'website') {
          formDataToSend.append('website', website);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      if (profileImage) {
        formDataToSend.append('profile_image', profileImage);
      }
      const response = await fetch(buildApiUrl('/api/recipients/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      toast.success('Profile updated successfully');
      navigate('/recipient/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipient-profile">
      <div className="profile-header">
        <h2>Edit NGO Profile</h2>
        <div className="back-to-dashboard-wrapper">
          <BackToDashboard customText="Back to Dashboard" customPath="/recipient/dashboard" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-image-section">
          <div className="image-preview">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile preview" />
            ) : (
              <div className="placeholder-image">
                <span>No image</span>
              </div>
            )}
          </div>
          <div className="image-upload">
            <label htmlFor="profile-image" className="upload-button">
              {profileImage ? 'Change Image' : 'Upload Image'}
            </label>
            <input
              id="profile-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Organization Name *</label>
            <input
              type="text"
              name="ngo_name"
              value={formData.ngo_name}
              onChange={handleChange}
              required
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
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="Website (e.g. www.example.com)"
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="form-group full-width">
            <label>Description *</label>
            <textarea
              name="ngo_description"
              value={formData.ngo_description}
              onChange={handleChange}
              required
              rows={4}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/recipient/dashboard')}
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
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipientProfile; 