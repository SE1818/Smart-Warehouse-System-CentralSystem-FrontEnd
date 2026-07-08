import { describe, it, expect, vi, beforeEach } from 'vitest';




vi.mock('@/services/api', () => ({ __esModule: true, default: { get: mockGet, post: mockPost } }));

import apiClient from '@/services/api';
import { authService } from '@/services/auth';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('authService', () => {
  it('login calls post', async () => {
    mockPost.mockResolvedValue({ data: { accessToken: 't', user: { id: 'u1' } } });
    const res = await authService.login({ email: 'a@b.com', password: 'p' });
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'p' });
    expect(res.accessToken).toBe('t');
  });
  it('register calls post', async () => {
    mockPost.mockResolvedValue({ data: { accessToken: 't' } });
    await authService.register({ email: 'a@b.com', password: 'p', name: 'n' });
    expect(mockPost).toHaveBeenCalledWith('/auth/register', { email: 'a@b.com', password: 'p', name: 'n' });
  });
  it('externalLogin calls post', async () => {
    mockPost.mockResolvedValue({ data: { accessToken: 't' } });
    await authService.externalLogin({ provider: 'GG', token: 'tk' });
    expect(mockPost).toHaveBeenCalledWith('/auth/external-login', { provider: 'GG', token: 'tk' });
  });
  it('refreshToken calls post', async () => {
    mockPost.mockResolvedValue({ data: { accessToken: 'new' } });
    const res = await authService.refreshToken('rt');
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'rt' });
    expect(res.accessToken).toBe('new');
  });
  it('logout calls post', async () => {
    mockPost.mockResolvedValue({ data: {} });
    await authService.logout();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
  });
  it('getProfile calls get and returns user', async () => {
    mockGet.mockResolvedValue({ data: { id: 'u1', name: 'A' } });
    const res = await authService.getProfile();
    expect(mockGet).toHaveBeenCalledWith('/auth/profile');
    expect(res.id).toBe('u1');
  });
  it('forgotPassword calls post', async () => {
    mockPost.mockResolvedValue({ data: { message: 'sent' } });
    const res = await authService.forgotPassword({ email: 'a@b.com' });
    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });
    expect(res.message).toBe('sent');
  });
  it('resetPassword calls post', async () => {
    mockPost.mockResolvedValue({ data: { message: 'ok' } });
    await authService.resetPassword({ token: 'tk', newPassword: 'n' });
    expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', { token: 'tk', newPassword: 'n' });
  });
  it('resendVerification calls post', async () => {
    mockPost.mockResolvedValue({ data: { message: 'sent' } });
    await authService.resendVerification({ email: 'a@b.com' });
    expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', { email: 'a@b.com' });
  });
  it('verifyEmail calls get with params', async () => {
    mockGet.mockResolvedValue({ data: { message: 'verified' } });
    const res = await authService.verifyEmail('token123');
    expect(mockGet).toHaveBeenCalledWith('/auth/verify-email', { params: { token: 'token123' } });
    expect(res.message).toBe('verified');
  });
});
