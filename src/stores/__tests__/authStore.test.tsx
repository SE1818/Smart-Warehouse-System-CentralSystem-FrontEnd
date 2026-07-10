import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/auth';

// Mock the auth service directly on the module
vi.mock('@/services/auth', () => ({
  __esModule: true,
  authService: {
    login: vi.fn() as ReturnType<typeof vi.fn>,
    logout: vi.fn() as ReturnType<typeof vi.fn>,
    getProfile: vi.fn() as ReturnType<typeof vi.fn>,
    register: vi.fn() as ReturnType<typeof vi.fn>,
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

const mockLoginResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  accessTokenExpiresIn: '3600',
  role: 'Warehouse' as const,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isLoading: false,
    });
  });

  it('initial state has user=null, token=null, isLoading=false', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('initialize() restores session from localStorage', () => {
    localStorage.setItem('authToken', 'stored-token');
    localStorage.setItem('authRole', 'Admin');
    localStorage.setItem('user', JSON.stringify(mockUser));

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('stored-token');
    expect(state.role).toBe('Admin');
    expect(state.isLoading).toBe(false);
  });

  it('initialize() does nothing when localStorage is incomplete', () => {
    localStorage.setItem('authToken', 'token-only');

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });

  it('initialize() handles corrupted JSON gracefully', () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('authRole', 'Admin');
    localStorage.setItem('user', 'not-valid-json');

    // Should not throw
    expect(() => useAuthStore.getState().initialize()).not.toThrow();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });

  it('login() calls authService.login, stores token, and fetches profile', async () => {
    mockAuthService.login.mockResolvedValue(mockLoginResponse);
    mockAuthService.getProfile.mockResolvedValue(mockUser);

    const result = await useAuthStore.getState().login({ email: 'test@example.com', password: 'pass123' });

    expect(result).toBe(true);
    expect(mockAuthService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pass123' });
    expect(mockAuthService.getProfile).toHaveBeenCalledTimes(1);

    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-access-token');
    expect(state.role).toBe('Warehouse');
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
    expect(localStorage.getItem('authToken')).toBe('mock-access-token');
    expect(localStorage.getItem('authRole')).toBe('Warehouse');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(mockUser);
  });

  it('login() returns false when no token in response', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: '',
      refreshToken: 'rt',
      accessTokenExpiresIn: '3600',
      role: 'Warehouse',
    });

    const result = await useAuthStore.getState().login({ email: 'test@example.com', password: 'pass123' });

    expect(result).toBe(false);
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('login() returns false when authService.login throws', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Network error'));

    const result = await useAuthStore.getState().login({ email: 'bad@example.com', password: 'wrong' });

    expect(result).toBe(false);
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('logout() clears localStorage and resets state', async () => {
    // Pre-populate state
    useAuthStore.setState({
      user: mockUser,
      token: 'some-token',
      role: 'Warehouse',
      isLoading: false,
    });
    localStorage.setItem('authToken', 'some-token');
    localStorage.setItem('authRole', 'Warehouse');
    localStorage.setItem('user', JSON.stringify(mockUser));

    mockAuthService.logout.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authRole')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });

  it('logout() clears state even when authService.logout throws', async () => {
    useAuthStore.setState({
      user: mockUser,
      token: 'some-token',
      role: 'Warehouse',
      isLoading: false,
    });
    localStorage.setItem('authToken', 'some-token');

    mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('setUser() updates user state', () => {
    expect(useAuthStore.getState().user).toBeNull();

    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});
