import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransferDetailDrawer } from '@/components/TransferDetailDrawer';

vi.mock('@/components/Icons', () => {
  const mkIcon = (testId: string) => () => <span data-testid={testId} />;
  return {
    Icons: {
      Truck: mkIcon('icon-truck'),
      Close: mkIcon('icon-close'),
      HistoryLogs: mkIcon('icon-history'),
      Robot: mkIcon('icon-robot'),
      Metrics: mkIcon('icon-metrics'),
      Spinner: mkIcon('icon-spinner'),
    },
  };
});

vi.mock('@/services/transferService', () => {
  const auditData = {
    transferRequestId: 'req-id-123',
    request: {
      id: 'req-id-123',
      fromStationId: '1111',
      toStationId: '2222',
      priority: 1,
      status: 'InProgress',
      createdAt: '2025-06-15T08:00:00Z',
    },
    statusHistory: [
      {
        id: 'hist-1',
        transferRequestId: 'req-id-123',
        previousStatus: '',
        newStatus: 'Assigned',
        notes: 'Robot assigned',
        createdBy: 'user-1',
        createdAt: '2025-06-15T08:05:00Z',
      },
      {
        id: 'hist-2',
        transferRequestId: 'req-id-123',
        previousStatus: 'Assigned',
        newStatus: 'InProgress',
        notes: 'Robot di chuyển',
        createdBy: 'system',
        createdAt: '2025-06-15T08:10:00Z',
      },
    ],
    commands: [
      {
        id: 'cmd-1',
        robotId: 'robot-abc',
        commandType: 'Move',
        parametersJson: '{"from":"ST05","to":"ST01"}',
        status: 'executed',
        createdBy: 'user-1',
        createdAt: '2025-06-15T08:05:00Z',
      },
    ],
    responses: [
      {
        id: 'resp-1',
        transferRequestId: 'req-id-123',
        robotId: 'robot-abc',
        status: '200',
        currentX: 150,
        currentY: 80,
        batteryAtResponse: 75,
        createdAt: '2025-06-15T08:12:00Z',
      },
    ],
    transferLog: {
      id: 'log-1',
      transferRequestId: 'req-id-123',
      robotId: 'robot-abc',
      statusResult: 'completed',
      distanceTravelled: 1200,
      errorNotes: null,
      startedAt: '2025-06-15T08:05:00Z',
      finishedAt: null,
      createdAt: '2025-06-15T08:05:00Z',
    },
  };
  return {
    transferService: {
      getTransferHistory: vi.fn().mockResolvedValue(auditData),
    },
  };
});

describe('TransferDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    transferId: 'req-id-123',
    onClose: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders transfer header with transfer id', async () => {
    render(
      <MemoryRouter>
        <TransferDetailDrawer {...defaultProps} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Chuyến/)).toBeInTheDocument();
    });
  });

  it('renders transfer info including commands and timeline', async () => {
    render(
      <MemoryRouter>
        <TransferDetailDrawer {...defaultProps} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Lệnh gửi tới Robot')).toBeInTheDocument();
      expect(screen.getByText('Tiến độ hành trình (Timeline)')).toBeInTheDocument();
    });
  });

  it('renders timeline status history entries', async () => {
    render(
      <MemoryRouter>
        <TransferDetailDrawer {...defaultProps} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Assigned')).toBeInTheDocument();
    });
  });

  it('renders close button via aria-label', async () => {
    render(
      <MemoryRouter>
        <TransferDetailDrawer {...defaultProps} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Đóng chi tiết chuyến vận chuyển')).toBeInTheDocument();
    });
  });
});
