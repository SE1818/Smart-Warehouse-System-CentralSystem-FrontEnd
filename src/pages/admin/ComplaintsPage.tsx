import { useState, useEffect } from 'react';
import { complaintService } from '@/services/complaintService';
import type { Complaint } from '@/services/complaintService';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

export function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [response, setResponse] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await complaintService.getAllComplaints();
      setComplaints(data);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Không thể kết nối đến máy chủ để tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !response.trim()) return;

    setSubmittingResponse(true);
    try {
      const updated = await complaintService.respondToComplaint(selectedComplaint.id, response);
      toast.success('Gửi phản hồi khiếu nại thành công!');
      setResponse('');
      setSelectedComplaint(updated);
      // Refresh list
      setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Error sending response:', err);
      toast.error('Lỗi khi gửi phản hồi khiếu nại.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const filtered = complaints.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.userEmail.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isImageUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif') || lower.includes('image');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.AlertWarning className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Quản lý khiếu nại & Hỗ trợ</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem và xử lý các khiếu nại, phản hồi kèm tệp đính kèm từ người dùng qua ứng dụng di động
          </p>
        </div>
        <button
          onClick={fetchComplaints}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Icons.Refresh className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, nội dung, email khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-semibold"
          />
          <Icons.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex gap-2">
          {(['All', 'Pending', 'Resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-55'
              }`}
            >
              {status === 'All' ? 'Tất cả' : status === 'Pending' ? 'Đang chờ' : 'Đã xử lý'}
            </button>
          ))}
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout: List + Detail Pane */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải danh sách khiếu nại...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* List panel */}
          <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
                <span className="text-4xl block mb-2">📋</span>
                <p className="text-sm font-bold">Không tìm thấy khiếu nại nào</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedComplaint?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedComplaint(item);
                      setResponse('');
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-brand-50/40 border-brand-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Status accent indicator */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1 ${
                        item.status === 'Resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    
                    <div className="flex justify-between items-start gap-2 pl-2">
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                          {item.userEmail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                        }`}
                      >
                        {item.status === 'Resolved' ? 'Đã xử lý' : 'Đang chờ'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-medium pl-2">
                      {item.content}
                    </p>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold pl-2">
                      <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                      {item.attachmentUrl && (
                        <span className="flex items-center gap-1 text-brand-600">
                          📎 Có đính kèm
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Details panel */}
          <div className="lg:col-span-3">
            {selectedComplaint ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6 animate-fade-in">
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mb-2 ${
                        selectedComplaint.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {selectedComplaint.status === 'Resolved' ? 'Trạng thái: Đã giải quyết' : 'Trạng thái: Đang chờ xử lý'}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                      {selectedComplaint.title}
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Gửi bởi: <span className="text-slate-650 font-bold">{selectedComplaint.userEmail}</span> | Ngày tạo: {new Date(selectedComplaint.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nội dung khiếu nại</h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                    {selectedComplaint.content}
                  </div>
                </div>

                {/* Attachment */}
                {selectedComplaint.attachmentUrl && (
                  <div className="space-y-2">
                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tệp đính kèm</h4>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600 truncate max-w-md">
                          📎 {selectedComplaint.attachmentUrl.split('/').pop() || 'file_attachment'}
                        </span>
                        <a
                          href={selectedComplaint.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-brand-650 rounded-lg font-bold shadow-xs hover:border-slate-300 transition-colors"
                        >
                          Tải xuống / Mở tệp
                        </a>
                      </div>

                      {/* Image Preview */}
                      {isImageUrl(selectedComplaint.attachmentUrl) && (
                        <div className="mt-1 rounded-lg overflow-hidden border border-slate-200 bg-white max-h-64 flex justify-center items-center">
                          <img
                            src={selectedComplaint.attachmentUrl}
                            alt="Attachment Preview"
                            className="max-h-64 object-contain"
                            onError={(e) => {
                              // If image fails to load, e.g. due to localhost resolving inside docker vs host, hide preview
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin response log */}
                {selectedComplaint.status === 'Resolved' && (
                  <div className="p-4 bg-emerald-50/55 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase tracking-wider">
                      <Icons.SuccessCheck className="w-4 h-4 text-emerald-600" />
                      <span>Phản hồi từ Admin</span>
                    </div>
                    <div className="text-sm text-slate-700 font-semibold leading-relaxed">
                      {selectedComplaint.adminResponse}
                    </div>
                    <div className="text-[10px] text-emerald-650 font-medium">
                      Thời gian phản hồi: {selectedComplaint.resolvedAt ? new Date(selectedComplaint.resolvedAt).toLocaleString('vi-VN') : ''}
                    </div>
                  </div>
                )}

                {/* Response Form */}
                {selectedComplaint.status === 'Pending' && (
                  <form onSubmit={handleRespond} className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                        Nhập phản hồi cho khách hàng
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Nhập nội dung giải quyết khiếu nại, hướng xử lý..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        required
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-semibold"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingResponse || !response.trim()}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-brand-500/10 disabled:shadow-none flex items-center gap-2 cursor-pointer"
                      >
                        {submittingResponse ? (
                          <>
                            <Icons.Spinner className="w-3.5 h-3.5 text-white" />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          <span>Gửi phản hồi & Đóng khiếu nại</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 flex flex-col items-center justify-center h-full min-h-[300px]">
                <span className="text-5xl mb-3">👈</span>
                <h3 className="font-bold text-slate-700 text-base">Chọn một khiếu nại</h3>
                <p className="text-xs text-slate-450 mt-1">Chọn khiếu nại từ danh sách bên trái để xem chi tiết và phản hồi</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
