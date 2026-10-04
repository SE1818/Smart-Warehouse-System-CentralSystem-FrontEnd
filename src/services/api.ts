import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import type { AuthResponse } from '@/types/auth';

type AuthSession = AuthResponse;

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

let inflightRefresh: Promise<AuthSession> | null = null;

function clearAuthSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Bare axios, not apiClient: routing this through apiClient would re-enter the
// interceptor and recurse on its own failure.
function refreshAccessToken(refreshToken: string): Promise<AuthSession> {
  if (!inflightRefresh) {
    inflightRefresh = axios
      .post<AuthSession>(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken },
        {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        }
      )
      .then((res) => res.data)
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}

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

// Handle 401 → try one silent refresh, then redirect to login if that fails too.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/external-login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/logout');

    if (status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken || config?._retried) {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      // Single-flight: concurrent 401s await one refresh. The server rotates refresh
      // tokens and treats a replayed one as reuse, which revokes every session for the user.
      const session = await refreshAccessToken(refreshToken);
      localStorage.setItem('authToken', session.accessToken);
      localStorage.setItem('refreshToken', session.refreshToken);
      if (config.headers) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
      return apiClient(config);
    } catch {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(error);
    }
  }
);

export default apiClient;
