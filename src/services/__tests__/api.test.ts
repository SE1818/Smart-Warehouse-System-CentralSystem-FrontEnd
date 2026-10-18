import { describe, it, expect, vi, beforeEach } from 'vitest';

// vitest hoists `vi.mock` calls to the top of the file, so `mockCreate`
// and the captured handlers must already exist in scope when the factory closure runs.
// eslint-disable-next-line no-var
var mockCreate: ReturnType<typeof vi.fn>;
// Captured interceptor callbacks from axios.create().interceptors.request/response.use()
let capturedRequestHandler: ((config: Record<string, unknown>) => Record<string, unknown>) | null = null;
let capturedResponseHandler: ((error: unknown) => Promise<unknown>) | null = null;

vi.mock('axios', () => {
  mockCreate = vi.fn((config: Record<string, unknown>) => ({
    defaults: config as Record<string, unknown>,
    interceptors: {
      request: {
        use: vi.fn((handler: (config: Record<string, unknown>) => Record<string, unknown>) => {
          capturedRequestHandler = handler;
          return 0;
        }),
      },
      response: {
        use: vi.fn((_successHandler: unknown, errorHandler: (error: unknown) => Promise<unknown>) => {
          capturedResponseHandler = errorHandler;
          return 0;
        }),
      },
    },
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }));

  return { default: { create: mockCreate } };
});

describe('services/api.ts', () => {
  beforeEach(() => {
    capturedRequestHandler = null;
    capturedResponseHandler = null;
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
  });

  // ── Module import / create config ──────────────────────────────────────

  it('imports the default export successfully', async () => {
    const { default: apiClient } = await import('@/services/api');
    expect(apiClient).toBeDefined();
  });

  it('calls axios.create once during module evaluation', async () => {
    await import('@/services/api');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('calls axios.create with the correct default headers', async () => {
    await import('@/services/api');
    const cfg = (mockCreate.mock.calls[0][0] as Record<string, Record<string, string>>);
    expect(cfg.headers['Content-Type']).toBe('application/json');
    expect(cfg.headers['ngrok-skip-browser-warning']).toBe('true');
  });

  // ── Request interceptor body (src/services/api.ts lines 17-23) ────────

  it('adds Authorization: Bearer token when token is in localStorage', async () => {
    localStorage.removeItem('authToken');
    await import('@/services/api');
    expect(capturedRequestHandler).not.toBeNull();

    localStorage.setItem('authToken', 'test-jwt-token');
    const config: Record<string, Record<string, string>> = { headers: {} };
    capturedRequestHandler!(config);

    expect(config.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does NOT add Authorization when localStorage has no token', async () => {
    localStorage.removeItem('authToken');
    await import('@/services/api');
    expect(capturedRequestHandler).not.toBeNull();

    const config: Record<string, Record<string, string>> = { headers: {} };
    capturedRequestHandler!(config);

    expect(config.headers['Authorization']).toBeUndefined();
  });

  // ── Response interceptor body (src/services/api.ts lines 26-36) ────────

  it('clears localStorage on 401 response', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' } as unknown as Location,
    });

    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', 'user');

    const error401: unknown = { response: { status: 401, data: {} } };
    try {
      await capturedResponseHandler!(error401);
    } catch {
      // Ignored
    }

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('preserves localStorage on 500 error', async () => {
    localStorage.setItem('authToken', 'safe');
    localStorage.setItem('user', '{"id":"42"}');
    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    const error500: unknown = { response: { status: 500, data: {} } };
    await expect(capturedResponseHandler!(error500)).rejects.toBeDefined();

    expect(localStorage.getItem('authToken')).toBe('safe');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });

  it('preserves localStorage on network error (no .response)', async () => {
    localStorage.setItem('authToken', 'preserved');
    localStorage.setItem('user', '{"id":"42"}');
    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    const error: unknown = { request: {} };
    await expect(capturedResponseHandler!(error)).rejects.toBeDefined();

    expect(localStorage.getItem('authToken')).toBe('preserved');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });

  // ── Edge vs Cloud dual routing ──────────────────────────────────────────

  it('routes edge endpoints to EDGE_BASE_URL and cloud endpoints to API_BASE_URL', async () => {
    const { isEdgeEndpoint, EDGE_BASE_URL, API_BASE_URL } = await import('@/services/api');
    expect(isEdgeEndpoint('/v1/robots')).toBe(true);
    expect(isEdgeEndpoint('/robots/123')).toBe(true);
    expect(isEdgeEndpoint('/v1/commands/robot/456')).toBe(true);
    expect(isEdgeEndpoint('/auth/login')).toBe(false);
    expect(isEdgeEndpoint('/orders')).toBe(false);
    expect(isEdgeEndpoint('/tenants')).toBe(false);

    expect(capturedRequestHandler).not.toBeNull();

    // 1. Robot endpoint -> EDGE_BASE_URL
    const robotConfig: Record<string, unknown> = { url: '/v1/robots', headers: {} };
    capturedRequestHandler!(robotConfig);
    expect(robotConfig.baseURL).toBe(EDGE_BASE_URL);

    // 2. Auth endpoint -> API_BASE_URL (Cloud)
    const authConfig: Record<string, unknown> = { url: '/auth/login', headers: {} };
    capturedRequestHandler!(authConfig);
    expect(authConfig.baseURL).toBe(API_BASE_URL);
  });

  // ── SignalR 401 & Silent Refresh Helpers ──────────────────────────────

  it('correctly detects 401 unauthorized errors', async () => {
    const { isUnauthorizedError } = await import('@/services/api');
    expect(isUnauthorizedError({ statusCode: 401 })).toBe(true);
    expect(isUnauthorizedError({ status: 401 })).toBe(true);
    expect(isUnauthorizedError(new Error('Failed to start connection: Error: Unauthorized'))).toBe(true);
    expect(isUnauthorizedError(new Error('Error: 401 Unauthorized during negotiate'))).toBe(true);
    expect(isUnauthorizedError(new Error('Network error: 500 Internal Server Error'))).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });

  it('detects expired JWT tokens based on exp claim', async () => {
    const { isJwtTokenExpired } = await import('@/services/api');
    expect(isJwtTokenExpired(null)).toBe(true);
    expect(isJwtTokenExpired('')).toBe(true);
    expect(isJwtTokenExpired('invalid-token')).toBe(true);

    // Create a mock token expiring in the past
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const expiredPayload = btoa(JSON.stringify({ exp: pastExp }));
    expect(isJwtTokenExpired(`header.${expiredPayload}.signature`)).toBe(true);

    // Create a mock token expiring in 1 hour
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validPayload = btoa(JSON.stringify({ exp: futureExp }));
    expect(isJwtTokenExpired(`header.${validPayload}.signature`)).toBe(false);
  });

  it('handleSignalR401 clears auth session and redirects to /login if no refreshToken', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/dashboard', href: '' } as unknown as Location,
    });

    const { handleSignalR401 } = await import('@/services/api');
    localStorage.setItem('authToken', 'expired-token');
    localStorage.removeItem('refreshToken');

    const refreshed = await handleSignalR401();
    expect(refreshed).toBe(false);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(window.location.href).toBe('/login');

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});

