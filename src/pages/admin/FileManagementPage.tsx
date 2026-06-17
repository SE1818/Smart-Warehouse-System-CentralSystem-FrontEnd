import { useState, useEffect } from 'react';
import type { FileListResponse } from '@/types/file';
import { FileSubFolder } from '@/types/file';
import { fileService } from '@/services/file';

const SUB_FOLDERS: { key: FileSubFolder; label: string; icon: string }[] = [
  { key: FileSubFolder.Products, label: 'Sản phẩm', icon: '📦' },
  { key: FileSubFolder.Receipts, label: 'Hóa đơn', icon: '🧾' },
  { key: FileSubFolder.Avatars, label: 'Avatar', icon: '👤' },
  { key: FileSubFolder.Root, label: 'Tất cả', icon: '📁' },
];

export function FileManagementPage() {
  const [activeTab, setActiveTab] = useState<FileSubFolder>(FileSubFolder.Root);
  const [files, setFiles] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [activeTab]);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fileService.listFiles(activeTab === FileSubFolder.Root ? undefined : activeTab);
      setFiles(data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Không thể tải danh sách file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Vui lòng chọn file để upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      let result;
      switch (activeTab) {
        case FileSubFolder.Products:
          result = await fileService.uploadProductImage(selectedFile);
          break;
        case FileSubFolder.Receipts:
          result = await fileService.uploadReceipt(selectedFile);
          break;
        case FileSubFolder.Avatars:
          result = await fileService.uploadAvatar(selectedFile);
          break;
        default:
          result = await fileService.uploadFile(selectedFile);
          break;
      }
      alert(`Upload thành công: ${result.fileName}`);
      setSelectedFile(null);
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
      await fetchFiles();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setUploadError(err.response?.data || 'Lỗi khi upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const blob = await fileService.downloadFile(fileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Không thể tải file.');
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Xóa file ${fileName}?`)) return;

    try {
      await fileService.deleteFile(fileName);
      alert('Xóa file thành công');
      await fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Không thể xóa file.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📁</span> Quản lý File
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload, quản lý và xem file trong hệ thống
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-2 flex gap-2">
        {SUB_FOLDERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Upload File</h2>
        <div className="flex items-center gap-4">
          <input
            id="file-upload"
            type="file"
            onChange={handleFileSelect}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all active:scale-98 shadow-md shadow-brand-500/10"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang upload...
              </span>
            ) : (
              'Upload'
            )}
          </button>
        </div>
        {selectedFile && (
          <p className="text-sm text-slate-600">
            Đã chọn: <span className="font-semibold">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
            ⚠️ {uploadError}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* File List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải file...</p>
        </div>
      ) : files && files.count === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <p className="text-slate-400 italic">Không có file nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Tên file
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {files?.files.map((file) => (
                <tr key={file.fileName} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {file.fileName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 hover:underline truncate block max-w-xs"
                    >
                      {file.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDownload(file.fileName)}
                      className="text-brand-600 hover:text-brand-700 mr-4"
                    >
                      Tải xuống
                    </button>
                    <button
                      onClick={() => handleDelete(file.fileName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
