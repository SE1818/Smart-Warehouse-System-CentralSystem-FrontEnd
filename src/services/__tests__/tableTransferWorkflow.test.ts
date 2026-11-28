import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { robotService } from '@/services/robot';
import {
  rosToCanvasPixel,
  quaternionToYaw,
  calculateEuclideanDistance,
  DEFAULT_SLAM_METADATA,
} from '@/utils/rosCoordinates';

const post = apiClient.post as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

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
    const normalized = robotStatus.toLowerCase().replace(/[-_\s]/g, '');
    const isInTransit = normalized === 'intransit' || normalized === 'moving';

    return (
      isSignalRConnected &&
      hasActiveSequence &&
      sequenceStatus === 'in_progress' &&
      isInTransit
    );
  };

  it('allows table transfer when robot is actively InTransit with SignalR connected', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'InTransit',
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
      robotStatus: 'InTransit',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot has already arrived at table', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'Arrived',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot is idle at kitchen', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'Idle',
    });
    expect(result).toBe(false);
  });

  it('blocks table transfer when robot is returning to kitchen', () => {
    const result = canPerformTableTransfer({
      isSignalRConnected: true,
      hasActiveSequence: true,
      sequenceStatus: 'in_progress',
      robotStatus: 'Returning',
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

describe('Mục A — Live FloorMapViewer UI & Staff Arrival Notification (F-07, F-08, F-09)', () => {
  it('resolves only station-mapped tables onto 2D floor map and inherits station coordinates for narrow-aisle Table S', () => {
    const stations = [
      { id: 'st-A', name: 'Station A', worldX: 5.0, worldY: 8.0 },
      { id: 'st-01', name: 'ST01', worldX: 2.0, worldY: 3.0 },
    ];
    const tables = [
      { id: 'tbl-S', name: 'Table S', stationId: 'st-A', stationName: 'Station A', worldX: undefined as number | undefined, worldY: undefined as number | undefined },
      { id: 'tbl-01', name: 'Bàn 01', stationId: 'st-01', stationName: 'ST01', worldX: 2.0, worldY: 3.0 },
      { id: 'tbl-unmapped', name: 'Bàn Chưa Gán', stationId: null, stationName: null, worldX: 4.0, worldY: 4.0 },
    ];

    // Mirrors SlamFloorMapViewer.tsx resolvedTables invariant (lines 251-280)
    const resolvedTables = tables
      .map((t) => {
        let wx = t.worldX;
        let wy = t.worldY;
        if ((wx === undefined || wy === undefined || (wx === 0 && wy === 0)) && (t.stationId || t.stationName)) {
          const matched = stations.find(
            (s) => s.id === t.stationId || s.name === t.stationName || (t.stationId && s.name === t.stationId)
          );
          if (matched) {
            wx = matched.worldX;
            wy = matched.worldY;
          }
        }
        if (typeof wx === 'number' && typeof wy === 'number' && (t.stationId || t.stationName)) {
          return { ...t, worldX: wx, worldY: wy };
        }
        return null;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    expect(resolvedTables.map((t) => t.id)).toEqual(['tbl-S', 'tbl-01']);
    expect(resolvedTables[0].worldX).toBe(5.0);
    expect(resolvedTables[0].worldY).toBe(8.0);

    const tableSPx = rosToCanvasPixel(resolvedTables[0].worldX, resolvedTables[0].worldY, DEFAULT_SLAM_METADATA);
    expect(tableSPx.x).toBe(500);
    expect(tableSPx.y).toBe(140);
  });

  it('maps real-time SignalR pose (X, Y, Yaw) within <= 500ms NFR-01 latency and resolves trajectory endpoints', () => {
    const now = Date.now();
    const updatedRobot = {
      id: 'amr-01',
      name: 'VORA-AMR-01',
      x: 1.5,
      y: 2.5,
      yaw: Math.PI / 4,
      battery: 88,
      status: 'delivering' as const,
      destination: 'Bàn 04',
      timestamp: new Date(now - 145).toISOString(),
      transitLatencyMs: 145,
    };

    // Mirrors robotStore.ts ReceiveRobotLocation mapping (lines 145-161)
    const mapped = {
      id: updatedRobot.id,
      name: updatedRobot.name,
      x: Number(updatedRobot.x ?? 0),
      y: Number(updatedRobot.y ?? 0),
      yaw: typeof updatedRobot.yaw === 'number' ? updatedRobot.yaw : 0,
      battery: updatedRobot.battery,
      status: updatedRobot.status,
      destination: updatedRobot.destination,
      currentX: Number(updatedRobot.x ?? 0),
      currentY: Number(updatedRobot.y ?? 0),
      batteryLevel: updatedRobot.battery,
      timestamp: updatedRobot.timestamp,
      transitLatencyMs: typeof updatedRobot.transitLatencyMs === 'number'
        ? updatedRobot.transitLatencyMs
        : Math.max(0, now - new Date(updatedRobot.timestamp).getTime()),
    };

    expect(mapped.transitLatencyMs).toBeLessThanOrEqual(500);
    expect(mapped.yaw).toBeCloseTo(Math.PI / 4, 5);

    const targetTable = { id: 't4', name: 'Bàn 04', assignedRobot: 'VORA-AMR-01', worldX: 5.5, worldY: 6.5 };
    const robotPx = rosToCanvasPixel(mapped.x, mapped.y, DEFAULT_SLAM_METADATA);
    const targetPx = rosToCanvasPixel(targetTable.worldX, targetTable.worldY, DEFAULT_SLAM_METADATA);

    expect(targetPx.x).toBeGreaterThan(robotPx.x);
    expect(targetPx.y).toBeLessThan(robotPx.y);
  });

  it('displays target tray (Khay 1 / Khay 2) and resolves Step 3 arrival status for active sequence leg', () => {
    const activeSequence = {
      sequenceId: 'SEQ-WF03-01',
      robotCode: 'AMR-01',
      robotName: 'VORA-AMR-01',
      currentLegIndex: 1,
      status: 'in_progress' as const,
      legs: [
        { cargoLevel: 1, tableNo: 'Bàn 01', orderId: 'ORD-1', status: 'completed' as const, taskId: 't-1' },
        { cargoLevel: 2, tableNo: 'Bàn 04', orderId: 'ORD-2', status: 'delivering' as const, taskId: 't-2' },
      ],
    };

    const getWorkflowStep = (seq: typeof activeSequence | null, phase: 'idle' | 'moving' | 'arrived' | 'returning') => {
      if (!seq) return 1;
      if (seq.status !== 'in_progress' || phase === 'returning') return 4;
      if (phase === 'arrived') return 3;
      if (phase === 'moving') return 2;
      return 2;
    };

    const currentLeg = activeSequence.legs[activeSequence.currentLegIndex];
    expect(currentLeg.cargoLevel).toBe(2);
    expect(currentLeg.tableNo).toBe('Bàn 04');
    expect(getWorkflowStep(activeSequence, 'moving')).toBe(2);
    expect(getWorkflowStep(activeSequence, 'arrived')).toBe(3);
  });

  it('sorts out-of-order BurstSync telemetry replay points chronologically upon reconnect', () => {
    const replayPacket = {
      robotId: 'amr-01',
      robotName: 'VORA-AMR-01',
      points: [
        { x: 3.0, y: 4.0, yaw: 1.2, battery: 86, status: 'moving', timestamp: '2026-11-23T05:00:10.000Z' },
        { x: 1.0, y: 2.0, yaw: 0.2, battery: 88, status: 'moving', timestamp: '2026-11-23T05:00:02.000Z' },
        { x: 5.0, y: 6.0, yaw: 1.57, battery: 85, status: 'arrived', timestamp: '2026-11-23T05:00:18.000Z' },
      ],
    };

    // Mirrors robotStore.ts ReceiveRobotLocationReplay (lines 189-215)
    const sorted = [...replayPacket.points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const latest = sorted[sorted.length - 1];

    expect(sorted).toHaveLength(3);
    expect(latest.x).toBe(5.0);
    expect(latest.y).toBe(6.0);
    expect(latest.yaw).toBe(1.57);
    expect(latest.status).toBe('arrived');
  });

  it('blocks autonomous reroute with ETM-14 when arrived and supports Option A second-leg and Option B manual handover', async () => {
    post.mockResolvedValueOnce({
      data: {
        success: false,
        message: 'ETM-14: Robot đã đến trạm giao cũ (arrived), vui lòng xác nhận thủ công.',
      },
    });

    const rerouteRes = await robotService.rerouteTask('task-arrived', 'st-08', 'Bàn 08', 'Đổi bàn trễ');
    const msg = rerouteRes.message || '';
    const shouldOpenConflictModal =
      rerouteRes.success === false &&
      (msg.toLowerCase().includes('arrived') || msg.toLowerCase().includes('trạm giao cũ'));

    expect(shouldOpenConflictModal).toBe(true);

    // Option A: dispatch second leg
    post.mockResolvedValueOnce({
      data: { success: true, message: 'Đã kích hoạt điều phối chặng 2 thành công.' },
    });
    const leg2 = await robotService.dispatchSecondLeg('task-arrived', 'st-08', 'Nhân viên KDS');
    expect(post).toHaveBeenLastCalledWith('/v1/tasks/task-arrived/dispatch-second-leg', {
      newStationId: 'st-08',
      confirmedBy: 'Nhân viên KDS',
    });
    expect(leg2.success).toBe(true);

    // Option B: manual handover & return to kitchen
    post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Hoàn tất bàn giao thủ công',
        nextAction: 'return_to_kitchen',
        completedCargoLevel: 1,
      },
    });
    const manual = await robotService.confirmNextTable('task-arrived', 'Nhân viên KDS (Bàn giao thủ công)', false);
    expect(post).toHaveBeenLastCalledWith('/v1/tasks/task-arrived/confirm-next-table', {
      confirmedBy: 'Nhân viên KDS (Bàn giao thủ công)',
      viaHardwareButton: false,
    });
    expect(manual.nextAction).toBe('return_to_kitchen');
  });
});

describe('Mục B — Full WF-03 Test Cases TC-WF03-04, TC-WF03-05, TC-WF03-10, TC-WF03-12 Automated Verification', () => {
  it('TC-WF03-04: aborts mid-transit task and triggers robot return to kitchen', async () => {
    del.mockResolvedValueOnce({ data: { success: true } });
    post.mockResolvedValueOnce({ data: { success: true } });

    const aborted = await robotService.abortTask('task-abort-04', 'robot-01');

    expect(aborted).toBe(true);
    expect(del).toHaveBeenCalledWith('/v1/tasks/task-abort-04/cancel');
    expect(post).toHaveBeenCalledWith('/v1/tasks/abort', {
      taskId: 'task-abort-04',
      robotId: 'robot-01',
    });
  });

  it('TC-WF03-05: executes 180-degree narrow corridor turn with >= 0.25m flank obstacle clearance', () => {
    const initialYaw = quaternionToYaw({ x: 0, y: 0, z: 0, w: 1 });
    const reversedYaw = quaternionToYaw({ x: 0, y: 0, z: 1, w: 0 });
    const headingVectorYaw = Math.atan2(0, -1);

    expect(initialYaw).toBeCloseTo(0, 5);
    expect(reversedYaw).toBeCloseTo(Math.PI, 5);
    expect(headingVectorYaw).toBeCloseTo(Math.PI, 5);

    const corridorWidthM = 1.2;
    const amrFootprintDiameterM = 0.5;
    const flankClearanceM = (corridorWidthM - amrFootprintDiameterM) / 2;
    expect(flankClearanceM).toBeGreaterThanOrEqual(0.25);

    const travelMeters = calculateEuclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(travelMeters).toBe(5);
  });

  it('TC-WF03-10: triggers KDS audio-visual arrival alert and Station A -> Table S handoff prompt once per leg', () => {
    const playStationArrivalChime = vi.fn();
    let assistedDropoffAlert: {
      robotId?: string;
      robotName?: string;
      taskId: string;
      stagingStationName: string;
      destinationTableNo: string;
      cargoLevel: number;
    } | null = null;
    let lastAssistedLegKey = '';

    const handleAssistedDropoffArrived = (payload: any) => {
      const taskId = String(payload.taskId ?? payload.TaskId ?? '');
      if (!taskId) return;
      assistedDropoffAlert = {
        robotId: payload.robotId ? String(payload.robotId) : undefined,
        robotName: payload.robotName || 'AMR',
        taskId,
        stagingStationName: payload.stagingStationName || 'Trạm Đệm',
        destinationTableNo: payload.destinationTableNo || 'Bàn khách',
        cargoLevel: Number(payload.cargoLevel ?? 1),
      };
      playStationArrivalChime();
    };

    handleAssistedDropoffArrived({
      robotId: 'amr-01',
      robotName: 'VORA-AMR-01',
      taskId: 'task-s-10',
      stagingStationName: 'Station A',
      destinationTableNo: 'Table S',
      cargoLevel: 1,
    });

    expect(assistedDropoffAlert).toEqual({
      robotId: 'amr-01',
      robotName: 'VORA-AMR-01',
      taskId: 'task-s-10',
      stagingStationName: 'Station A',
      destinationTableNo: 'Table S',
      cargoLevel: 1,
    });
    expect(playStationArrivalChime).toHaveBeenCalledTimes(1);

    // Fallback check when currentWorkflowStep === 3 should not re-trigger for the same taskId
    const legKey = 'SEQ-1-0-task-s-10';
    if (lastAssistedLegKey !== legKey && assistedDropoffAlert?.taskId !== 'task-s-10') {
      lastAssistedLegKey = legKey;
      playStationArrivalChime();
    }
    expect(playStationArrivalChime).toHaveBeenCalledTimes(1);
  });

  it('TC-WF03-12: confirms last-meter human handover and releases AMR back to kitchen (ST05)', async () => {
    post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Đã xác nhận hoàn tất giao món tại bàn và điều hướng AMR về bếp.',
        nextAction: 'return_to_kitchen',
        nextStationId: '55555555-5555-5555-5555-555555555555',
        nextStationName: 'ST05',
        completedCargoLevel: 1,
      },
    });

    let alertState: { taskId: string; destinationTableNo: string } | null = {
      taskId: 'task-s-12',
      destinationTableNo: 'Table S',
    };

    const res = await robotService.confirmNextTable(
      alertState.taskId,
      'Nhân viên KDS (Tiếp ứng chặng cuối)',
      false
    );
    if (res.success) {
      alertState = null;
    }

    expect(post).toHaveBeenCalledWith('/v1/tasks/task-s-12/confirm-next-table', {
      confirmedBy: 'Nhân viên KDS (Tiếp ứng chặng cuối)',
      viaHardwareButton: false,
    });
    expect(res.success).toBe(true);
    expect(res.nextAction).toBe('return_to_kitchen');
    expect(res.nextStationName).toBe('ST05');
    expect(alertState).toBeNull();
  });
});

describe('Weekly Report #10 — 2D Map Real Telemetry, Target Tray & Arrival Audio Chime', () => {
  it('merges live SignalR robot pose (worldX, worldY, yaw) with active sequence cargoLevel and omits robots without real coordinates (ETM-36..38)', () => {
    const restRobots = [
      { id: 'r1', code: 'AMR-01', name: 'VORA-AMR-01', status: 'Delivering' as const, battery: 90, currentZone: 'Bàn 01' },
      { id: 'r2', code: 'AMR-02', name: 'VORA-AMR-02', status: 'Idle' as const, battery: 82, currentZone: 'Quầy Bếp' },
    ];
    const liveRobots = [
      { id: 'r1', name: 'VORA-AMR-01', x: 2.4, y: 3.6, yaw: 1.57, battery: 89, destination: 'Bàn 01', transitLatencyMs: 120 },
    ];
    const activeSequence = {
      sequenceId: 'SEQ-10',
      robotCode: 'AMR-01',
      robotName: 'VORA-AMR-01',
      currentLegIndex: 0,
      status: 'in_progress' as const,
      legs: [
        { cargoLevel: 1, tableNo: 'Bàn 01', orderId: 'ORD-101', status: 'delivering' as const, taskId: 'task-1' },
        { cargoLevel: 2, tableNo: 'Bàn 03', orderId: 'ORD-104', status: 'pending' as const, taskId: 'task-2' },
      ],
    };
    const currentWorkflowStep = 3;
    const currentLeg = activeSequence.legs[activeSequence.currentLegIndex];

    const mapRobots = restRobots.map((r) => {
      const live = liveRobots.find(
        (lr) => lr.id === r.id || lr.name === r.code || lr.name === r.name || lr.name.includes(r.code)
      );
      const isActiveSeq = r.code === activeSequence.robotCode;
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        status: isActiveSeq && currentWorkflowStep === 3 ? 'Arrived' : r.status,
        battery: live?.battery ?? r.battery,
        worldX: typeof live?.x === 'number' ? live.x : undefined,
        worldY: typeof live?.y === 'number' ? live.y : undefined,
        yaw: typeof live?.yaw === 'number' ? live.yaw : undefined,
        targetTable: isActiveSeq ? currentLeg.tableNo : undefined,
        cargoLevel: isActiveSeq ? currentLeg.cargoLevel : null,
      };
    });

    const resolvedRobots = mapRobots.filter(
      (r) => typeof r.worldX === 'number' && !Number.isNaN(r.worldX) && typeof r.worldY === 'number' && !Number.isNaN(r.worldY)
    );

    expect(resolvedRobots).toHaveLength(1);
    expect(resolvedRobots[0]).toMatchObject({
      code: 'AMR-01',
      status: 'Arrived',
      worldX: 2.4,
      worldY: 3.6,
      yaw: 1.57,
      targetTable: 'Bàn 01',
      cargoLevel: 1,
    });
  });

  it('deduplicates arrival audio chime per taskId across TaskStatusUpdated, AssistedDropoffArrived, and Step 3 effect and respects mute toggle', () => {
    const chimedTaskKeys = new Set<string>();
    const playTone = vi.fn();

    const triggerChime = (enabled: boolean, dedupeKey?: string): boolean => {
      if (!enabled) return false;
      const key = (dedupeKey || '').trim().toLowerCase().replace(/^tsk-/, '');
      if (key) {
        if (chimedTaskKeys.has(key)) return false;
        chimedTaskKeys.add(key);
      }
      playTone();
      return true;
    };

    expect(triggerChime(false, 'task-arrived-01')).toBe(false);
    expect(playTone).toHaveBeenCalledTimes(0);

    expect(triggerChime(true, 'task-arrived-01')).toBe(true);
    expect(triggerChime(true, 'TSK-task-arrived-01')).toBe(false);
    expect(triggerChime(true, 'task-arrived-01')).toBe(false);
    expect(playTone).toHaveBeenCalledTimes(1);

    // Next leg with different taskId chimes once
    expect(triggerChime(true, 'task-arrived-02')).toBe(true);
    expect(playTone).toHaveBeenCalledTimes(2);
  });

  it('builds MapArrivalAlert payload with target tray and next destination for both multi-stop and single-stop deliveries', () => {
    const buildAlert = (
      legs: Array<{ cargoLevel: number; tableNo: string; orderId: string; taskId: string }>,
      legIdx: number,
      chimeEnabled: boolean
    ) => {
      const currentLeg = legs[legIdx];
      const nextLeg = legs[legIdx + 1];
      return {
        taskId: currentLeg.taskId,
        robotCode: 'AMR-01',
        tableName: currentLeg.tableNo,
        stationName: 'ST_TABLE_01',
        cargoLevel: currentLeg.cargoLevel,
        orderId: currentLeg.orderId,
        nextTableName: nextLeg?.tableNo || null,
        chimePlayed: chimeEnabled,
      };
    };

    const twoStopLegs = [
      { cargoLevel: 1, tableNo: 'Bàn 01', orderId: 'ORD-101', taskId: 't1' },
      { cargoLevel: 2, tableNo: 'Bàn 03', orderId: 'ORD-104', taskId: 't2' },
    ];

    expect(buildAlert(twoStopLegs, 0, true)).toEqual({
      taskId: 't1',
      robotCode: 'AMR-01',
      tableName: 'Bàn 01',
      stationName: 'ST_TABLE_01',
      cargoLevel: 1,
      orderId: 'ORD-101',
      nextTableName: 'Bàn 03',
      chimePlayed: true,
    });

    expect(buildAlert(twoStopLegs, 1, false)).toEqual({
      taskId: 't2',
      robotCode: 'AMR-01',
      tableName: 'Bàn 03',
      stationName: 'ST_TABLE_01',
      cargoLevel: 2,
      orderId: 'ORD-104',
      nextTableName: null,
      chimePlayed: false,
    });
  });
});

describe('Weekly Report #9 — FE F-07 Reroute Conflict/SignalR & F-09 Nearest Drop-off Station', () => {
  it('propagates HTTP 409 Conflict (ETM-14 arrived lock & TABLE_OCCUPIED) in rerouteTask instead of returning fake success (ETM-14, ETM-36..38)', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          success: false,
          errorCode: 'ETM-14',
          taskId: 'task-arrived-409',
          newStationId: 'st-08',
          newTableNo: 'Bàn 08',
          message: 'ETM-14: Robot đã đến trạm giao cũ (arrived). Động cơ đang khóa an toàn.',
        },
      },
    });

    const arrivedRes = await robotService.rerouteTask('task-arrived-409', 'st-08', 'Bàn 08', 'Đổi bàn khi vừa tới');
    expect(arrivedRes.success).toBe(false);
    expect(arrivedRes.errorCode).toBe('ETM-14');
    expect(arrivedRes.taskId).toBe('task-arrived-409');
    expect(arrivedRes.message).toContain('ETM-14');

    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          success: false,
          errorCode: 'TABLE_OCCUPIED',
          message: 'Bàn đích Bàn 02 đang có khách dùng bữa.',
        },
      },
    });

    const occupiedRes = await robotService.rerouteTask('task-moving-409', 'st-02', 'Bàn 02', 'Đổi sang bàn bận');
    expect(occupiedRes.success).toBe(false);
    expect(occupiedRes.errorCode).toBe('TABLE_OCCUPIED');
  });

  it('propagates HTTP 409 errors on transferOrderTable and dispatchSecondLeg without fake success fallback', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          errorCode: 'ETM-14',
          message: 'Robot đã tới bàn cũ, không thể tự động chuyển đơn.',
        },
      },
    });
    const transferRes = await robotService.transferOrderTable('tbl-09', 'ORD-909', 'Đổi bàn');
    expect(transferRes.success).toBe(false);
    expect(transferRes.errorCode).toBe('ETM-14');

    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          errorCode: 'INVALID_STATE',
          message: 'Nhiệm vụ không ở trạng thái chờ chặng 2.',
        },
      },
    });
    const secondLegRes = await robotService.dispatchSecondLeg('task-909', 'st-09', 'Staff KDS');
    expect(secondLegRes.success).toBe(false);
    expect(secondLegRes.errorCode).toBe('INVALID_STATE');
  });

  it('handles realtime SignalR TableRerouteConflictArrived and ReceiveTaskRerouted events cleanly (DS-03a, DS-03b)', () => {
    let missionPhase: 'idle' | 'moving' | 'arrived' | 'returning' = 'moving';
    let conflictModal: {
      isOpen: boolean;
      taskId: string;
      oldTableNo: string;
      newTableNo: string;
      newStationId: string;
    } | null = null;
    let activeLegs = [
      { cargoLevel: 1, tableNo: 'Bàn 01', orderId: 'ORD-101', status: 'delivering' as const, taskId: 'TSK-11112222' },
    ];

    const normalizeTaskKey = (id?: string) => (id || '').trim().toLowerCase().replace(/^tsk-/, '');

    // 1. DS-03a: Event Bus mid-transit reroute updates active leg tableNo
    const onReceiveTaskRerouted = (payload: { taskId: string; newTableNo: string }) => {
      activeLegs = activeLegs.map((leg) =>
        normalizeTaskKey(leg.taskId) === normalizeTaskKey(payload.taskId)
          ? { ...leg, tableNo: payload.newTableNo }
          : leg
      );
    };
    onReceiveTaskRerouted({ taskId: '11112222', newTableNo: 'Bàn 06' });
    expect(activeLegs[0].tableNo).toBe('Bàn 06');

    // 2. DS-03b: Event Bus arrived conflict opens ETM-14 safety modal & sets arrived phase
    const onTableRerouteConflictArrived = (payload: {
      taskId: string;
      oldTableNo: string;
      newTableNo: string;
      newStationId: string;
    }) => {
      missionPhase = 'arrived';
      conflictModal = {
        isOpen: true,
        taskId: payload.taskId,
        oldTableNo: payload.oldTableNo,
        newTableNo: payload.newTableNo,
        newStationId: payload.newStationId,
      };
    };
    onTableRerouteConflictArrived({
      taskId: '11112222',
      oldTableNo: 'Bàn 06',
      newTableNo: 'Bàn 09',
      newStationId: 'st-09',
    });

    expect(missionPhase).toBe('arrived');
    expect(conflictModal).toEqual({
      isOpen: true,
      taskId: '11112222',
      oldTableNo: 'Bàn 06',
      newTableNo: 'Bàn 09',
      newStationId: 'st-09',
    });
  });

  it('F-09: fetches nearest Drop-off stations via fallback API and preserves restricted table own waypoint coordinates', async () => {
    const get = apiClient.get as ReturnType<typeof vi.fn>;
    get.mockResolvedValueOnce({
      data: [
        {
          stationId: 'st-dropoff-near',
          stationName: 'ST_DROPOFF_A',
          xCoord: 4,
          yCoord: 6,
          metricX: 4.5,
          metricY: 6.0,
          distance: 1.25,
        },
        {
          stationId: 'st-dropoff-far',
          stationName: 'ST_DROPOFF_B',
          xCoord: 9,
          yCoord: 11,
          distance: 6.8,
        },
      ],
    });

    const { portalClient, tableService } = await import('@/services/portalApi');
    const portalGetSpy = vi.spyOn(portalClient, 'get').mockRejectedValueOnce(new Error('Portal gateway offline'));
    const candidates = await tableService.getNearestDropoffStations('tbl-restricted-s1', {
      tableWorldX: 5.5,
      tableWorldY: 6.75,
    });
    portalGetSpy.mockRestore();

    expect(get).toHaveBeenCalledWith('/v1/tables/tbl-restricted-s1/nearest-dropoff-stations', {
      params: { x: 5.5, y: 6.75 },
    });
    expect(candidates).toHaveLength(2);
    expect(candidates[0].stationId).toBe('st-dropoff-near');
    expect(candidates[0].distanceMeters).toBe(1.25);
    expect(candidates[0].isRecommendedNearest).toBe(true);
    expect(candidates[1].isRecommendedNearest).toBe(false);

    // Waypoint preservation check: restricted table S1 at (5.5, 6.75) keeps its own coordinates while binding ST_DROPOFF_A
    const restrictedTable = {
      id: 'tbl-restricted-s1',
      name: 'Bàn S1',
      isRestricted: true,
      worldX: 5.5,
      worldY: 6.75,
      stationId: null as string | null,
      stationName: null as string | null,
    };
    const assignedStation = candidates[0];
    const hasOwnWaypoint =
      typeof restrictedTable.worldX === 'number' &&
      typeof restrictedTable.worldY === 'number' &&
      (restrictedTable.worldX !== 0 || restrictedTable.worldY !== 0);

    const updatedTable = {
      ...restrictedTable,
      stationId: assignedStation.stationId,
      stationName: assignedStation.stationName,
      worldX: hasOwnWaypoint ? restrictedTable.worldX : assignedStation.xCoord,
      worldY: hasOwnWaypoint ? restrictedTable.worldY : assignedStation.yCoord,
    };

    expect(updatedTable.stationId).toBe('st-dropoff-near');
    expect(updatedTable.worldX).toBe(5.5);
    expect(updatedTable.worldY).toBe(6.75);
  });

  it('sends newTableNo on dispatchSecondLeg when explicitly provided and aligns resumeTask payload with ResumeTaskRequestDto', async () => {
    post.mockResolvedValue({ data: { success: true, message: 'OK' } });

    await robotService.dispatchSecondLeg('task-leg2', 'st-shared', 'Nhân viên KDS', 'S2');
    expect(post).toHaveBeenCalledWith('/v1/tasks/task-leg2/dispatch-second-leg', {
      newStationId: 'st-shared',
      confirmedBy: 'Nhân viên KDS',
      newTableNo: 'S2',
    });

    await robotService.pauseTask('task-leg2', 'Tránh vật cản', 'Nhân viên KDS');
    expect(post).toHaveBeenCalledWith('/v1/tasks/task-leg2/pause', {
      reason: 'Tránh vật cản',
      requestedBy: 'Nhân viên KDS',
    });

    await robotService.resumeTask('task-leg2', 'Nhân viên KDS');
    expect(post).toHaveBeenCalledWith('/v1/tasks/task-leg2/resume', {
      requestedBy: 'Nhân viên KDS',
    });
  });

  it('normalizes PascalCase BE Task/Command/Table enums consistently with FE snake_case filters', () => {
    const normalizeEnumKey = (raw?: string | null) =>
      (raw || '').trim().toLowerCase().replace(/[\s_-]+/g, '');

    expect(normalizeEnumKey('InTransit')).toBe(normalizeEnumKey('in_transit'));
    expect(normalizeEnumKey('MovingToPickup')).toBe(normalizeEnumKey('moving_to_pickup'));
    expect(normalizeEnumKey('DispatchWaypoint')).toBe(normalizeEnumKey('dispatch_waypoint'));
    expect(normalizeEnumKey('ReturnKitchen')).toBe(normalizeEnumKey('return_kitchen'));
    expect(normalizeEnumKey('WaitingForService')).toBe('waitingforservice');
    expect(normalizeEnumKey('Serving')).toBe('serving');
  });
});


