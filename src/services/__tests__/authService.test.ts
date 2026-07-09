import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { post: vi.fn(), get: vi.fn() },
}));

import apiClient from '@/services/api';
import { authService } from '@/services/auth';

const post = apiClient.post as ReturnType<typeof vi.fn>;
const get = apiClient.get as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('authService', () => {
  it('login posts credentials and returns token', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1', refreshToken: 'r1', accessTokenExpiresIn: '3600s', role: 'Customer', email: 'u@t.com' } });
    const res = await authService.login({ email: 'u@t.com', password: 'pass' });
    expect(res.accessToken).toBe('t1');
  });

  it('register returns accessToken', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1', refreshToken: 'r1', accessTokenExpiresIn: '3600s', role: 'Customer', email: 'n@t.com' } });
    const res = await authService.register({ email: 'n@t.com', password: 'p', username: 'New User' });
    expect(res.accessToken).toBe('t1');
  });

  it('externalLogin with Google', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1', refreshToken: 'r1', accessTokenExpiresIn: '3600s', role: 'Customer' } });
    await authService.externalLogin({ provider: 'Google', idToken: 'gt' });
    expect(post).toHaveBeenCalled();
  });

  it('refreshToken', async () => {
    post.mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'r2', accessTokenExpiresIn: '3600s', role: 'Customer' } });
    const res = await authService.refreshToken('rt');
    expect(res.accessToken).toBe('new');
  });

  it('logout', async () => {
    post.mockResolvedValue({ data: {} });
    await authService.logout();
    expect(post).toHaveBeenCalled();
  });

  it('getProfile returns User with username', async () => {
    get.mockResolvedValue({ data: { id: 'u1', username: 'User', email: 'u@t.com', role: 'Customer', isActive: true, createdAt: '2024-01-01' } });
    const res = await authService.getProfile();
    expect(res.username).toBe('User');
  });

  it('forgotPassword', async () => {
    post.mockResolvedValue({ data: { message: 'Email sent' } });
    const res = await authService.forgotPassword({ email: 'u@t.com' });
    expect(res.message).toBe('Email sent');
  });

  it('resetPassword needs email and token', async () => {
    post.mockResolvedValue({ data: { message: 'Reset ok' } });
    const res = await authService.resetPassword({ email: 'u@t.com', token: 'tk', newPassword: 'np' });
    expect(res.message).toBe('Reset ok');
  });

  it('resendVerification', async () => {
    post.mockResolvedValue({ data: { message: 'Sent' } });
    await authService.resendVerification({ email: 'u@t.com' });
    expect(post).toHaveBeenCalled();
  });

  it('verifyEmail with token', async () => {
    get.mockResolvedValue({ data: { message: 'Verified' } });
    const res = await authService.verifyEmail('token123');
    expect(res.message).toBe('Verified');
  });
});
