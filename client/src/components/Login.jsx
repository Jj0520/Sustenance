import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';
import { buildApiUrl } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'recipient'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = formData.userType === 'recipient' 
        ? buildApiUrl('/api/recipients/login')
        : buildApiUrl('/api/auth/login');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          formData.userType === 'recipient'
            ? {
                username: formData.email,
                password: formData.password
              }
            : {
                email: formData.email,
                password: formData.password
              }
        )
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store the complete user data object
      localStorage.setItem('user', JSON.stringify({
        ...data,
        userType: formData.userType // Include the user type in storage
      }));

      // Redirect based on user type
      if (formData.userType === 'recipient') {
        navigate('/recipient/dashboard');
      } else if (data.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Sign in to your account</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <p className="form-label">I am a:</p>
          <div className="user-type-buttons">
            <button
              type="button"
              className={`type-button ${formData.userType === 'recipient' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, userType: 'recipient' }))}
            >
              NGO
            </button>
            <button
              type="button"
              className={`type-button ${formData.userType === 'user' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, userType: 'user' }))}
            >
              Donor
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              {formData.userType === 'recipient' ? 'Username' : 'Email address'}
            </label>
            <input
              id="email"
              name="email"
              type={formData.userType === 'recipient' ? 'text' : 'email'}
              required
              value={formData.email}
              onChange={handleChange}
              placeholder={formData.userType === 'recipient' ? "Enter NGO username" : "Enter your email"}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="sign-in-button">
            Sign in
          </button>

          <div className="auth-links">
            <div className="auth-link">
              {formData.userType === 'recipient' ? (
                <>
                  Need to register your NGO?{' '}
                  <a href="/recipient/register">Register here</a>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <a href="/register">Sign up</a>
                </>
              )}
            </div>
            <div className="auth-link">
              {formData.userType === 'recipient' ? (
                <>
                  Are you a donor?{' '}
                  <button 
                    type="button" 
                    className="text-button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'user' }))}
                  >
                    Sign in as donor
                  </button>
                </>
              ) : (
                <>
                  Are you an NGO?{' '}
                  <button 
                    type="button" 
                    className="text-button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'recipient' }))}
                  >
                    Sign in as NGO
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
