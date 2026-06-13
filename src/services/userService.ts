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
  /**
   * Get all users in the system
   * GET /api/admin/users
   */
  async getAllUsers(): Promise<AdminUserResponse[]> {
    const res = await apiClient.get<AdminUserResponse[]>('/admin/users');
    return res.data;
  },

  /**
   * Update user's role
   * PUT /api/admin/users/{id}/role
   */
  async updateUserRole(id: string, role: string): Promise<AdminUserResponse> {
    const res = await apiClient.put<AdminUserResponse>(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  /**
   * Update user's active status
   * PUT /api/admin/users/{id}/status
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<AdminUserResponse> {
    const res = await apiClient.put<AdminUserResponse>(`/admin/users/${id}/status`, { isActive });
    return res.data;
  },

  /**
   * Delete a user
   * DELETE /api/admin/users/{id}
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  }
};
