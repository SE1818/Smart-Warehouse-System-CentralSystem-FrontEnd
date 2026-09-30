import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';

export const resolveBaseUrl = (): string => {
  // 1. Runtime override via localStorage for quick testing without redeploying
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('API_BASE_URL')?.trim();
    if (override) {
      return override.replace(/\/+$/, '');
    }
  }

  // 2. Read environment variable
  let envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // 3. Automatically replace expired ngrok URL with active tunnel
  if (!envUrl || envUrl.includes('stereo-gravity-humbly.ngrok-free.dev')) {
    envUrl = 'https://briar-snoring-submerge.ngrok-free.dev/api';
  }

  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.pathname === '' || parsed.pathname === '/') {
        return `${cleanUrl}/api`;
      }
    } catch {
      if (!cleanUrl.endsWith('/api')) {
        return `${cleanUrl}/api`;
      }
    }
  }
  return cleanUrl;
};

export const API_BASE_URL = resolveBaseUrl();

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

// Handle 401 → redirect to login only for expired authenticated sessions, never for login requests themselves
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/external-login');
      if (!isAuthEndpoint) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
