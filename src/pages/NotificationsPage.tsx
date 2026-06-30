import { useState, useEffect, useCallback } from 'react';
import type { NotificationDto } from '@/types/notification';
import { notificationService } from '@/services/notification';
import { useAuth } from '@/hooks/useAuth';
import { Icons } from '@/components/Icons';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getUserNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(() => {
        fetchNotifications();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, fetchNotifications]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Email':
        return 'Email';
      case 'SMS':
        return 'SMS';
      case 'InApp':
        return 'In-App';
      case 'Push':
        return 'Push';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250/60';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-250/60';
      default:
        return 'bg-amber-50 text-amber-705 border-amber-250/60';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="border-b border-slate-200/80 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Bell className="w-8 h-8 text-brand-600" />
            <span>Thông báo</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem lịch sử thông báo gửi đến người dùng
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-55 text-slate-705 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-305 transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Icons.Refresh className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải thông báo...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-2">
          <Icons.Search className="w-12 h-12 text-slate-350 mx-auto" />
          <p className="font-semibold text-sm text-slate-400">Không có thông báo nào gần đây</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-bold text-slate-900 text-sm">{notification.title}</h3>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(notification.status)}`}>
                  {notification.status === 'Sent' ? 'Đã gửi' : notification.status === 'Failed' ? 'Thất bại' : notification.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">{notification.message}</p>
              <div className="flex items-center justify-between text-xs text-slate-405 border-t border-slate-100 pt-3 mt-3">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  {getTypeLabel(notification.type)}
                </span>
                <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

