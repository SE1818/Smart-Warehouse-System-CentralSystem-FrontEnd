import axios from 'axios';

// When running `npm run dev` (localhost:5173), .env.local sets VITE_API_BASE_URL=http://localhost:8000/api
// When running in Docker (nginx), VITE_API_BASE_URL is baked in at build time as http://api-gateway:8000/api
// Fallback: if nothing is set, use Vite proxy path /api (works only in dev with proxy enabled in vite.config.ts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Attach JWT token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
