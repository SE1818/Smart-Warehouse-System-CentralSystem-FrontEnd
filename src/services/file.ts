import apiClient from './api';
import type { UploadResponse, FileListResponse } from '@/types/file';
import { FileSubFolder } from '@/types/file';

export const fileService = {
  async uploadFile(file: File, subFolder: FileSubFolder = FileSubFolder.Root): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (subFolder !== FileSubFolder.Root) {
      formData.append('subFolder', subFolder);
    }

    const response = await apiClient.post<UploadResponse>('/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadProductImage(file: File): Promise<UploadResponse> {
    return this.uploadFile(file, FileSubFolder.Products);
  },

  async uploadReceipt(file: File): Promise<UploadResponse> {
    return this.uploadFile(file, FileSubFolder.Receipts);
  },

  async uploadAvatar(file: File): Promise<UploadResponse> {
    return this.uploadFile(file, FileSubFolder.Avatars);
  },

  async listFiles(subFolder?: FileSubFolder): Promise<FileListResponse> {
    const params = subFolder !== undefined && subFolder !== FileSubFolder.Root
      ? { subFolder }
      : undefined;
    const response = await apiClient.get<FileListResponse>('/v1/files', { params });
    return response.data;
  },

  async deleteFile(url: string): Promise<void> {
    await apiClient.delete('/v1/files', {
      data: { url },
    });
  },

  async downloadFile(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return response.blob();
  },
};
