import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'x-api-key': 'mySuperSecretVulnTrackerKey123',
  },
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("secophub_token");
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// If token expires redirect to login
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config.url !== '/api/auth/login') {
      sessionStorage.removeItem("secophub_token");
      sessionStorage.removeItem("secophub_user");
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;