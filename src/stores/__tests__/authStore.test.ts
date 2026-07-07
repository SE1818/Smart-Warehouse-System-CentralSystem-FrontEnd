import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import type { User, AuthResponse } from '@/types/auth';
import { authService } from '@/services';

vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  it('should initialize with null values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('should login successfully and store user data', async () => {
    const mockResponse = {
      accessToken: 'mock-access-token',
      role: 'admin',
      email: 'admin@test.com',
    };
    const mockUser: User = {
      id: '1',
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      isActive: true,
      createdAt: '2025-01-01',
    };
    vi.mocked(authService.login).mockResolvedValueOnce(mockResponse as AuthResponse);
    vi.mocked(authService.getProfile).mockResolvedValueOnce(mockUser);

    const result = await useAuthStore.getState().login({ email: 'admin@test.com', password: 'password123' });

    expect(result).toBe(true);
    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-access-token');
    expect(state.role).toBe('admin');
    expect(state.user).toEqual(mockUser);
    expect(localStorage.getItem('authToken')).toBe('mock-access-token');
    expect(localStorage.getItem('authRole')).toBe('admin');
  });

  it('should return false on login failure', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('API error'));

    const result = await useAuthStore.getState().login({ email: 'bad@test.com', password: 'wrong' });

    expect(result).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('should return false when login returns no token', async () => {
    const emptyResponse = { accessToken: '' } as AuthResponse;
  vi.mocked(authService.login).mockResolvedValueOnce(emptyResponse);

    const result = await useAuthStore.getState().login({ email: 'test@test.com', password: 'pass' });

    expect(result).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('should clear all state on logout', async () => {
    const user: User = { id: '1', username: 'test', email: 'test@test.com', role: 'admin', isActive: true, createdAt: '' };
    useAuthStore.setState({ user, token: 'some-token', role: 'admin' });
    localStorage.setItem('authToken', 'some-token');
    localStorage.setItem('authRole', 'admin');
    localStorage.setItem('user', JSON.stringify(user));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('should set user directly', () => {
    const user: User = { id: '1', username: 'test', email: 'test@test.com', role: 'user', isActive: true, createdAt: '' };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('should initialize from localStorage', () => {
    const storedUser: User = { id: '1', username: 'test', email: 'test@test.com', role: 'admin', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'stored-token');
    localStorage.setItem('authRole', 'admin');
    localStorage.setItem('user', JSON.stringify(storedUser));

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.token).toBe('stored-token');
    expect(state.role).toBe('admin');
    expect(state.user).toEqual(storedUser);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('authRole', 'admin');
    localStorage.setItem('user', 'not-valid-json');

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.role).toBeNull();
  });
});
