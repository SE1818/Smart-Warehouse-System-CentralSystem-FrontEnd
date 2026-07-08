(() => {
	'use strict';
	const fs = require('fs');
	const path = require('path');

	const dir = 'src/services/__tests__';

	const filesToFix = {
		'transferService.test.ts': {
			header: `import { describe, it, expect, vi, beforeEach } from 'vitest';

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
`,
			content: `
describe('transferService', () => {
  it('listTransfers', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 't1', fromStationId: 's1', toStationId: 's2', priority: 1, status: 'PENDING', createdAt: '' }] });
    const res = await transferService.listTransfers();
    expect(mockGet).toHaveBeenCalledWith('/v1/tasks');
    expect(res[0].id).toBe('t1');
  });
  it('getTransferStats', async () => {
    mockGet.mockResolvedValue({ data: { totalToday: 10, active: 3, completed: 5, failed: 1, cancelled: 1, avgDurationMinutes: 15, byRobot: {} } });
    const res = await transferService.getTransferStats();
    expect(mockGet).toHaveBeenCalledWith('/v1/tasks/stats');
    expect(res.totalToday).toBe(10);
  });
  it('getActiveTransfers', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await transferService.getActiveTransfers();
    expect(mockGet).toHaveBeenCalledWith('/v1/tasks/active');
  });
  it('getTransferHistory', async () => {
    mockGet.mockResolvedValue({ data: { transferRequestId: 'r1', statusHistory: [], commands: [], responses: [], transferLog: null } });
    const res = await transferService.getTransferHistory('r1');
    expect(mockGet).toHaveBeenCalledWith('/v1/tasks/r1/history');
  });
  it('cancelTransfer', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await transferService.cancelTransfer('t1');
    expect(mockDelete).toHaveBeenCalledWith('/v1/tasks/t1/cancel');
  });
  it('getCommandLog', async () => {
    mockGet.mockResolvedValue({ data: { id: 'c1', commandId: 'k1', executionResult: 'ok' } });
    await transferService.getCommandLog('c1');
    expect(mockGet).toHaveBeenCalledWith('/v1/tasks/commands/c1/log');
  });
});
`
		},
		'robotMonitor.test.ts': {
			header: `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('@/services/api', () => ({ __esModule: true, default: { get: mockGet, put: mockPut } }));

import apiClient from '@/services/api';
import { robotMonitorService } from '@/services/robotMonitorService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });
`,
			content: `
describe('robotMonitorService', () => {
  it('getAllRobots', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'r1', name: 'Bot1', status: 'IDLE', battery: 90, x: 0, y: 0 }] });
    const res = await robotMonitorService.getAllRobots();
    expect(res[0].id).toBe('r1');
  });
  it('getRobotStatus', async () => {
    mockGet.mockResolvedValue({ data: { id: 'r1', status: 'MOVING', currentTaskId: 't1' } });
    const res = await robotMonitorService.getRobotStatus('r1');
    expect(res.status).toBe('MOVING');
  });
  it('updateRobotStatus', async () => {
    mockPut.mockResolvedValue({ data: {} });
    await robotMonitorService.updateRobotStatus('r1', 'IDLE');
    expect(mockPut).toHaveBeenCalledWith('/v1/robots/r1/status', { status: 'IDLE' });
  });
  it('getTaskLogs', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'l1', robotId: 'r1', action: 'move' }] });
    const res = await robotMonitorService.getTaskLogs('t1');
    expect(res.length).toBe(1);
  });
  it('reactivateRobot', async () => {
    mockPut.mockResolvedValue({ data: { id: 'r1', status: 'IDLE' } });
    const res = await robotMonitorService.reactivateRobot('r1');
    expect(mockPut).toHaveBeenCalledWith('/v1/robots/r1/reactivate');
  });
});
`
		},
		'stockMore.test.ts': {
			header: `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/api', () => ({ __esModule: true, default: { get: mockGet, post: mockPost } }));

import apiClient from '@/services/api';
import { stockService } from '@/services/stock';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });
`,
			content: `
describe('stockService', () => {
  it('getAllStocks', async () => {
    mockGet.mockResolvedValue({ data: [{ productId: 'p1', warehouseId: 'w1', quantity: 100 }] });
    const res = await stockService.getAllStocks();
    expect(res[0].productId).toBe('p1');
  });
  it('getWarehouseStock', async () => {
    mockGet.mockResolvedValue({ data: [{ productId: 'p1', quantity: 50 }] });
    await stockService.getWarehouseStock('w1');
    expect(mockGet).toHaveBeenCalledWith('/v1/stock/warehouses/w1');
  });
  it('getStockMovements', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await stockService.getStockMovements('p1');
    expect(mockGet).toHaveBeenCalledWith('/v1/stock/products/p1/movements');
  });
  it('getStockAlerts', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'a1', message: 'low stock' }] });
    const res = await stockService.getStockAlerts();
    expect(res[0].message).toBe('low stock');
  });
});
`
		},
		'userService.test.ts': {
			header: `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/api', () => ({ __esModule: true, default: { get: mockGet, put: mockPut, delete: mockDelete } }));

import apiClient from '@/services/api';
import { userService } from '@/services/userService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });
`,
			content: `
describe('userService', () => {
  it('getUsers', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'u1', name: 'A', email: 'a@b.com' }] });
    const res = await userService.getUsers();
    expect(res[0].name).toBe('A');
  });
  it('getUserDetail', async () => {
    mockGet.mockResolvedValue({ data: { id: 'u1', name: 'B' } });
    const res = await userService.getUserDetail('u1');
    expect(res.name).toBe('B');
  });
  it('updateUser', async () => {
    mockPut.mockResolvedValue({ data: { id: 'u1', name: 'Updated' } });
    const res = await userService.updateUser('u1', { name: 'Updated', role: 'STAFF' });
    expect(res.name).toBe('Updated');
  });
  it('deleteUser', async () => {
    mockDelete.mockResolvedValue({ data: {} });
    await userService.deleteUser('u1');
    expect(mockDelete).toHaveBeenCalled();
  });
  it('assignRole', async () => {
    mockPost.mockResolvedValue({ data: { id: 'u1', role: 'STAFF' } });
    await userService.assignRole('u1', 'STAFF');
    expect(mockPost).toHaveBeenCalledWith('/admin/users/u1/role', { role: 'STAFF' });
  });
});
`
		},
	};

	Object.entries(filesToFix).forEach(([filename, { header, content }]) => {
		const filepath = path.join(dir, filename);
		fs.writeFileSync(filepath, header + '\n' + content);
		console.log('✓', filename);
	});
	console.log('Done fixing 4 files');
})();
