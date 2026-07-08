import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { authService } from '@/services/auth';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('authService', () => {
  it('login posts credentials and returns data', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1', refreshToken: 'r1', expiresIn: 3600, user: { id: 'u1', name: 'User', email: 'u@t.com', role: 'Customer' } } });
    const res = await authService.login({ email: 'u@t.com', password: 'pass' });
    expect(res.accessToken).toBe('t1');
  });

  it('register returns response', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1', user: { id: 'u2' } } });
    const res = await authService.register({ email: 'n@t.com', password: 'p', name: 'New User' });
    expect(res.user.id).toBe('u2');
  });

  it('externalLogin', async () => {
    post.mockResolvedValue({ data: { accessToken: 't1' } });
    await authService.externalLogin({ provider: 'GOOGLE', token: 'gt' });
  });

  it('refreshToken', async () => {
    post.mockResolvedValue({ data: { accessToken: 'new' } });
    const res = await authService.refreshToken('rt');
    expect(res.accessToken).toBe('new');
  });

  it('logout', async () => {
    post.mockResolvedValue({ data: {} });
    await authService.logout();
  });

  it('getProfile returns user', async () => {
    get.mockResolvedValue({ data: { id: 'u1', name: 'User', email: 'u@t.com', role: 'Customer' } });
    const res = await authService.getProfile();
    expect(res.name).toBe('User');
  });

  it('forgotPassword', async () => {
    post.mockResolvedValue({ data: { message: 'Email sent' } });
    const res = await authService.forgotPassword({ email: 'u@t.com' });
    expect(res.message).toBe('Email sent');
  });

  it('resetPassword', async () => {
    post.mockResolvedValue({ data: { message: 'Reset ok' } });
    const res = await authService.resetPassword({ token: 'tk', newPassword: 'np' });
    expect(res.message).toBe('Reset ok');
  });

  it('resendVerification', async () => {
    post.mockResolvedValue({ data: { message: 'Sent' } });
    await authService.resendVerification({ email: 'u@t.com' });
  });

  it('verifyEmail with token param', async () => {
    get.mockResolvedValue({ data: { message: 'Verified' } });
    const res = await authService.verifyEmail('token123');
    expect(res.message).toBe('Verified');
  });
});
