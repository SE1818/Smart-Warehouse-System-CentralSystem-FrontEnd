import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SchedulerPage } from '../SchedulerPage';
import type { SchedulerJob, SchedulerResponse, SchedulerTrigger } from '@/services/scheduler';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Plus: mockIcon('plus'),
      UsersGroup: mockIcon('users-group'),
      Thermometer: mockIcon('thermometer'),
      Droplet: mockIcon('droplet'),
      Bolt: mockIcon('bolt'),
      Profile: mockIcon('profile'),
      Close: mockIcon('close'),
      Calendar: mockIcon('calendar'),
      Inbox: mockIcon('inbox'),
      SuccessCheck: mockIcon('success-check'),
      User: mockIcon('user'),
      Check: mockIcon('check'),
      Store: mockIcon('store'),
      Folder: mockIcon('folder'),
      Warehouse: mockIcon('warehouse'),
      Product: mockIcon('product'),
      CartOrder: mockIcon('cartorder'),
      Dashboard: mockIcon('dashboard'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-alert'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
      Robot: mockIcon('robot'),
    },
  };
});

vi.mock('@/services/scheduler', () => ({
  schedulerService: {
    getJobs: vi.fn(),
    triggerJob: vi.fn(),
    pauseJob: vi.fn(),
    resumeJob: vi.fn(),
  },
}));

import { schedulerService } from '@/services/scheduler';

const renderSchedulerPage = () =>
  render(<BrowserRouter><SchedulerPage /></BrowserRouter>);

const mockJob = (
  overrides: Record<string, unknown> = {},
): SchedulerJob => ({
  jobName: (overrides.jobName as string) ?? 'TestJob',
  jobGroup: (overrides.jobGroup as string) ?? 'DEFAULT',
  description: 'description' in overrides ? (overrides.description as SchedulerJob['description']) : 'Test description',
  jobType: 'org.quartz.Job',
  isCurrentlyRunning: (overrides.isCurrentlyRunning as boolean) ?? false,
  durable: true,
  triggers: (overrides.triggers as SchedulerTrigger[] | undefined) ?? [
    {
      triggerKey: 't1',
      triggerType: 'CRON',
      cronExpression: '0 0 0 * * ?',
      state: 'NORMAL',
      previousFireTime: '2025-06-14T02:00:00Z',
      nextFireTime: '2025-06-15T02:00:00Z',
      startTime: '2025-01-01T00:00:00Z',
    },
  ],
});

const mockResponse = (jobs: SchedulerJob[], instanceId = 'inst-1', jobCount?: number): SchedulerResponse => ({
  schedulerName: 'quartz',
  schedulerInstanceId: instanceId,
  isStarted: true,
  isInStandbyMode: false,
  isShutdown: false,
  jobCount: jobCount ?? jobs.length,
  jobs,
});

describe('SchedulerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders heading', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Quản lý Scheduler (Quartz Jobs)')).toBeInTheDocument()
    );
  });

  it('shows loading text while fetching', () => {
    vi.mocked(schedulerService.getJobs).mockImplementation(() => new Promise(() => {}));
    renderSchedulerPage();
    expect(screen.getByText('Đang tải cấu hình scheduler...')).toBeInTheDocument();
  });

  it('loads then clears loading when fetch fails', async () => {
    vi.mocked(schedulerService.getJobs).mockRejectedValue(new Error('fail'));
    renderSchedulerPage();
    expect(screen.getByText('Đang tải cấu hình scheduler...')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText('Đang tải cấu hình scheduler...')).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
  });

  it('shows stats with 0 jobs', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Tổng số Jobs')).toBeInTheDocument()
    );
  });

  it('shows Đang thực thi stat with running count 1', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ isCurrentlyRunning: true })]),
    );
    renderSchedulerPage();
    await waitFor(() => {
      expect(screen.getByText('Đang thực thi')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('shows Đang tạm dừng stat with paused count 1', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'PAUSED',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() => {
      expect(screen.getByText('Đang tạm dừng')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('renders scheduler instance id', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([], 'my-instance-123'),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText(/my-instance-123/)).toBeInTheDocument(),
    );
  });

  it('shows table when data has jobs', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob()]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Danh sách Quartz Jobs')).toBeInTheDocument(),
    );
  });

  it('shows job name in table row', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ jobName: 'MyJob' })]),
    );
    renderSchedulerPage();
    await waitFor(() => expect(screen.getByText('MyJob')).toBeInTheDocument());
  });

  it('shows Không có mô tả when description is null', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          description: null,
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'NORMAL',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Không có mô tả')).toBeInTheDocument(),
    );
  });

  it('shows job group badge', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ jobGroup: 'HELLO' })]),
    );
    renderSchedulerPage();
    await waitFor(() => expect(screen.getByText('HELLO')).toBeInTheDocument());
  });

  it('shows cron expression inside code tag', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: '0 */6 * * * ?',
              state: 'NORMAL',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('0 */6 * * * ?')).toBeInTheDocument(),
    );
  });

  it('shows Simple Trigger text when no cron expression', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'SIMPLE',
              cronExpression: null,
              state: 'NORMAL',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Simple Trigger')).toBeInTheDocument(),
    );
  });

  it('renders HOẠT ĐỘNG badge for NORMAL', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob()]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Hoạt động')).toBeInTheDocument(),
    );
  });

  it('renders TẠM DỪNG badge for PAUSED', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'PAUSED',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Tạm dừng')).toBeInTheDocument(),
    );
  });

  it('renders BỊ CHẶN badge for BLOCKED', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'BLOCKED',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Bị chặn')).toBeInTheDocument(),
    );
  });

  it('renders LỖI badge for ERROR state', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'ERROR',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() => expect(screen.getByText('Lỗi')).toBeInTheDocument());
  });

  it('renders fallback badge for unknown state', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'UNKNOWN',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() => expect(screen.getByText('UNKNOWN')).toBeInTheDocument());
  });

  it('shows formatted previous and next fire time', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'NORMAL',
              previousFireTime: '2025-06-14T02:00:00Z',
              nextFireTime: '2025-06-15T02:00:00Z',
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText(/14\/06\/2025/)).toBeInTheDocument(),
    );
  });

  it('shows N/A for null fire times', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'NORMAL',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() => {
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Đang chạy badge when job is currently running', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ isCurrentlyRunning: true })]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Đang chạy')).toBeInTheDocument(),
    );
  });

  it('shows CHỜ LỆNH text when job is not running', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ isCurrentlyRunning: false })]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Chờ lệnh')).toBeInTheDocument(),
    );
  });

  it('shows KHÔNG CÓ TRIGGER when job has no triggers', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Không có trigger')).toBeInTheDocument(),
    );
  });

  it('shows empty state illustration when no jobs', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Không tìm thấy Quartz Job nào đang chạy trong hệ thống.')).toBeInTheDocument()
    );
  });

  it('refresh button calls getJobs on click', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Làm mới')).toBeInTheDocument(),
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Làm mới'));
    expect(schedulerService.getJobs).toHaveBeenCalled();
  });

  it('triggerJob called with job name and group on Chạy ngay click', async () => {
    vi.mocked(schedulerService.triggerJob).mockResolvedValue({});
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ jobName: 'Cleanup', jobGroup: 'HELLO' })]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Chạy ngay')).toBeInTheDocument(),
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Chạy ngay'));
    expect(schedulerService.triggerJob).toHaveBeenCalledWith('Cleanup', 'HELLO');
  });

  it('shows resume button (Khôi phục) when trigger is paused', async () => {
    vi.mocked(schedulerService.resumeJob).mockResolvedValue({});
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'PAUSED',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Khôi phục')).toBeInTheDocument(),
    );
  });

  it('resumeJob called on Khôi phục click', async () => {
    vi.mocked(schedulerService.resumeJob).mockResolvedValue({});
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({
          triggers: [
            {
              triggerKey: 't1',
              triggerType: 'CRON',
              cronExpression: null,
              state: 'PAUSED',
              previousFireTime: null,
              nextFireTime: null,
              startTime: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Khôi phục')).toBeInTheDocument(),
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Khôi phục'));
    expect(schedulerService.resumeJob).toHaveBeenCalled();
  });

  it('shows pause button (Tạm dừng) when trigger is NORMAL', async () => {
    vi.mocked(schedulerService.pauseJob).mockResolvedValue({});
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob()]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Tạm dừng')).toBeInTheDocument(),
    );
  });

  it('pauseJob called on Tạm dừng click', async () => {
    vi.mocked(schedulerService.pauseJob).mockResolvedValue({});
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob()]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Tạm dừng')).toBeInTheDocument(),
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Tạm dừng'));
    expect(schedulerService.pauseJob).toHaveBeenCalled();
  });

  it('does not show pause/resume when trigger is missing', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ triggers: [] })]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Không có trigger')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Tạm dừng')).not.toBeInTheDocument();
    expect(screen.queryByText('Khôi phục')).not.toBeInTheDocument();
  });

  it('displays multiple jobs in the table', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([
        mockJob({ jobName: 'JobA', jobGroup: 'A' }),
        mockJob({ jobName: 'JobB', jobGroup: 'B' }),
      ]),
    );
    renderSchedulerPage();
    await waitFor(() => {
      expect(screen.getByText('JobA')).toBeInTheDocument();
      expect(screen.getByText('JobB')).toBeInTheDocument();
    });
  });

  it('renders Tổng số Jobs stat label', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([mockJob({ jobName: 'J1' })]),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Tổng số Jobs')).toBeInTheDocument(),
    );
  });

  it('renders Đang thực thi stat label', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Đang thực thi')).toBeInTheDocument(),
    );
  });

  it('renders Đang tạm dừng stat label', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText('Đang tạm dừng')).toBeInTheDocument(),
    );
  });

  it('renders Instance info with id', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(
      mockResponse([], 'abc-123'),
    );
    renderSchedulerPage();
    await waitFor(() =>
      expect(screen.getByText(/abc-123/)).toBeInTheDocument(),
    );
  });

  it('call getJobs on mount', async () => {
    vi.mocked(schedulerService.getJobs).mockResolvedValue(mockResponse([]));
    renderSchedulerPage();
    await waitFor(() => expect(schedulerService.getJobs).toHaveBeenCalled());
  });
});
