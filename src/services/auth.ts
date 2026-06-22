import apiClient from './api';
import type { LoginRequest, RegisterRequest, ExternalLoginRequest, AuthResponse, User } from '@/types/auth';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  async externalLogin(data: ExternalLoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post('/auth/external-login', data);
    return res.data;
  },
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return res.data;
  },
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
  async getProfile(): Promise<User> {
    const res = await apiClient.get('/auth/profile');
    return res.data;
  },
};
