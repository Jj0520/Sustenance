import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:5001/api/auth';

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  if (response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

export const login = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);
  if (response.data.token) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('user');
  toast.success('You\'ve logged out successfully', {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const response = await axios.post(`${API_URL}/change-password`, 
      { currentPassword, newPassword },
      {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}; 