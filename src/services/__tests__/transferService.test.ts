
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { transferService } from '@/services/transferService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('transferService', () => {
  it('listTransfers', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.listTransfers();
    expect(get).toHaveBeenCalledWith('/v1/tasks');
  });
  it('getTransferStats', async () => {
    get.mockResolvedValue({ data: { totalToday: 0 } });
    const res = await transferService.getTransferStats();
    expect(res.totalToday).toBe(0);
  });
  it('getActiveTransfers', async () => {
    get.mockResolvedValue({ data: [] });
    await transferService.getActiveTransfers();
  });
  it('getTransferHistory', async () => {
    get.mockResolvedValue({ data: {} });
    await transferService.getTransferHistory('t1');
  });
  it('getTransferCommands', async () => {
    get.mockResolvedValue({ data: [{ id: 'c1', commandType: 'MOVE' }] });
    const res = await transferService.getTransferCommands('t1');
    expect(res[0].commandType).toBe('MOVE');
  });
  it('getTransferResponses', async () => {
    get.mockResolvedValue({ data: [{ id: 'r1', status: 'DELIVERED' }] });
    const res = await transferService.getTransferResponses('t1');
    expect(res[0].status).toBe('DELIVERED');
  });
  it('getCommandStatusHistory', async () => {
    get.mockResolvedValue({ data: [{ id: 'h1', newStatus: 'EXECUTING' }] });
    const res = await transferService.getCommandStatusHistory('c1');
    expect(res[0].newStatus).toBe('EXECUTING');
  });
  it('cancelTransfer calls correct URL', async () => {
    del.mockResolvedValue({ data: {} });
    await transferService.cancelTransfer('t1');
    expect(del).toHaveBeenCalledWith('/v1/tasks/t1/cancel');
  });
  it('getCommandLog', async () => {
    get.mockResolvedValue({ data: { commandId: 'c1', executionResult: 'OK' } });
    const res = await transferService.getCommandLog('c1');
    expect(res.executionResult).toBe('OK');
  });
  it('startServiceSequence calls /v1/tasks/sequence/start with payload', async () => {
    const mockResult = {
      success: true,
      message: 'Sequence started',
      robotId: 'r1',
      robotName: 'AMR-01',
      totalStops: 2,
      totalWeightKg: 5.0,
      createdTasks: [],
    };
    post.mockResolvedValue({ data: mockResult });

    const req = {
      fromStationId: 'st-kitchen',
      trayAssignments: [
        { cargoLevel: 1, toStationId: 'st-01', weightKg: 2.0, volumeLiters: 3.0, priority: 1 },
      ],
    };

    const res = await transferService.startServiceSequence(req);
    expect(post).toHaveBeenCalledWith('/v1/tasks/sequence/start', req);
    expect(res.success).toBe(true);
    expect(res.totalStops).toBe(2);
  });
});
