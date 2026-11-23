import apiClient from './api';

export type EdgeRobotLogCategoryKey =
  | 'All'
  | 'Transfer'
  | 'Command'
  | 'TableTransfer'
  | 'StatusHistory'
  | 'DeviceResponse';

export interface EdgeTransferLogItem {
  id: string;
  transferRequestId: string;
  robotId: string;
  robotName?: string | null;
  destinationTableNo?: string | null;
  statusResult: string;
  distanceTravelled?: number | null;
  errorNotes?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface EdgeCommandLogItem {
  id: string;
  commandId: string;
  robotId?: string | null;
  robotName?: string | null;
  commandType: string;
  executionResult: string;
  executionTimeMs?: number | null;
  parametersJson?: string | null;
  responseDataJson?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface EdgeTableTransferLogItem {
  id: string;
  storeId: string;
  orderId?: string | null;
  fromTableNo: string;
  toTableNo: string;
  reason: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface EdgeStatusHistoryLogItem {
  id: string;
  transferRequestId: string;
  robotId?: string | null;
  robotName?: string | null;
  destinationTableNo?: string | null;
  previousStatus?: string | null;
  newStatus: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface EdgeDeviceResponseLogItem {
  id: string;
  transferRequestId: string;
  robotId: string;
  robotName?: string | null;
  status: string;
  currentX?: number | null;
  currentY?: number | null;
  batteryAtResponse?: number | null;
  responseDataJson?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface EdgeRobotLogsPayload {
  transferLogs: EdgeTransferLogItem[];
  commandLogs: EdgeCommandLogItem[];
  tableTransferLogs: EdgeTableTransferLogItem[];
  statusHistoryLogs: EdgeStatusHistoryLogItem[];
  deviceResponseLogs: EdgeDeviceResponseLogItem[];
}

export interface EdgeRobotLogsQueryParams {
  category?: EdgeRobotLogCategoryKey;
  robotId?: string;
  status?: string;
  search?: string;
  limit?: number;
}

const EMPTY_PAYLOAD: EdgeRobotLogsPayload = {
  transferLogs: [],
  commandLogs: [],
  tableTransferLogs: [],
  statusHistoryLogs: [],
  deviceResponseLogs: [],
};

export const edgeRobotLogsService = {
  async getEdgeRobotLogs(
    params?: EdgeRobotLogsQueryParams
  ): Promise<{ data: EdgeRobotLogsPayload; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.robotId && params.robotId !== 'all') query.append('robotId', params.robotId);
      if (params?.status && params.status !== 'ALL') query.append('status', params.status);
      if (params?.search?.trim()) query.append('search', params.search.trim());
      if (params?.limit) query.append('limit', String(params.limit));

      const queryString = query.toString();
      const url = queryString ? `/v1/robots/edge-logs?${queryString}` : '/v1/robots/edge-logs';
      const response = await apiClient.get<EdgeRobotLogsPayload>(url);
      const raw = response.data;

      return {
        data: {
          transferLogs: Array.isArray(raw?.transferLogs) ? raw.transferLogs : [],
          commandLogs: Array.isArray(raw?.commandLogs) ? raw.commandLogs : [],
          tableTransferLogs: Array.isArray(raw?.tableTransferLogs) ? raw.tableTransferLogs : [],
          statusHistoryLogs: Array.isArray(raw?.statusHistoryLogs) ? raw.statusHistoryLogs : [],
          deviceResponseLogs: Array.isArray(raw?.deviceResponseLogs) ? raw.deviceResponseLogs : [],
        },
      };
    } catch (err) {
      console.warn('[edgeRobotLogsService] Không thể tải nhật ký robot tại trạm:', err);
      return {
        data: EMPTY_PAYLOAD,
        error: 'Không thể tải nhật ký robot tại trạm lúc này. Vui lòng thử lại sau.',
      };
    }
  },
};
