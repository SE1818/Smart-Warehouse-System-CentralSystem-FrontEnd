import apiClient from './api';
import { sqliteService } from './sqliteService';

export interface TransferRequest {
  id: string;
  fromStationId: string;
  toStationId: string;
  priority: number;
  status: string;
  createdAt: string;
}

export interface TransferStatus {
  id: string;
  transferRequestId: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface TransferCommand {
  id: string;
  robotId: string;
  commandType: string;
  parametersJson: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
}

export interface TransferResponse {
  id: string;
  transferRequestId: string;
  robotId: string;
  status: string;
  currentX: number | null;
  currentY: number | null;
  batteryAtResponse: number | null;
  createdAt: string;
}

export interface LogTransfer {
  id: string;
  transferRequestId: string;
  robotId: string;
  statusResult: string;
  distanceTravelled: number | null;
  errorNotes: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

export interface TransferAudit {
  transferRequestId: string;
  request: TransferRequest;
  statusHistory: TransferStatus[];
  commands: TransferCommand[];
  responses: TransferResponse[];
  transferLog: LogTransfer | null;
}

export interface TransferStats {
  totalToday: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMinutes: number;
  byRobot: Record<string, number>;
}

export interface TransferCommandStatus {
  id: string;
  commandId: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LogTransferCommand {
  id: string;
  commandId: string;
  executionResult: string;
  responseDataJson: string | null;
  executionTimeMs: number | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CargoTrayAssignment {
  cargoLevel: number;
  toStationId: string;
  destinationTableNo?: string;
  orderReference?: string;
  weightKg: number;
  volumeLiters: number;
  priority: number;
}

export interface StartServiceSequenceRequest {
  robotId?: string;
  tenantId?: string;
  fromStationId: string;
  trayAssignments: CargoTrayAssignment[];
}

export interface ServiceSequenceResult {
  success: boolean;
  message: string;
  robotId: string;
  robotName: string;
  totalStops: number;
  totalWeightKg: number;
  createdTasks: TransferRequest[];
}

export const transferService = {
  // Start multi-tray service sequence
  async startServiceSequence(request: StartServiceSequenceRequest): Promise<ServiceSequenceResult> {
    const response = await apiClient.post<ServiceSequenceResult>('/v1/tasks/sequence/start', request);
    return response.data;
  },

  // Get all transfers
  async listTransfers(): Promise<TransferRequest[]> {
    const response = await apiClient.get<TransferRequest[]>('/v1/tasks');
    return response.data;
  },

  // Get transfer stats
  async getTransferStats(): Promise<TransferStats> {
    const response = await apiClient.get<TransferStats>('/v1/tasks/stats');
    return response.data;
  },

  // Get active transfers
  async getActiveTransfers(): Promise<TransferRequest[]> {
    const response = await apiClient.get<TransferRequest[]>('/v1/tasks/active');
    return response.data;
  },

  // Get audit history of a transfer and persist transferLog to SQLite
  async getTransferHistory(id: string): Promise<TransferAudit> {
    try {
      const response = await apiClient.get<TransferAudit>(`/v1/tasks/${id}/history`);
      if (response.data && response.data.transferLog) {
        await sqliteService.saveTransferLog(response.data.transferLog);
      }
      return response.data;
    } catch (err) {
      console.warn('[transferService] Không thể nạp audit từ API, thử nạp từ SQLite:', err);
      const localLogs = await sqliteService.getTransferLogs();
      const matched = localLogs.find((l) => l.transferRequestId === id);
      return {
        transferRequestId: id,
        request: {
          id,
          fromStationId: 'st-01',
          toStationId: 'st-02',
          priority: 1,
          status: matched?.statusResult || 'unknown',
          createdAt: matched?.createdAt || new Date().toISOString(),
        },
        statusHistory: [],
        commands: [],
        responses: [],
        transferLog: matched || null,
      };
    }
  },

  // Get transfer activity logs (BE API first, fallback SQLite cache)
  async getLocalTransferLogs(limit = 100): Promise<LogTransfer[]> {
    try {
      const response = await apiClient.get<LogTransfer[]>('/v1/tasks/active');
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch { }

    try {
      return await sqliteService.getTransferLogs(limit);
    } catch {
      return [];
    }
  },

  // Get commands of a transfer
  async getTransferCommands(id: string): Promise<TransferCommand[]> {
    const response = await apiClient.get<TransferCommand[]>(`/v1/tasks/${id}/commands`);
    return response.data;
  },

  // Get responses of a transfer
  async getTransferResponses(id: string): Promise<TransferResponse[]> {
    const response = await apiClient.get<TransferResponse[]>(`/v1/tasks/${id}/responses`);
    return response.data;
  },

  // Cancel a transfer request
  async cancelTransfer(id: string): Promise<void> {
    await apiClient.delete(`/v1/tasks/${id}/cancel`);
  },

  // Get command status history
  async getCommandStatusHistory(commandId: string): Promise<TransferCommandStatus[]> {
    const response = await apiClient.get<TransferCommandStatus[]>(`/v1/tasks/commands/${commandId}/history`);
    return response.data;
  },

  // Get command log
  async getCommandLog(commandId: string): Promise<LogTransferCommand> {
    const response = await apiClient.get<LogTransferCommand>(`/v1/tasks/commands/${commandId}/log`);
    return response.data;
  }
};
