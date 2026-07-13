import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';

// When running `npm run dev` (localhost:5173), .env.local sets VITE_API_BASE_URL=http://localhost:8000/api
// When running in Docker (nginx), VITE_API_BASE_URL is baked in at build time as http://api-gateway:8000/api
// Fallback: if nothing is set, use Vite proxy path /api (works only in dev with proxy enabled in vite.config.ts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const pendingRequests = new Map<string, Promise<any>>();
const defaultAdapter = (axios.defaults.adapter as any) || (() => { throw new Error('No axios adapter found'); });

const dedupeAndRetryAdapter: AxiosAdapter = (config) => {
  const key = `${config.method}:${config.url}:${JSON.stringify(config.params)}:${JSON.stringify(config.data)}`;

  // Deduplicate only GET requests to avoid breaking mutations
  if (config.method?.toLowerCase() !== 'get') {
    return defaultAdapter(config);
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const executeWithRetry = async (retriesLeft: number): Promise<AxiosResponse<any>> => {
    try {
      return await defaultAdapter(config);
    } catch (error: any) {
      const isNetworkError = !error.response;
      const isServerError = error.response?.status >= 500;

      if (retriesLeft > 0 && (isNetworkError || isServerError)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return executeWithRetry(retriesLeft - 1);
      }
      throw error;
    }
  };

  const promise = executeWithRetry(2).finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds request timeout
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  adapter: dedupeAndRetryAdapter,
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
