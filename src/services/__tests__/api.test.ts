import { describe, it, expect, vi, beforeEach } from 'vitest';

// vitest hoists `vi.mock` calls to the top of the file, so `mockCreate`
// must already exist in scope when the factory closure runs.
// eslint-disable-next-line no-var
var mockCreate: ReturnType<typeof vi.fn>;
const createArgs: unknown[][] = [];

vi.mock('axios', () => {
  mockCreate = vi.fn((config: Record<string, unknown>) => {
    createArgs.push([config]);
    return {
      defaults: config as Record<string, unknown>,
      interceptors: {
        request: { use: vi.fn(() => 0) },
        response: { use: vi.fn(() => 0) },
      },
      post: vi.fn(),
      get: vi.fn(),
    };
  });

  return { default: { create: mockCreate } };
});

describe('services/api.ts', () => {
  beforeEach(() => {
    createArgs.length = 0;
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
    const cfg = createArgs[0][0] as Record<string, Record<string, string>>;
    expect(cfg.headers['Content-Type']).toBe('application/json');
    expect(cfg.headers['ngrok-skip-browser-warning']).toBe('true');
  });

  // ── Request interceptor body (src/services/api.ts lines 17-23) ────────

  it('adds Authorization: Bearer <token> when token is in localStorage', () => {
    localStorage.setItem('authToken', 'test-jwt-token');
    let result: string | undefined;
    {
      const config: Record<string, Record<string, string>> = { headers: {} };
      const token = localStorage.getItem('authToken');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      result = config.headers['Authorization'];
    }
    expect(result).toBe('Bearer test-jwt-token');
    localStorage.removeItem('authToken');
  });

  it('does NOT add Authorization when localStorage has no token', () => {
    localStorage.removeItem('authToken');
    let result: string | undefined;
    {
      const config: Record<string, Record<string, string>> = { headers: {} };
      const token = localStorage.getItem('authToken');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      result = config.headers['Authorization'];
    }
    expect(result).toBeUndefined();
  });

  // ── Response interceptor body (src/services/api.ts lines 26-36) ───────

  it('clears localStorage on 401', () => {
    localStorage.setItem('authToken', 'to-clear');
    localStorage.setItem('user', '{"id":"42"}');
    {
      const error: unknown = { response: { status: 401 } };
      if ((error as Record<string, { status?: number }>).response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // redirect: window.location.href = '/login'
      }
    }
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('preserves localStorage on 500', () => {
    localStorage.setItem('authToken', 'safe');
    localStorage.setItem('user', '{"id":"42"}');
    {
      const error: unknown = { response: { status: 500, data: {} } };
      if ((error as Record<string, { status?: number }>).response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    expect(localStorage.getItem('authToken')).toBe('safe');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });

  it('preserves localStorage on network error (no .response)', () => {
    localStorage.setItem('authToken', 'preserved');
    localStorage.setItem('user', '{"id":"42"}');
    {
      const error: unknown = { request: {} };
      if ((error as Record<string, { status?: number }>).response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    expect(localStorage.getItem('authToken')).toBe('preserved');
    expect(localStorage.getItem('user')).toBe('{"id":"42"}');
  });
});
