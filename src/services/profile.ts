import apiClient from './api';
import type { Profile, UpdateProfileRequest } from '@/types/profile';

export const profileService = {
  async getProfile(): Promise<Profile> {
    const response = await apiClient.get<Profile>('/v1/account/me');
    return response.data;
  },

  async updateProfile(request: UpdateProfileRequest): Promise<Profile> {
    const response = await apiClient.put<Profile>('/v1/account/profile', request);
    return response.data;
  },
};
