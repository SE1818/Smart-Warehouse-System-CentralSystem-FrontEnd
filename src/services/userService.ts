import apiClient from './api';

export interface AdminUserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isLockedOut?: boolean;
}

export const userService = {
  async getAllUsers(): Promise<AdminUserResponse[]> {
    const res = await apiClient.get<AdminUserResponse[]>('/admin/users');
    return res.data;
  },

  async updateUserRole(id: string, role: string): Promise<AdminUserResponse> {
    const res = await apiClient.put<AdminUserResponse>(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<AdminUserResponse> {
    const res = await apiClient.put<AdminUserResponse>(`/admin/users/${id}/status`, { isActive });
    return res.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  }
};
