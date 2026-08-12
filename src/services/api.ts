import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';

// When running `npm run dev` (localhost:5173), .env.local sets VITE_API_BASE_URL=http://localhost:8000/api
// When running in Docker (nginx), VITE_API_BASE_URL is baked in at build time as http://api-gateway:8000/api
// Fallback: if nothing is set, use Vite proxy path /api (works only in dev with proxy enabled in vite.config.ts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const pendingRequests = new Map<string, Promise<any>>();
const getAdapter = (config: any): AxiosAdapter => {
  const targetAdapter = (config.adapter === dedupeAndRetryAdapter) ? undefined : config.adapter;
  if (typeof axios.getAdapter === 'function') {
    return axios.getAdapter(targetAdapter || axios.defaults.adapter || 'xhr');
  }
  if (typeof axios.defaults.adapter === 'function') {
    return axios.defaults.adapter as AxiosAdapter;
  }
  throw new Error('No axios adapter found');
};

const sanitizeParams = (obj: any) => {
  if (!obj || typeof obj !== 'object') return '';
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'card', 'cvv'];
  for (const k of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      sanitized[k] = '[REDACTED]';
    }
  }
  return JSON.stringify(sanitized);
};

const dedupeAndRetryAdapter: AxiosAdapter = (config) => {
  // Deduplicate only GET requests to avoid breaking mutations
  if (config.method?.toLowerCase() !== 'get') {
    const adapter = getAdapter(config);
    return adapter(config);
  }

  const adapter = getAdapter(config);
  const key = `${config.method}:${config.url}:${sanitizeParams(config.params)}`;

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const executeWithRetry = async (retriesLeft: number): Promise<AxiosResponse<any>> => {
    try {
      return await adapter(config);
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

// Attach JWT token on every request safely
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    // Ensure token is attached only to requests within local base API or relative paths
    const url = config.url || '';
    const isRelativeOrAppDomain = !url.startsWith('http://') && !url.startsWith('https://') || url.startsWith(API_BASE_URL);
    if (isRelativeOrAppDomain) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
