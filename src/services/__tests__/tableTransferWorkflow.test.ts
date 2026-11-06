import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { robotService } from '@/services/robot';

const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Table Transfer Workflow Validation Logic', () => {
  // Helper mimicking StaffKdsPage table transfer validation logic
  const canPerformTableTransfer = (params: {
    isSignalRConnected: boolean;
    hasActiveSequence: boolean;
    sequenceStatus: string;
    robotStatus: string;
  }) => {
    const { isSignalRConnected, hasActiveSequence, sequenceStatus, robotStatus } = params;
    const normalized = robotStatus.toLowerCase().replace(/[\s-]/g, '_');
    const isInTransit = normalized === 'in_transit' || normalized === 'moving';

    return (
      isSignalRConnected &&
      hasActiveSequence &&
      sequenceStatus === 'in_progress' &&
      isInTransit
    );
  };

  it('allows table transfer when robot is actively in_transit with SignalR connected', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'in_transit',
    });
    expect(result).toBe(true);
  });

  it('allows table transfer when robot status is moving', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'Moving',
    });
    expect(result).toBe(true);
  });

  it('blocks table transfer when SignalR is disconnected', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: false,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'in_transit',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot has already arrived at table', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'arrived',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot is idle at kitchen', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'idle',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot is returning to kitchen', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'returning',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when sequence is completed', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'completed',
      robotStatus: 'in_transit',
    });
    expect(result).toBe(false);
  });

  it('successfully executes rerouteTask API when in_transit', async () => {
    post.mockResolvedValue({
      data: { success: true, message: 'Đã chuyển hướng thành công.' },
    });

    const res = await robotService.rerouteTask('task-101', 'station-B08', 'Bàn 08', 'Khách đổi chỗ');
    expect(post).toHaveBeenCalledWith('/v1/tasks/task-101/reroute', {
      newStationId: 'station-B08',
      newTableNo: 'Bàn 08',
      reason: 'Khách đổi chỗ',
      requestedBy: 'Staff KDS',
    });
    expect(res.success).toBe(true);
  });

  it('filters out occupied and serving tables for 2-tray mission', () => {
    const allTables = [
      { id: 't1', name: 'Bàn 01', status: 'available' },
      { id: 't2', name: 'Bàn 02', status: 'occupied' }, // occupied - should filter
      { id: 't3', name: 'Bàn 03', status: 'serving' },  // serving - should filter
      { id: 't5', name: 'Bàn 05', status: 'waiting' },  // waiting - valid
    ];

    const currentTrayTable = 'Bàn 01';
    const otherTrayTable = 'Bàn 05';

    // Reroute for Tray 1: must filter current table, other tray table, occupied, serving
    const validForTray1 = allTables.filter(
      (t) =>
        t.name !== currentTrayTable &&
        t.name !== otherTrayTable &&
        t.status !== 'occupied' &&
        t.status !== 'serving'
    );

    expect(validForTray1).toHaveLength(0); // none left

    // If otherTrayTable is Bàn 09 (not in list)
    const validWithFreeTable = allTables.filter(
      (t) =>
        t.name !== currentTrayTable &&
        t.name !== 'Bàn 09' &&
        t.status !== 'occupied' &&
        t.status !== 'serving'
    );

    expect(validWithFreeTable.map((t) => t.name)).toEqual(['Bàn 05']);
  });
});

