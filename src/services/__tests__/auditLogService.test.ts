import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogService } from '@/services/auditLogService';

// Mock the apiClient
vi.mock('@/services/api', () => {
  const mockGet = vi.fn();
  return { default: { get: mockGet } };
});

import apiClient from '@/services/api';
const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auditLogService', () => {
  it('getLogs builds query params from filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await auditLogService.getLogs({
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      entityType: 'User',
      activityType: 'CREATE',
      severity: 'High',
      search: 'test',
      page: 2,
      limit: 50,
    });
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-06-01');
    expect(url).toContain('entityType=User');
    expect(url).toContain('activityType=CREATE');
    expect(url).toContain('severity=High');
    expect(url).toContain('search=test');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
  });

  it('getLogs with no filters produces base URL', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await auditLogService.getLogs({});
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs?');
  });

  it('getUserLogs calls correct URL', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const result = await auditLogService.getUserLogs('user-abc');
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/user/user-abc?limit=100');
    expect(result).toEqual([]);
  });

  it('getUserLogs uses custom limit', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await auditLogService.getUserLogs('user-1', 50);
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/user/user-1?limit=50');
  });

  it('getEntityLogs calls correct URL', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await auditLogService.getEntityLogs('Order');
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/entity/Order?limit=100');
  });

  it('getLogById returns data', async () => {
    const mockLog = { id: 'log-1', action: 'CREATE', userId: 'u1' };
    mockGet.mockResolvedValue({ data: mockLog });
    const result = await auditLogService.getLogById('log-1');
    expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs/log-1');
    expect(result).toEqual(mockLog);
  });
});
