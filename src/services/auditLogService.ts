import apiClient from './api';
import type { AuditLog, AuditLogFilters } from '@/types';

export const auditLogService = {
  /**
   * Get audit logs by date range
   * GET /api/admin/audit-logs
   */
  async getLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.activityType) params.append('activityType', filters.activityType);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<AuditLog[]>(
      `/admin/audit-logs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get audit logs by user ID
   * GET /api/admin/audit-logs/user/{userId}
   */
  async getUserLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    const response = await apiClient.get<AuditLog[]>(
      `/admin/audit-logs/user/${userId}?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get audit logs by entity type
   * GET /api/admin/audit-logs/entity/{entityType}
   */
  async getEntityLogs(entityType: string, limit = 100): Promise<AuditLog[]> {
    const response = await apiClient.get<AuditLog[]>(
      `/admin/audit-logs/entity/${entityType}?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get single audit log detail
   * GET /api/admin/audit-logs/{id}
   */
  async getLogById(id: string): Promise<AuditLog> {
    const response = await apiClient.get<AuditLog>(`/admin/audit-logs/${id}`);
    return response.data;
  },
};