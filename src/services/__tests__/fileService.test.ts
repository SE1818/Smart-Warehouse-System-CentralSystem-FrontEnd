import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { fileService } from '@/services/file';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('fileService', () => {
  it('uploadFile with default subFolder returns url', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/x' } });
    const file = new File(['x'], 't.png', { type: 'image/png' });
    const res = await fileService.uploadFile(file);
    expect(res.url).toBe('https://s3/x');
  });
  it('uploadProductImage returns url', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/prod' } });
    const res = await fileService.uploadProductImage(new File(['x'], 'p.png', { type: 'image/png' }));
    expect(res.url).toBe('https://s3/prod');
  });
  it('uploadReceipt returns url', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/rec' } });
    const res = await fileService.uploadReceipt(new File(['r'], 'rec.pdf', { type: 'application/pdf' }));
    expect(res.url).toBe('https://s3/rec');
  });
  it('uploadAvatar returns url', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/av' } });
    const res = await fileService.uploadAvatar(new File(['a'], 'av.png', { type: 'image/png' }));
    expect(res.url).toBe('https://s3/av');
  });
  it('listFiles returns array', async () => {
    get.mockResolvedValue({ data: [] });
    await fileService.listFiles();
    expect(get).toHaveBeenCalled();
  });
  it('deleteFile uses delete with body', async () => {
    del.mockResolvedValue({ data: {} });
    await fileService.deleteFile('https://s3/key');
    expect(del).toHaveBeenCalled();
  });
});
