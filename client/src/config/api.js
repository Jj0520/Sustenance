// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  ADMIN: '/api/admin',
  DONATIONS: '/api/donations',
  RECIPIENTS: '/api/recipients',
  CHAT: '/api/chat',
  SOCIAL: '/api/social',
  UPLOADS: '/uploads'
}; 