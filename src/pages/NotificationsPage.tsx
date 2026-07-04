import { useState, useEffect, useCallback } from 'react';
import type { NotificationDto, NotificationType } from '@/types/notification';
import { notificationService } from '@/services/notification';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';

export function NotificationsPage() {
  useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for sending new notification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channelType, setChannelType] = useState<NotificationType>('InApp');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Fetch all system notifications (Admin View)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getAllNotifications(1, 100);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching all notifications:', err);
      setError('Không thể tải lịch sử thông báo hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle send notification submit
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    // Basic Validation
    if (!title.trim() || !message.trim()) {
      setSendError('Vui lòng điền đầy đủ tiêu đề và nội dung.');
      setSending(false);
      return;
    }

    if (targetType === 'specific' && !targetUserId.trim()) {
      setSendError('Vui lòng nhập ID người dùng nhận thông báo.');
      setSending(false);
      return;
    }

    try {
      await notificationService.sendNotification({
        userId: targetType === 'specific' ? targetUserId.trim() : undefined,
        title: title.trim(),
        message: message.trim(),
        type: channelType,
      });

      setSendSuccess('Gửi thông báo thành công!');
      // Reset form
      setTitle('');
      setMessage('');
      setTargetUserId('');
      // Refresh list
      fetchNotifications();
      // Auto close modal after 1.5s
      setTimeout(() => {
        setIsModalOpen(false);
        setSendSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error sending notification:', err);
      setSendError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi thông báo.');
    } finally {
      setSending(false);
    }
  };

  // Get statistics
  const stats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.status === 'Sent').length,
    failed: notifications.filter((n) => n.status === 'Failed').length,
    inApp: notifications.filter((n) => n.type === 'InApp').length,
    email: notifications.filter((n) => n.type === 'Email').length,
    push: notifications.filter((n) => n.type === 'Push').length,
    sms: notifications.filter((n) => n.type === 'SMS').length,
  };

  const getChannelBadge = (type: string) => {
    switch (type) {
      case 'Email':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SMS':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Push':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-55 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Bell className="w-8 h-8 text-brand-600" />
            <span>Quản lý Thông báo</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gửi và quản lý lịch sử thông báo hệ thống gửi đến người dùng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Icons.Refresh className={`w-4 h-4 text-slate-550 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Gửi thông báo mới</span>
          </button>
        </div>
      </div>

      {/* Stats Bento Box */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng thông báo</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total}</h3>
          </div>
          <div className="p-3 bg-brand-55 rounded-xl">
            <Icons.Bell className="w-6 h-6 text-brand-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đã gửi thành công</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.sent}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Icons.Check className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gửi thất bại</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.failed}</h3>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <Icons.AlertWarning className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">Trong ứng dụng (In-App)</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{stats.inApp}</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Icons.Inbox className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
          <Icons.AlertWarning className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">Đang tải lịch sử thông báo hệ thống...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm">
          <Icons.Search className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-semibold text-sm text-slate-400">Không có thông báo nào được lưu trữ</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Người nhận</th>
                  <th className="py-4 px-6">Tiêu đề / Nội dung</th>
                  <th className="py-4 px-6">Kênh gửi</th>
                  <th className="py-4 px-6">Trạng thái</th>
                  <th className="py-4 px-6">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 align-top">
                      {notification.userId ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-xs">Người dùng cụ thể</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">{notification.userId}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
                          Tất cả (Broadcast)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-top max-w-md">
                      <div className="font-bold text-slate-800 text-xs">{notification.title}</div>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed break-words">{notification.message}</p>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getChannelBadge(notification.type)}`}>
                        {notification.type === 'InApp' ? 'In-App' : notification.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(notification.status)}`}>
                        {notification.status === 'Sent' ? 'Đã gửi' : notification.status === 'Failed' ? 'Thất bại' : 'Đang xử lý'}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top text-xs text-slate-400 font-medium whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Over Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-transform duration-300 ease-in-out">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-slate-200">
                  {/* Form Header */}
                  <div className="bg-slate-55 px-6 py-6 border-b border-slate-150 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900" id="slide-over-title">Gửi thông báo mới</h2>
                      <p className="mt-1 text-xs text-slate-500">Soạn thảo và gửi thông báo trực tiếp đến người dùng</p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-655 transition-all cursor-pointer"
                    >
                      <Icons.Close className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleSendNotification} className="flex-1 px-6 py-6 space-y-6">
                    {sendSuccess && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
                        <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{sendSuccess}</span>
                      </div>
                    )}

                    {sendError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
                        <Icons.AlertWarning className="w-4 h-4 text-rose-650 shrink-0" />
                        <span>{sendError}</span>
                      </div>
                    )}

                    {/* Target Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-605 uppercase tracking-wider">Đối tượng nhận</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTargetType('all')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            targetType === 'all'
                              ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <span className="block font-bold text-xs">Gửi hàng loạt</span>
                          <span className="block text-[10px] opacity-70 mt-0.5">Tất cả người dùng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetType('specific')}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            targetType === 'specific'
                              ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <span className="block font-bold text-xs">Gửi cá nhân</span>
                          <span className="block text-[10px] opacity-70 mt-0.5">Người dùng chỉ định</span>
                        </button>
                      </div>
                    </div>

                    {/* Specific User ID Input */}
                    {targetType === 'specific' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-600">ID người nhận (UUID)</label>
                        <input
                          type="text"
                          required
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          placeholder="e.g. 4bad629d-c1cd-485e-b248-ee17f165c7be"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 transition-colors"
                        />
                      </div>
                    )}

                    {/* Channel Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kênh truyền thông</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(['InApp', 'Email', 'SMS', 'Push'] as NotificationType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setChannelType(type)}
                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer text-center ${
                              channelType === type
                                ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                                : 'border-slate-100 bg-slate-50 hover:border-slate-200 text-slate-600'
                            }`}
                          >
                            {type === 'InApp' ? 'In-App App' : type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Tiêu đề thông báo</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nhập tiêu đề..."
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-605">Nội dung thông báo</label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập nội dung thông báo cụ thể..."
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center gap-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={sending}
                        className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {sending ? (
                          <>
                            <Icons.Spinner className="w-4 h-4 animate-spin text-white" />
                            <span>Đang gửi...</span>
                          </>
                        ) : (
                          <span>Gửi ngay</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
