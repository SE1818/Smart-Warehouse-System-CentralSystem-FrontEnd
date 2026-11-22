import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import type { AuthResponse } from '@/types/auth';

type AuthSession = AuthResponse;

export const resolveBaseUrl = (): string => {
  // 1. Runtime override via localStorage for quick testing without redeploying
  if (typeof window !== 'undefined') {
    // When served from Docker port 3200 or local domain, use relative /api to utilize Nginx reverse proxy and eliminate CORS
    if (window.location.port === '3200' || window.location.hostname?.endsWith('.local')) {
      return '/api';
    }

    const override = localStorage.getItem('API_BASE_URL')?.trim();
    if (override) {
      return override.replace(/\/+$/, '');
    }
  }

  // 2. Read environment variable
  let envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // If envUrl is empty, points to unresolvable docker host, or points to expired tunnels, default to stereo-gravity-humbly ngrok tunnel
  if (!envUrl || envUrl.includes('api-gateway') || envUrl.includes('triage-scarcity-prancing.ngrok-free.dev') || envUrl.includes('briar-snoring-submerge.ngrok-free.dev') || envUrl.includes('trycloudflare.com')) {
    envUrl = 'https://stereo-gravity-humbly.ngrok-free.dev/api';
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

export const resolveEdgeBaseUrl = (): string => {
  // 1. Runtime override via localStorage
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('EDGE_API_BASE_URL')?.trim();
    if (override) {
      return override.replace(/\/+$/, '');
    }
  }

  // 2. When served from Docker port 3200 (Edge Frontend), use Nginx reverse proxy /edge-api
  if (typeof window !== 'undefined' && window.location.port === '3200') {
    return '/edge-api';
  }

  // 3. When accessed via HTTPS (e.g. Ngrok tunnel https://...ngrok-free.app or remote HTTPS),
  // mobile browsers strictly block plain HTTP requests to localhost as Mixed Content.
  // Moreover, 'localhost' on a smartphone resolves to the phone itself, not the PC!
  // In Ngrok tunnel mode, proxy through relative '/api' which Vite forwards to http://localhost:5000.
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    const hostname = window.location.hostname;
    if (hostname.includes('ngrok') || hostname.includes('loca.lt') || hostname.includes('trycloudflare.com')) {
      return `${window.location.origin}/api`;
    }
    return resolveBaseUrl();
  }

  // 4. Read environment variable
  let edgeUrl = (import.meta.env.VITE_EDGE_API_URL || '').trim();
  if (edgeUrl) {
    const cleanUrl = edgeUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  // 5. When accessed via LAN IP or hostname (e.g. 192.168.1.7)
  const hostname = typeof window !== 'undefined' ? window.location?.hostname : '';
  if (hostname && typeof hostname === 'string') {
    if (hostname.endsWith('.local')) {
      const parts = hostname.split('.');
      return `http://${parts[0]}.local:5000/api`;
    }
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:5000/api`;
    }
  }

  return 'http://localhost:5000/api';
};

export const EDGE_BASE_URL = resolveEdgeBaseUrl();

/**
 * Determines whether a given request path belongs to the Local Edge node (Robot Service)
 */
export const isEdgeEndpoint = (url?: string): boolean => {
  if (!url) return false;
  const clean = url.toLowerCase();
  return (
    clean.startsWith('/v1/robots') ||
    clean.startsWith('/robots') ||
    clean.startsWith('/v1/robot') ||
    clean.startsWith('/robot/') ||
    clean.startsWith('/v1/commands/robot') ||
    clean.startsWith('/v1/tasks') ||
    clean.startsWith('/v1/tables') ||
    clean.startsWith('/tables')
  );
};

const pendingRequests = new Map<string, Promise<any>>();
interface CachedApiResponse {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  timestamp: number;
  ttlMs: number;
}
const responseCache = new Map<string, CachedApiResponse>();
let edgeUnavailableUntil = 0;
const EDGE_COOLDOWN_MS = 60_000;

const cloneResponseData = <T>(data: T): T => {
  if (data === undefined || data === null) return data;
  try {
    return structuredClone(data);
  } catch {
    return JSON.parse(JSON.stringify(data));
  }
};

const resolveEndpointTtlMs = (url: string = ''): number => {
  if (
    url.includes('/auth/') ||
    url.includes('/health') ||
    url.includes('/telemetry-summary') ||
    url.includes('/payments/')
  ) {
    return 0;
  }
  if (
    url.includes('/stations') ||
    url.includes('/areas') ||
    url.includes('/map/') ||
    url.includes('/edge-info') ||
    url.includes('/edge/info')
  ) {
    return 300_000;
  }
  if (
    url.includes('/tables') ||
    url.includes('/robots') ||
    url.includes('/tenant/fleet') ||
    url.includes('/fleet')
  ) {
    return 15_000;
  }
  if (url.includes('/tasks') || url.includes('/orders/pending')) {
    return 10_000;
  }
  return 30_000;
};

export function clearApiCache(filterPattern?: string): void {
  if (!filterPattern) {
    responseCache.clear();
    pendingRequests.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(filterPattern)) {
      responseCache.delete(key);
    }
  }
}

const invalidateCacheOnMutation = (url: string = ''): void => {
  if (!url) return;
  if (url.includes('/tables')) clearApiCache('/tables');
  if (url.includes('/robots') || url.includes('/tasks') || url.includes('/fleet')) {
    clearApiCache('/robots');
    clearApiCache('/tasks');
    clearApiCache('/fleet');
    clearApiCache('/tenant/fleet');
  }
  if (url.includes('/orders')) clearApiCache('/orders');
  if (url.includes('/stations') || url.includes('/areas') || url.includes('/map/')) {
    clearApiCache('/stations');
    clearApiCache('/areas');
    clearApiCache('/map/');
  }
  if (url.includes('/auth/')) clearApiCache();
};

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
  const url = config.url || '';
  if (config.method?.toLowerCase() !== 'get') {
    invalidateCacheOnMutation(url);
    const adapter = getAdapter(config);
    return adapter(config);
  }

  const adapter = getAdapter(config);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const tokenSalt = token ? token.slice(-12) : 'anon';
  const cacheKey = `${config.method}:${url}:${sanitizeParams(config.params)}:${tokenSalt}`;
  const skipCache = Boolean((config as any).skipCache);
  const ttlMs = (config as any).ttlMs ?? resolveEndpointTtlMs(url);

  if (!skipCache && ttlMs > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttlMs) {
      return Promise.resolve({
        data: cloneResponseData(cached.data),
        status: cached.status,
        statusText: cached.statusText,
        headers: { ...cached.headers },
        config,
        request: {},
      });
    }
  }

  const inflightKey = `${cacheKey}:${(config as any)._edgeFallbackRetried ? 'cloud' : 'primary'}`;
  if (pendingRequests.has(inflightKey)) {
    return pendingRequests.get(inflightKey)!.then((res) => ({
      ...res,
      data: cloneResponseData(res.data),
    }));
  }

  const isInitialEdgeTry =
    isEdgeEndpoint(url) &&
    !(config as any)._edgeFallbackRetried &&
    config.baseURL !== API_BASE_URL;
  const maxRetries = isInitialEdgeTry ? 0 : 2;

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

  const promise = executeWithRetry(maxRetries)
    .then((res) => {
      pendingRequests.delete(inflightKey);
      if (!skipCache && ttlMs > 0 && res && res.status >= 200 && res.status < 300 && res.data !== undefined) {
        responseCache.set(cacheKey, {
          data: cloneResponseData(res.data),
          status: res.status,
          statusText: res.statusText || 'OK',
          headers: res.headers || {},
          timestamp: Date.now(),
          ttlMs,
        });
      }
      return res;
    })
    .catch((err) => {
      pendingRequests.delete(inflightKey);
      throw err;
    });

  pendingRequests.set(inflightKey, promise);
  return promise;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds request timeout
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  adapter: dedupeAndRetryAdapter,
});

let inflightRefresh: Promise<AuthSession> | null = null;

export function clearAuthSession(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  clearApiCache();
}

export function redirectToLogin(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/**
 * Checks if the JWT access token is expired or close to expiry (<= 30 seconds).
 */
export function isJwtTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp && typeof decoded.exp === 'number') {
      const nowInSec = Math.floor(Date.now() / 1000);
      return decoded.exp <= nowInSec + 30;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Returns a valid authToken, performing a silent refresh with refreshToken if expired.
 * If refresh fails or no refreshToken exists, clears session and redirects to /login (out ra ngoài).
 */
export async function getValidAuthTokenOrRefresh(): Promise<string | null> {
  const token = localStorage.getItem('authToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (token && !isJwtTokenExpired(token)) {
    return token;
  }

  if (refreshToken) {
    try {
      const session = await refreshAccessToken(refreshToken);
      if (session.accessToken) {
        localStorage.setItem('authToken', session.accessToken);
      }
      if (session.refreshToken) {
        localStorage.setItem('refreshToken', session.refreshToken);
      }
      return session.accessToken;
    } catch {
      clearAuthSession();
      redirectToLogin();
      return null;
    }
  }

  if (token) {
    // Had expired token but no refresh token
    clearAuthSession();
    redirectToLogin();
  }
  return null;
}

/**
 * Handles a 401 Unauthorized from SignalR hubs (negotiate or socket auth error).
 * Tries silent refresh once. If successful, returns true to allow reconnection.
 * If refresh fails or no refreshToken exists, clears session and redirects to /login (out ra ngoài).
 */
export async function handleSignalR401(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      const session = await refreshAccessToken(refreshToken);
      if (session.accessToken) {
        localStorage.setItem('authToken', session.accessToken);
      }
      if (session.refreshToken) {
        localStorage.setItem('refreshToken', session.refreshToken);
      }
      return true;
    } catch {
      clearAuthSession();
      redirectToLogin();
      return false;
    }
  }
  clearAuthSession();
  redirectToLogin();
  return false;
}

export function isUnauthorizedError(error: any): boolean {
  if (!error) return false;
  if (error.statusCode === 401 || error.status === 401) return true;
  const msg = String(error.message || error);
  return msg.includes('401') || msg.toLowerCase().includes('unauthorized');
}

// Bare axios, not apiClient: routing this through apiClient would re-enter the
// interceptor and recurse on its own failure.
export function refreshAccessToken(refreshToken?: string): Promise<AuthSession> {
  if (!inflightRefresh) {
    inflightRefresh = axios
      .post<AuthSession>(
        `${API_BASE_URL}/auth/refresh-token`,
        refreshToken ? { refreshToken } : {},
        {
          withCredentials: true,
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

// Attach dynamic base URL (Edge vs Cloud) and JWT token on every request
apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    invalidateCacheOnMutation(url);
  }

  // Dual routing: route robot/hardware endpoints to Local Edge, others to Cloud Server
  // If fallback has already been triggered or Edge is in cooldown, retain API_BASE_URL!
  if ((config as any)._edgeFallbackRetried) {
    config.baseURL = API_BASE_URL;
  } else if (isEdgeEndpoint(url)) {
    if (Date.now() < edgeUnavailableUntil) {
      (config as any)._edgeFallbackRetried = true;
      config.baseURL = API_BASE_URL;
    } else {
      config.baseURL = EDGE_BASE_URL;
    }
  } else {
    config.baseURL = API_BASE_URL;
  }

  const token = localStorage.getItem('authToken');
  if (token) {
    // Ensure token is attached only to requests within local base API, edge API or relative paths
    const isRelativeOrAppDomain =
      (!url.startsWith('http://') && !url.startsWith('https://')) ||
      url.startsWith(API_BASE_URL) ||
      url.startsWith(EDGE_BASE_URL);
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
    const config = error?.config as (typeof error.config & { _retried?: boolean; _edgeFallbackRetried?: boolean }) | undefined;
    const status = error?.response?.status;
    const url = config?.url || '';

    // If local Edge Node (port 5000) is offline/unreachable, gracefully fallback to Cloud Gateway once
    if (isEdgeEndpoint(url) && !error?.response && !config?._edgeFallbackRetried) {
      edgeUnavailableUntil = Date.now() + EDGE_COOLDOWN_MS;
      if (config) {
        config._edgeFallbackRetried = true;
        config.baseURL = API_BASE_URL;
        return apiClient(config);
      }
    }

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

    if (config) {
      config._retried = true;
    }
    try {
      // Single-flight: concurrent 401s await one refresh. The server rotates refresh
      // tokens and treats a replayed one as reuse, which revokes every session for the user.
      const session = await refreshAccessToken(refreshToken);
      localStorage.setItem('authToken', session.accessToken);
      if (session.refreshToken) {
        localStorage.setItem('refreshToken', session.refreshToken);
      }
      if (config?.headers) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
      return apiClient(config || {});
    } catch {
      clearAuthSession();
      redirectToLogin();
      return Promise.reject(error);
    }
  }
);

export default apiClient;
