import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { storeService } from '@/services/storeService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('storeService', () => {
  it('registerStore', async () => {
    post.mockResolvedValue({ data: { message: 'Registered' } });
    const res = await storeService.registerStore({ storeName: 'S', ownerName: 'O', ownerEmail: 'e@t.com', phoneNumber: '09', areaId: 'a1', areaName: 'A', stationId: 's1', stationName: 'S1' });
    expect(res.message).toBe('Registered');
  });

  it('listPendingRegistrations', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.listPendingRegistrations();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/pending');
  });

  it('getAllRegistrations no filter', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: {} });
  });

  it('getAllRegistrations with status', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations('Pending');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: { status: 'Pending' } });
  });

  it('getMyRegistrationStatus', async () => {
    get.mockResolvedValue({ data: { id: 'r1', storeName: 'MyStore', status: 'Pending' } });
    const res = await storeService.getMyRegistrationStatus('e@t.com');
    expect(res.storeName).toBe('MyStore');
  });

  it('getAllStores', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllStores();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/stores');
  });

  it('getStoreById', async () => {
    get.mockResolvedValue({ data: { id: 's1', name: 'Store1' } });
    const res = await storeService.getStoreById('s1');
    expect(res.name).toBe('Store1');
  });

  it('approveRegistration', async () => {
    post.mockResolvedValue({ data: { message: 'Approved' } });
    const res = await storeService.approveRegistration('r1');
    expect(res.message).toBe('Approved');
  });

  it('rejectRegistration', async () => {
    post.mockResolvedValue({ data: { message: 'Rejected' } });
    const res = await storeService.rejectRegistration('r1', 'Bad info');
    expect(res.message).toBe('Rejected');
  });
});
