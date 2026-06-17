import { useState, useEffect } from 'react';
import type { NotificationDto } from '@/types/notification';
import { notificationService } from '@/services/notification';
import { useAuth } from '@/hooks/useAuth';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
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
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Email':
        return '📧 Email';
      case 'SMS':
        return '📱 SMS';
      case 'InApp':
        return '🖥️ In-App';
      case 'Push':
        return '🔔 Push';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🔔</span> Thông báo
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Xem lịch sử thông báo gửi đến người dùng
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Đang tải thông báo...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <p className="text-slate-400 italic">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-bold text-slate-900 text-sm">{notification.title}</h3>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(notification.status)}`}>
                  {notification.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-3">{notification.message}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
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
