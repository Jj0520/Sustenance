import axios from 'axios';
import { buildApiUrl } from '../config/api';

const RECIPIENTS_API_URL = buildApiUrl('/api/recipients');

export const registerRecipient = async (formData) => {
  try {
    const response = await axios.post(`${RECIPIENTS_API_URL}/register`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error registering recipient:', error.response ? error.response.data : error.message);
    throw error;
  }
};
