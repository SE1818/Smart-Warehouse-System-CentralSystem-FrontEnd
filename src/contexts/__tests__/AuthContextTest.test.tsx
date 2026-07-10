import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, AuthContext } from '@/contexts/AuthContext';
import type { User, AuthResponse } from '@/types/auth';

vi.mock('@/services/auth', () => ({
  __esModule: true,
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuthService = (await import('@/services/auth')).authService as any;

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'Warehouse',
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
};

const mockAuthResponse: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  accessTokenExpiresIn: '3600',
  role: 'Warehouse',
  email: 'test@example.com',
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders children without throwing', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <div>child content</div>
        </AuthProvider>
      </BrowserRouter>
    );
    expect(within(container).getByText('child content')).toBeDefined();
  });

  it('loading starts as true and becomes false after mount', async () => {
    let capturedLoading: boolean | undefined;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              capturedLoading = ctx?.loading;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    // Initial render: loading should be true (default useState(true))
    expect(capturedLoading).toBe(true);

    // After the setTimeout(..., 0) fires, loading becomes false
    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    // Verify the context now reflects loading=false via a second render
    let finalLoading = true;

    const { container: container2 } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) finalLoading = ctx.loading;
              return <div>child2</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container2).getByText('child2')).toBeDefined();
      expect(finalLoading).toBe(false);
    }, { timeout: 500 });
  });

  it('loading becomes false immediately when localStorage is empty', async () => {
    let loadingValue = true;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) loadingValue = ctx.loading;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
      expect(loadingValue).toBe(false);
    }, { timeout: 500 });
  });

  it('restores user from localStorage on mount', async () => {
    const storedUser: User = {
      ...mockUser,
      username: 'stored-user',
    };
    localStorage.setItem('user', JSON.stringify(storedUser));

    let restoredUser: User | null = null;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) restoredUser = ctx.user;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
      expect(restoredUser).not.toBeNull();
      expect(restoredUser?.email).toBe(storedUser.email);
      expect(restoredUser?.role).toBe(storedUser.role);
    }, { timeout: 500 });
  });

  it('removes corrupted user from localStorage on mount', async () => {
    localStorage.setItem('user', 'not-valid-json{"broken":');

    render(
      <BrowserRouter>
        <AuthProvider>
          <div>child</div>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => expect(localStorage.getItem('user')).toBeNull(), { timeout: 500 });
  });

  it('login calls authService.login then getProfile', async () => {
    mockAuthService.login.mockResolvedValue(mockAuthResponse);
    mockAuthService.getProfile.mockResolvedValue(mockUser);

    let loginFn: ((email: string, password: string) => Promise<void>) | null = null;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) loginFn = ctx.login;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    expect(loginFn).not.toBeNull();
    if (!loginFn) return;

    await loginFn('test@example.com', 'password123');

    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(mockAuthService.getProfile).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBe('mock-access-token');
  });

  it('logout calls authService.logout and clears localStorage', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    localStorage.setItem('authToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    let logoutFn: (() => Promise<void>) | null = null;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) logoutFn = ctx.logout;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    expect(logoutFn).not.toBeNull();
    if (!logoutFn) return;

    await logoutFn();

    expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('authRole')).toBeNull();
  });

  it('refreshUser updates user from API', async () => {
    mockAuthService.getProfile.mockResolvedValue(mockUser);

    let refreshFn: (() => Promise<void>) | null = null;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) refreshFn = ctx.refreshUser;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    expect(refreshFn).not.toBeNull();
    if (!refreshFn) return;

    await refreshFn();

    expect(mockAuthService.getProfile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(mockUser);
  });

  it('refreshUser clears user and token on 401 error', async () => {
    localStorage.setItem('authToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    mockAuthService.getProfile.mockRejectedValue(new Error('401 Unauthorized'));

    let refreshFn: (() => Promise<void>) | null = null;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx) => {
              if (ctx) refreshFn = ctx.refreshUser;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    expect(refreshFn).not.toBeNull();
    if (!refreshFn) return;

    await refreshFn();

    expect(mockAuthService.getProfile).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('authRole')).toBeNull();
  });
});
