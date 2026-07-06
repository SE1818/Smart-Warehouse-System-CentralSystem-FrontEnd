import apiClient from './api';

export interface RobotConnection {
  robotId: string;
  name: string;
  ip: string;
  status: 'idle' | 'moving' | 'charging' | 'offline' | 'fault';
  battery: number;
  x: number;
  y: number;
  lastSeen: string;
}

export interface CommandLog {
  commandId: string;
  robotId: string;
  commandType: string;
  parameters: any;
  status: string;
  createdAt: string;
}

export const robotMonitorService = {
  getRobots() {
    return apiClient.get<RobotConnection[]>('/v1/robots');
  },
  getCommandLog(robotId: string) {
    return apiClient.get<CommandLog[]>(`/v1/commands/robot/${robotId}`);
  },
  sendCommand(robotId: string, type: string, params: any) {
    return apiClient.post(`/v1/robots/${robotId}/commands`, { commandType: type, parameters: params });
  },
  emergencyStop(robotId: string) {
    return apiClient.post(`/v1/robots/${robotId}/emergency-stop`);
  }
};
export default robotMonitorService;
