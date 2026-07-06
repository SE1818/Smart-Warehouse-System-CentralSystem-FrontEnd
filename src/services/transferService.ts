import apiClient from './api';

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

export const transferService = {
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

  // Get audit history of a transfer
  async getTransferHistory(id: string): Promise<TransferAudit> {
    const response = await apiClient.get<TransferAudit>(`/v1/tasks/${id}/history`);
    return response.data;
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
