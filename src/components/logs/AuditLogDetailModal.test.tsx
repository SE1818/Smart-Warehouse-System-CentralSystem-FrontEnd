import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogDetailModal } from '@/components/logs/AuditLogDetailModal';
import type { AuditLog } from '@/types';

const mockLog: AuditLog = {
  id: 'log-001',
  userId: 'user-123',
  userName: 'Nguyễn Văn A',
  activityType: 'Update',
  entityType: 'Product',
  entityId: 'prod-456',
  severity: 'Warning',
  message: 'Cập nhật thông tin sản phẩm',
  ipAddress: '10.0.0.1',
  userAgent: 'Firefox/120.0',
  createdAt: '2025-06-15T10:30:00Z',
  oldValue: { price: 15000 },
  newValue: { price: 18000 },
};

describe('AuditLogDetailModal', () => {
  it('does not render when log is null', () => {
    const { container } = render(
      <AuditLogDetailModal log={null} isOpen={true} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when log is provided and isOpen is true', () => {
    render(
      <AuditLogDetailModal log={mockLog} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText('Chi tiết nhật ký hoạt động')).toBeInTheDocument();
  });

  it('renders log ID and message', () => {
    render(
      <AuditLogDetailModal log={mockLog} isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText(/log-001/)).toBeInTheDocument();
    expect(screen.getByText('Cập nhật thông tin sản phẩm')).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuditLogDetailModal log={mockLog} isOpen={true} onClose={handleClose} />
    );
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('clicking overlay calls onClose', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <AuditLogDetailModal log={mockLog} isOpen={true} onClose={handleClose} />
    );
    // The backdrop is the first child and has onClick on the parent modal wrapper
    // Find the backdrop element (fixed inset-0 bg-slate-900 overlay)
    const backdrop = container.querySelector('.bg-slate-900\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
