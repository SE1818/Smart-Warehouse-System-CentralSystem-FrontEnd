import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/api', () => ({ __esModule: true, default: { get: mockGet, post: mockPost, delete: mockDelete } }));

import apiClient from '@/services/api';
import { transferService } from '@/services/transferService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('transferService', () => {
  it('listTransfers', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.listTransfers();
    expect(get).toHaveBeenCalledWith('/v1/tasks');
  });
  it('getTransferStats', async () => {
    get.mockResolvedValue({ data: { totalToday: 0, active: 0, completed: 0, failed: 0, cancelled: 0, avgDurationMinutes: 0, byRobot: {} } });
    const res = await transferService.getTransferStats();
    expect(res.totalToday).toBe(0);
  });
  it('getActiveTransfers', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.getActiveTransfers();
    expect(get).toHaveBeenCalledWith('/v1/tasks/active');
  });
  it('getTransferHistory', async () => {
    get.mockResolvedValue({ data: { transferRequestId: 'r1' } });
    const res = await transferService.getTransferHistory('r1');
    expect(res.transferRequestId).toBe('r1');
  });
  it('getTransferCommands', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.getTransferCommands('t1');
    expect(get).toHaveBeenCalledWith('/v1/tasks/t1/commands');
  });
  it('cancelTransfer', async () => {
    del.mockResolvedValue({ data: {} });
    await transferService.cancelTransfer('t1');
    expect(del).toHaveBeenCalledWith('/v1/tasks/t1/cancel');
  });
  it('getCommandStatusHistory', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.getCommandStatusHistory('c1');
    expect(get).toHaveBeenCalledWith('/v1/tasks/commands/c1/history');
  });
});
