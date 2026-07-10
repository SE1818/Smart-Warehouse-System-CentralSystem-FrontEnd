import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ComplaintsPage } from '../ComplaintsPage';

vi.mock('@/services/complaintService', () => ({
  complaintService: {
    getAllComplaints: vi.fn(),
    respondToComplaint: vi.fn(),
  },
}));

import { complaintService } from '@/services/complaintService';

const renderComplaintsPage = () => {
  render(<BrowserRouter><ComplaintsPage /></BrowserRouter>);
};

describe('ComplaintsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.mocked(complaintService.getAllComplaints).mockReset();
    vi.mocked(complaintService.respondToComplaint).mockReset();
  });

  it('renders "Quản lý khiếu nại & Hỗ trợ" heading', () => {
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([]);
    renderComplaintsPage();
    expect(screen.getByText('Quản lý khiếu nại & Hỗ trợ')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(complaintService.getAllComplaints).mockImplementation(() => new Promise(() => {}));
    renderComplaintsPage();
    expect(screen.getByText('Đang tải danh sách khiếu nại...')).toBeInTheDocument();
  });

  it('shows empty state when no complaints', async () => {
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([]);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Không tìm thấy khiếu nại nào')).toBeInTheDocument());
  });

  it('renders complaint list items after data loads', async () => {
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'customer@example.com', title: 'Sản phẩm hư hỏng', content: 'Nội dung', status: 'Pending' as const, createdAt: '2025-06-15T10:00:00Z' },
      { id: 'c2', userId: 'u2', userEmail: 'a@b.com', title: 'Giao hàng trễ', content: 'Nội dung', status: 'Resolved' as const, createdAt: '2025-06-14T10:00:00Z', adminResponse: 'Đã giải quyết', resolvedAt: '2025-06-15T00:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Sản phẩm hư hỏng')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Giao hàng trễ')).toBeInTheDocument());
  });

  it('filters complaints by search text', async () => {
    const user = userEvent.setup();
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'customer@example.com', title: 'Sản phẩm hư hỏng', content: 'Nội dung 1', status: 'Pending' as const, createdAt: '2025-06-15T10:00:00Z' },
      { id: 'c2', userId: 'u2', userEmail: 'a@b.com', title: 'Giao hàng trễ', content: 'Nội dung 2', status: 'Pending' as const, createdAt: '2025-06-14T10:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Sản phẩm hư hỏng')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tiêu đề, nội dung, email khách hàng...');
    await user.type(searchInput, 'hư hỏng');

    expect(screen.getByText('Sản phẩm hư hỏng')).toBeInTheDocument();
    expect(screen.queryByText('Giao hàng trễ')).not.toBeInTheDocument();
  });

  it('filters complaints by status filter buttons — Pending', async () => {
    const user = userEvent.setup();
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'a@b.com', title: 'Khiếu nại đang chờ', content: 'Nội dung', status: 'Pending' as const, createdAt: '2025-06-15T10:00:00Z' },
      { id: 'c2', userId: 'u2', userEmail: 'a@b.com', title: 'Khiếu nại đã xử lý', content: 'Nội dung', status: 'Resolved' as const, createdAt: '2025-06-14T10:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Khiếu nại đang chờ')).toBeInTheDocument());

    const pendingBtn = screen.getByRole('button', { name: /Đang chờ/i });
    await user.click(pendingBtn);

    expect(screen.getByRole('heading', { name: 'Khiếu nại đang chờ' })).toBeInTheDocument();
    expect(screen.queryByText('Khiếu nại đã xử lý')).not.toBeInTheDocument();
  });

  it('shows "Đã xử lý" badge for resolved complaints', async () => {
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'a@b.com', title: 'Resolved Complaint', content: 'Resolved', status: 'Resolved' as const, createdAt: '2025-06-15T10:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Đã xử lý')).toBeInTheDocument());
  });

  it('shows "Đang chờ" badge for pending complaints', async () => {
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'a@b.com', title: 'Pending Complaint', content: 'Pending', status: 'Pending' as const, createdAt: '2025-06-15T10:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Đang chờ')).toBeInTheDocument());
  });

  it('shows detail form when a pending complaint is clicked', async () => {
    const user = userEvent.setup();
    const mockComplaints = [
      { id: 'c1', userId: 'u1', userEmail: 'a@b.com', title: 'Test Title', content: 'Test content', status: 'Pending' as const, createdAt: '2025-06-15T10:00:00Z' },
    ];
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(mockComplaints);
    renderComplaintsPage();

    await waitFor(() => expect(screen.getByText('Test Title')).toBeInTheDocument());
    await user.click(screen.getByText('Test Title'));

    await waitFor(() => expect(screen.getByText('Nhập phản hồi cho khách hàng')).toBeInTheDocument());
  });

  it('clicking refresh calls getAllComplaints again', async () => {
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([]);
    renderComplaintsPage();

    await waitFor(() => expect(screen.getByText('Làm mới')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText('Làm mới'));
    expect(complaintService.getAllComplaints).toHaveBeenCalled();
  });
});
