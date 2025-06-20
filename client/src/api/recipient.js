import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const registerRecipient = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/recipients/register`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}; 