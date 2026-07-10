import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditLogRow } from '@/components/logs/AuditLogRow';
import type { AuditLog } from '@/types';

const mockLog: AuditLog = {
  id: 'log-001',
  userId: 'user-123',
  userName: 'Nguyễn Văn A',
  activityType: 'Create',
  entityType: 'Product',
  entityId: 'prod-456',
  severity: 'Info',
  message: 'Tạo sản phẩm mới',
  ipAddress: '192.168.1.1',
  userAgent: 'Chrome/120.0',
  createdAt: '2025-06-15T10:30:00Z',
  oldValue: undefined,
  newValue: undefined,
};

describe('AuditLogRow', () => {
  it('renders severity badge', () => {
    render(<AuditLogRow log={mockLog} onClick={() => {}} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renders action text (activityType)', () => {
    render(<AuditLogRow log={mockLog} onClick={() => {}} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders entity type badge', () => {
    render(<AuditLogRow log={mockLog} onClick={() => {}} />);
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  it('formats timestamp and renders ip address', () => {
    render(<AuditLogRow log={mockLog} onClick={() => {}} />);
    expect(screen.getByText(/2025/)).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('renders user name when userName is present', () => {
    render(<AuditLogRow log={mockLog} onClick={() => {}} />);
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
  });

  it('renders Hệ thống fallback when userName and userId are absent', () => {
    const logNoUser: AuditLog = {
      ...mockLog,
      userName: undefined,
      userId: undefined,
    };
    render(<AuditLogRow log={logNoUser} onClick={() => {}} />);
    expect(screen.getByText('Hệ thống')).toBeInTheDocument();
  });
});
