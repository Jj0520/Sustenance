import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../services/auth';
import BackToDashboard from './BackToDashboard';
import './EditProfile.css';
import { AuthContext } from '../../contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import { buildApiUrl } from '../../config/api';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, token, checkUser } = useContext(AuthContext);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [profileData, setProfileData] = useState({
    photo_url: '',
    birthday: '',
    role: 'donor'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editData, setEditData] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setEditData({
      name: parsedUser.user.name,
      email: parsedUser.user.email
    });

    if (parsedUser.user.photo_url) {
      setPreviewUrl(parsedUser.user.photo_url);
    }
  }, [navigate]);

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(buildApiUrl('/api/auth/update-profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => {
        setShowProfileForm(false);
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('profile_photo', selectedFile);
    try {
      const response = await fetch(buildApiUrl('/api/auth/upload-photo'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const updatedUser = {
        ...user,
        user: { ...user.user, photo_url: data.photo_url }
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage({ text: 'Profile photo updated successfully!', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => {
        setShowPasswordForm(false);
        setMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      setMessage({ text: error.message || 'Failed to update password', type: 'error' });
    }
  };

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(buildApiUrl('/api/auth/update-profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUserData = {
          ...user,
          user: {
            ...user.user,
            name: data.user.name,
            email: data.user.email
          }
        };
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        setUser(updatedUserData);
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        setShowProfileForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="edit-profile-container">
      <div className="profile-header">
        <h2>Edit Profile</h2>
        <BackToDashboard />
      </div>
      
      <div className="profile-content">
        <div className="user-info">
          <div className="profile-photo-section">
            <div className="profile-photo">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" />
              ) : (
                <div className="photo-placeholder">
                  {user.user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="photo-upload">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="photo-upload" className="upload-btn">
                Choose Photo
              </label>
              {selectedFile && (
                <button 
                  className="upload-btn"
                  onClick={handlePhotoSubmit}
                >
                  Upload Photo
                </button>
              )}
            </div>
          </div>
          <div className="info-item">
            <label>Name:</label>
            <span>{user.user.name}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{user.user.email}</span>
          </div>
          <div className="info-item">
            <label>Role:</label>
            <span>{user.user.role}</span>
          </div>
          {user.user.birthday && (
            <div className="info-item">
              <label>Birthday:</label>
              <span>{new Date(user.user.birthday).toLocaleDateString()}</span>
            </div>
          )}
          {user.user.created_at && (
            <div className="info-item">
              <label>Member Since:</label>
              <span>{new Date(user.user.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="profile-section">
          <button 
            className="edit-profile-btn"
            onClick={() => setShowProfileForm(!showProfileForm)}
          >
            {showProfileForm ? 'Cancel' : 'Edit Profile'}
          </button>
          <button 
            className="change-password-btn"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {showProfileForm && (
          <form onSubmit={handleEditSubmit} className="profile-form">
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={editData.name}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={editData.email}
                onChange={handleEditChange}
                required
              />
            </div>
            <button type="submit" className="submit-btn">Update Profile</button>
            <button type="button" className="cancel-btn" onClick={() => setShowProfileForm(false)}>Cancel</button>
          </form>
        )}

        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">Update Password</button>
            <button type="button" className="cancel-btn" onClick={() => setShowPasswordForm(false)}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditProfile; 