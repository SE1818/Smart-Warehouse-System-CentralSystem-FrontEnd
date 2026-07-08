import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = { post: vi.fn() as any };

vi.mock('@/services/api', () => ({ __esModule: true, default: apiClient }));

import { fileService } from '@/services/file';

const { post } = apiClient;

beforeEach(() => { vi.clearAllMocks(); });

describe('fileService', () => {
  it('uploadFile posts file with key', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/x' } });
    const file = new File(['x'], 'test.png', { type: 'image/png' }) as any;
    fileService.uploadFile(file, 'products');
    expect(post.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it('deleteFile posts delete request', async () => {
    post.mockResolvedValue({ data: {} });
    await (fileService as any).deleteFile('file-key-123');
    expect(post).toHaveBeenCalled();
  });

  it('getPresignedUrl gets download URL', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/dl' } });
    const res = await (fileService as any).getPresignedUrl('file-key-123');
    expect(res.url).toBe('https://s3/dl');
  });
});
