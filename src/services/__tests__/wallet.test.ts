import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();
  return { __esModule: true, default: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete } };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => { vi.clearAllMocks(); });

import { walletService } from '@/services/wallet';
describe('walletService', () => {
  it('getMyWallet', async () => { get.mockResolvedValue({ data: { id: 'w1' } }); await walletService.getMyWallet(); expect(get).toHaveBeenCalledWith('/system/wallets/me'); });
  it('getTransactions', async () => { get.mockResolvedValue({ data: [] }); await walletService.getTransactions(); expect(get).toHaveBeenCalledWith('/system/transactions'); });
  it('deposit', async () => { post.mockResolvedValue({ data: { balance: 500 } }); await walletService.deposit(100); expect(post).toHaveBeenCalledWith('/system/deposit', 100); });
});
