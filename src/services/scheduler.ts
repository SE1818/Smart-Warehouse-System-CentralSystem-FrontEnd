import apiClient from './api';

export interface SchedulerTrigger {
  triggerKey: string;
  triggerType: string;
  cronExpression: string | null;
  state: string;
  previousFireTime: string | null;
  nextFireTime: string | null;
  startTime: string;
}

export interface SchedulerJob {
  jobName: string;
  jobGroup: string;
  description: string | null;
  jobType: string;
  isCurrentlyRunning: boolean;
  durable: boolean | null;
  triggers: SchedulerTrigger[];
}

export interface SchedulerResponse {
  schedulerName: string;
  schedulerInstanceId: string;
  isStarted: boolean;
  isInStandbyMode: boolean;
  isShutdown: boolean;
  jobCount: number;
  jobs: SchedulerJob[];
}

export const schedulerService = {
  async getJobs(): Promise<SchedulerResponse> {
    const res = await apiClient.get<SchedulerResponse>('/scheduler/jobs');
    return res.data;
  },

  async triggerJob(jobName: string, group: string = 'DEFAULT'): Promise<any> {
    const res = await apiClient.post(`/scheduler/jobs/${jobName}/trigger?group=${group}`);
    return res.data;
  },

  async pauseJob(jobName: string, group: string = 'DEFAULT'): Promise<any> {
    const res = await apiClient.post(`/scheduler/jobs/${jobName}/pause?group=${group}`);
    return res.data;
  },

  async resumeJob(jobName: string, group: string = 'DEFAULT'): Promise<any> {
    const res = await apiClient.post(`/scheduler/jobs/${jobName}/resume?group=${group}`);
    return res.data;
  }
};
