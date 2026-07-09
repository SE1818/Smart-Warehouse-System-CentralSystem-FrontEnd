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
        use: vi.fn((handler: (error: unknown) => Promise<unknown>) => {
          capturedResponseHandler = handler;
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
    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    const error401: unknown = { response: { status: 401, data: {} } };
    void capturedResponseHandler!(error401);

  expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('preserves localStorage on 500 error', async () => {
    localStorage.setItem('authToken', 'safe');
    localStorage.setItem('user', '{"id":"42"}');
    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    const error500: unknown = { response: { status: 500, data: {} } };
    capturedResponseHandler!(error500);

    expect(localStorage.getItem('authToken')).toBe('safe');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });

  it('preserves localStorage on network error (no .response)', async () => {
    localStorage.setItem('authToken', 'preserved');
    localStorage.setItem('user', '{"id":"42"}');
    await import('@/services/api');
    expect(capturedResponseHandler).not.toBeNull();

    const error: unknown = { request: {} };
    capturedResponseHandler!(error);

    expect(localStorage.getItem('authToken')).toBe('preserved');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });
});
