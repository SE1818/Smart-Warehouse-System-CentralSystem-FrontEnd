import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/services/auth', () => ({
  __esModule: true,
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    externalLogin: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getProfile: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerification: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

import { authService } from '@/services/auth';
import type { User, AuthResponse } from '@/types/auth';
import { AuthProvider, AuthContext, type AuthContextType } from '@/contexts/AuthContext';

const mockLogin = vi.mocked(authService.login);
const mockLogout = vi.mocked(authService.logout);
const mockGetProfile = vi.mocked(authService.getProfile);

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

const mockAuthService = {
  login: mockLogin,
  logout: mockLogout,
  getProfile: mockGetProfile,
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthService.login.mockClear();
    mockAuthService.logout.mockClear();
    mockAuthService.getProfile.mockClear();
  });

  it('renders children without throwing', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <div>child content</div>
        </AuthProvider>
      </BrowserRouter>,
    );
    expect(within(container).getByText('child content')).toBeDefined();
  });

  it('loading starts as true and becomes false after mount', async () => {
    let capturedLoading: boolean | undefined;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              capturedLoading = ctx?.loading;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
    );

    expect(capturedLoading).toBe(true);

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    let finalLoading = true;

    const { container: container2 } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              if (ctx) finalLoading = ctx.loading;
              return <div>child2</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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
            {(ctx: AuthContextType | null) => {
              if (ctx) loadingValue = ctx.loading;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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
            {(ctx: AuthContextType | null) => {
              if (ctx) restoredUser = ctx.user;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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
      </BrowserRouter>,
    );

    await waitFor(() => expect(localStorage.getItem('user')).toBeNull(), { timeout: 500 });
  });

  it('login calls authService.login then getProfile', async () => {
    const loginMock = mockAuthService.login;
    const getProfileMock = mockAuthService.getProfile;
    loginMock.mockResolvedValue(mockAuthResponse);
    getProfileMock.mockResolvedValue(mockUser);

    let loginFn = null as unknown as (email: string, password: string) => Promise<void>;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              if (ctx) loginFn = ctx.login;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(within(container).getByText('child')).toBeDefined();
    }, { timeout: 500 });

    expect(loginFn).not.toBeNull();
    if (!loginFn) return;

    await loginFn('test@example.com', 'password123');

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(getProfileMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBe('mock-access-token');
  });

  it('logout calls authService.logout and clears localStorage', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    localStorage.setItem('authToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    let logoutFn = null as unknown as () => Promise<void>;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              if (ctx) logoutFn = ctx.logout;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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

    let refreshFn = null as unknown as () => Promise<void>;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              if (ctx) refreshFn = ctx.refreshUser;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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

    let refreshFn = null as unknown as () => Promise<void>;

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <AuthContext.Consumer>
            {(ctx: AuthContextType | null) => {
              if (ctx) refreshFn = ctx.refreshUser;
              return <div>child</div>;
            }}
          </AuthContext.Consumer>
        </AuthProvider>
      </BrowserRouter>,
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
