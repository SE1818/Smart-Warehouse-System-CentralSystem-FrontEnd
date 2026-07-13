import { create } from 'zustand';
import { signalRService } from '@/services/signalrService';

export interface MetricPayload {
  id: string;
  warehouseId: string;
  metricType: string;
  metricValue: number;
  timestamp: string;
  metadata?: string;
}

interface MetricsState {
  status: 'connected' | 'connecting' | 'disconnected';
  latestMetrics: Record<string, MetricPayload>;
  connect: () => void;
  disconnect: () => void;
}

export const useMetricsStore = create<MetricsState>((set) => {
  let handlersRegistered = false;

  const registerHandlers = () => {
    if (handlersRegistered) return;

    signalRService.onMetric('ReceiveMetric', (metric: MetricPayload) => {
      set((state) => {
        const key = `${metric.warehouseId}:${metric.metricType}`;
        return {
          latestMetrics: {
            ...state.latestMetrics,
            [key]: metric,
          },
        };
      });

      window.dispatchEvent(
        new CustomEvent('smartwarehouse-metric-received', { detail: metric }),
      );
    });

    handlersRegistered = true;
  };

  return {
    status: 'disconnected',
    latestMetrics: {},

    connect: () => {
      registerHandlers();

      signalRService.onStatusChange('metrics', (newStatus) => {
        set({ status: newStatus });
      });

      signalRService.connectMetrics();
    },

    disconnect: () => {
      signalRService.onStatusChange('metrics', () => {});
      signalRService.disconnectAll();
    },
  };
});
