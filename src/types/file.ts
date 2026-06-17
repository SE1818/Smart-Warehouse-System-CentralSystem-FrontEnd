// File Service types
export interface UploadResponse {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
}

export interface FileInfo {
  fileName: string;
  url: string;
}

export interface FileListResponse {
  subFolder: string;
  count: number;
  files: FileInfo[];
}

export const FileSubFolder = {
  Products: 'products',
  Receipts: 'receipts',
  Avatars: 'avatars',
  Root: '',
} as const;

export type FileSubFolder = typeof FileSubFolder[keyof typeof FileSubFolder];
