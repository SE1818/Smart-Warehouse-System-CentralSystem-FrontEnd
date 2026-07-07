// The File Service returns PascalCase JSON keys (Url, FileName, Size, Version, Sha256Hash)
// We normalize to camelCase here for consistent frontend usage.
export interface UploadResponse {
  url: string;
  fileName: string;
  originalName: string;
  size: number;
  version: number;
  sha256Hash: string;
  metadataId?: string;
  /** @deprecated Not returned by the File Service API */
  fileId?: string;
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
