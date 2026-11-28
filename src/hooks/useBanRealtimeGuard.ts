import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import apiClient, { clearAuthSession } from '../services/api';

export const BAN_CONTEXT_STORAGE_KEY = 'vora_ban_context';

const isSuperAdminRole = (role?: string, isSuperAdmin?: boolean): boolean => {
  if (isSuperAdmin) return true;
  const normalized = (role || '').toLowerCase().replace(/[-_\s]/g, '');
  return normalized === 'superadmin' || normalized === 'admin' || normalized === 'platformadmin';
};

export function BanRealtimeGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;

    let user: Record<string, any> | null = null;
    try {
      user = JSON.parse(userStr);
    } catch {
      return;
    }

    if (!user || isSuperAdminRole(user.role, user.isSuperAdmin)) {
      return;
    }

    const currentUserId = String(user.userId || user.id || '').toLowerCase().trim();
    const currentEmail = String(user.email || '').toLowerCase().trim();
    const currentTenantId = String(user.tenantId || '').toLowerCase().trim();
    const currentSubdomain = String(user.subdomain || user.tenantSlug || '').toLowerCase().trim();

    const baseUrl = String(apiClient.defaults.baseURL || '/api/v1').replace(/\/+$/, '');
    const hubUrl = `${baseUrl}/notifications/hub`;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('authToken') || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Error)
      .build();

    const kickToLogin = (scope: 'Account' | 'Store', message: string, reason?: string) => {
      sessionStorage.setItem(
        BAN_CONTEXT_STORAGE_KEY,
        JSON.stringify({ scope, reason: reason || 'ADMIN_BANNED', message })
      );
      clearAuthSession();
      navigate('/login', { replace: true, state: { accessDeniedReason: message, banScope: scope } });
    };

    const handleAccountBanEvent = (payload: any) => {
      if (!payload?.isBanned) return;
      const targetUserId = String(payload.userId || '').toLowerCase().trim();
      const targetEmail = String(payload.email || '').toLowerCase().trim();
      const isMe =
        (currentUserId && targetUserId && currentUserId === targetUserId) ||
        (currentEmail && targetEmail && currentEmail === targetEmail);
      if (isMe) {
        kickToLogin(
          'Account',
          payload.message || 'Tài khoản của bạn đã bị quản trị viên khóa. Cửa hàng vẫn hoạt động bình thường.',
          payload.reason
        );
      }
    };

    const handleTenantBanEvent = (payload: any) => {
      if (!payload?.isBanned) return;
      const targetTenantId = String(payload.tenantId || '').toLowerCase().trim();
      const targetSlug = String(payload.tenantSlug || '').toLowerCase().trim();
      const isMyTenant =
        (currentTenantId && targetTenantId && currentTenantId === targetTenantId) ||
        (currentSubdomain && targetSlug && currentSubdomain === targetSlug);
      if (isMyTenant) {
        kickToLogin(
          'Store',
          payload.message ||
            'Cửa hàng của bạn đã bị quản trị viên tạm khóa. Kết nối Edge Node và toàn bộ tài khoản đã được ngắt.',
          payload.reason
        );
      }
    };

    connection.on('AccountBanStatusChanged', handleAccountBanEvent);
    connection.on('TenantBanStatusChanged', handleTenantBanEvent);

    let disposed = false;
    connection
      .start()
      .then(() => {
        if (!disposed && (currentTenantId || currentSubdomain)) {
          return connection.invoke('JoinTenantGroup', currentTenantId || null, currentSubdomain || null);
        }
      })
      .catch(() => {
        // Non-fatal: Gateway Redis interceptor enforces ban on next API call
      });

    return () => {
      disposed = true;
      connection.off('AccountBanStatusChanged', handleAccountBanEvent);
      connection.off('TenantBanStatusChanged', handleTenantBanEvent);
      void connection.stop().catch(() => {});
    };
  }, [navigate]);

  return null;
}
