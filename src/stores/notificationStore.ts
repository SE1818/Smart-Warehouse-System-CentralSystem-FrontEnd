import { create } from 'zustand';
import * as signalR from '@microsoft/signalr';
import { toast } from 'react-toastify';
import React from 'react';
import { getValidAuthTokenOrRefresh, handleSignalR401, isUnauthorizedError } from '@/services/api';

interface NotificationPayload {
  title: string;
  message: string;
}

interface NotificationState {
  status: 'connected' | 'connecting' | 'disconnected';
  connection: signalR.HubConnection | null;
  notifications: NotificationPayload[];
  connect: (userId: string) => void;
  disconnect: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  return {
    status: 'disconnected',
    connection: null,
    notifications: [],

    connect: (userId) => {
      if (get().connection) return;

      set({ status: 'connecting' });
      const connectionUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/notifications/hub?userId=${userId}`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(connectionUrl, {
          accessTokenFactory: async () => (await getValidAuthTokenOrRefresh()) || '',
          headers: import.meta.env.DEV ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
        })
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.retryReason && isUnauthorizedError(retryContext.retryReason)) {
              void handleSignalR401();
              return null;
            }
            const delay = Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            console.log(`[SignalR] Notification Hub reconnect attempt #${retryContext.previousRetryCount + 1} in ${delay}ms`);
            return delay;
          }
        })
        .build();

      connection.on('ReceiveNotification', (notification: NotificationPayload) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));

        // Render standard beautiful toast notification
        toast.info(
          React.createElement('div', null,
            React.createElement('div', { className: 'font-bold text-slate-900 text-sm mb-0.5' }, notification.title),
            React.createElement('div', { className: 'text-xs text-slate-600 font-semibold' }, notification.message)
          )
        );

        // Dispatch legacy event for backward compatibility with transfers page and notifications page
        window.dispatchEvent(new CustomEvent('smartwarehouse-notification', { detail: notification }));
      });

      connection.onreconnecting((error) => {
        set({ status: 'connecting' });
        console.warn('[SignalR] Notification Hub reconnecting...', error);
      });

      connection.onreconnected((connectionId) => {
        set({ status: 'connected' });
        console.log('[SignalR] Notification Hub reconnected. Connection ID:', connectionId);
      });

      const startConnection = () => {
        if (!get().connection) return;
        connection.start()
          .then(() => {
            set({ status: 'connected', connection });
            console.log('[SignalR] Connected to Notification Hub for user:', userId);
          })
          .catch(async (err) => {
            set({ status: 'disconnected' });
            console.error('[SignalR] Notification Hub connection failed:', err);
            if (isUnauthorizedError(err)) {
              const refreshed = await handleSignalR401();
              if (refreshed && get().connection && get().status === 'disconnected') {
                console.log('[SignalR] Token refreshed, retrying Notification Hub...');
                set({ status: 'connecting' });
                startConnection();
              }
              return;
            }
            setTimeout(() => {
              if (get().connection && get().status === 'disconnected') {
                console.log('[SignalR] Retrying initial connection to Notification Hub...');
                set({ status: 'connecting' });
                startConnection();
              }
            }, 5000);
          });
      };

      connection.onclose((error) => {
        set({ status: 'disconnected' });
        console.error('[SignalR] Notification Hub connection closed.', error);
        if (isUnauthorizedError(error)) {
          void handleSignalR401();
          return;
        }
        setTimeout(() => {
          if (get().connection && get().status === 'disconnected') {
            console.log('[SignalR] Restarting connection to Notification Hub after close...');
            set({ status: 'connecting' });
            startConnection();
          }
        }, 10000);
      });

      set({ connection });
      startConnection();
    },

    disconnect: () => {
      if (get().connection) {
        const conn = get().connection;
        set({ connection: null, status: 'disconnected' });
        conn?.stop().catch((e) => console.error('[SignalR] Error stopping Notification Hub connection:', e));
      }
    },
  };
});
