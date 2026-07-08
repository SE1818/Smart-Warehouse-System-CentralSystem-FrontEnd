import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { walletService } from '@/services/wallet';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('walletService', () => {
  it('getBalance', async () => {
    get.mockResolvedValue({ data: { userId: 'u1', balance: 1000 } });
    const res = await walletService.getBalance('u1');
    expect(res.balance).toBe(1000);
  });

  it('getTransactions', async () => {
    get.mockResolvedValue({ data: [{ id: 't1', type: 'DEPOSIT', amount: 100 }] });
    const res = await walletService.getTransactions('u1');
    expect(res[0].type).toBe('DEPOSIT');
  });

  it('topUp', async () => {
    post.mockResolvedValue({ data: { userId: 'u1', balance: 1500 } });
    const res = await walletService.topUp({ userId: 'u1', amount: 500 });
    expect(res.balance).toBe(1500);
  });
});
