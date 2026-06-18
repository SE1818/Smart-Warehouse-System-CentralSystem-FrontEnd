import { useState, useEffect, useCallback } from 'react';
import type { FileListResponse } from '@/types/file';
import { FileSubFolder } from '@/types/file';
import { fileService } from '@/services/file';
import { Icons } from '@/components/Icons';

const SUB_FOLDERS = [
  { key: FileSubFolder.Products, label: 'Sản phẩm', icon: 'Product' as const },
  { key: FileSubFolder.Receipts, label: 'Hóa đơn', icon: 'CartOrder' as const },
  { key: FileSubFolder.Avatars, label: 'Avatar', icon: 'Profile' as const },
  { key: FileSubFolder.Root, label: 'Tất cả', icon: 'Folder' as const },
];

export function FileManagementPage() {
  const [activeTab, setActiveTab] = useState<FileSubFolder>(FileSubFolder.Root);
  const [files, setFiles] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFiles();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFiles]);

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
    } catch (err) {
      console.error('Error uploading file:', err);
      const axiosError = err as { response?: { data?: string } };
      setUploadError(axiosError.response?.data || 'Lỗi khi upload file.');
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Glow Backdrops */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Icons.Folder className="w-8 h-8 text-brand-600 glow-blue" />
          <span>Quản lý File</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload, quản lý và xem file trong hệ thống
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 flex flex-wrap gap-2 shadow-sm">
        {SUB_FOLDERS.map((tab) => {
          const TabIconComponent = Icons[tab.icon];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-bold transition-all duration-205 flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TabIconComponent className={`w-5 h-5 ${activeTab === tab.key ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm hover:border-slate-300 transition-all duration-300">
        <h2 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
          <Icons.Plus className="w-5 h-5 text-brand-600" />
          <span>Upload File mới</span>
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <label htmlFor="file-upload" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl hover:border-brand-500/50 hover:bg-white transition-all group">
              <Icons.Folder className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0" />
              <span className="text-sm text-slate-500 group-hover:text-slate-800 transition-colors truncate font-semibold">
                {selectedFile ? selectedFile.name : 'Chọn file từ thiết bị...'}
              </span>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </label>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                <span>Đang tải lên...</span>
              </>
            ) : (
              <span>Upload</span>
            )}
          </button>
        </div>
        
        {selectedFile && (
          <p className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg inline-block border border-slate-200 font-semibold">
            Dung lượng file: <span className="font-bold text-slate-800">{(selectedFile.size / 1024).toFixed(2)} KB</span>
          </p>
        )}

        {uploadError && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Global Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-semibold">Đang tải danh sách file...</p>
        </div>
      ) : files && files.count === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
          <Icons.Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-450 italic text-sm">Thư mục hiện tại đang trống</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/85">
                <tr className="text-slate-500 font-bold">
                  <th className="px-6 py-4 text-left">Tên file</th>
                  <th className="px-6 py-4 text-left">URL liên kết</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-semibold">
                {files?.files.map((file) => (
                  <tr key={file.fileName} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {file.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700 transition-colors hover:underline truncate block max-w-sm"
                      >
                        {file.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-4">
                      <button
                        onClick={() => handleDownload(file.fileName)}
                        className="text-brand-600 hover:text-brand-700 transition-colors font-bold cursor-pointer"
                      >
                        Tải xuống
                      </button>
                      <button
                        onClick={() => handleDelete(file.fileName)}
                        className="text-red-600 hover:text-red-750 transition-colors font-bold cursor-pointer"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
