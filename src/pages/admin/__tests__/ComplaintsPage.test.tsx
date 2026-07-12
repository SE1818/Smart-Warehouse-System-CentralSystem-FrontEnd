import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { Complaint } from '@/services/complaintService';
import { ComplaintsPage } from '../ComplaintsPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return { Icons: { AlertWarning: mockIcon('alert-warning'), Refresh: mockIcon('refresh'), Search: mockIcon('search'), Spinner: ({ className }: { className?: string }) => <span data-testid="icon-spinner" className={className}>SpinnerIcon</span>, SuccessCheck: mockIcon('success-check'), Close: mockIcon('close'), Plus: mockIcon('plus') } };
});

const allComplaints: Complaint[] = [
  { id: 'c1', userId: 'u1', userEmail: 'customer@example.com', title: 'Product defect', content: 'Details', status: 'Pending', createdAt: '2025-06-15T10:00:00Z' },
  { id: 'c2', userId: 'u2', userEmail: 'admin@test.com', title: 'Late delivery', content: 'More details', status: 'Resolved', createdAt: '2025-06-14T10:00:00Z', adminResponse: 'Đã giải quyết', resolvedAt: '2025-06-15T00:00:00Z' },
  { id: 'c3', userId: 'u3', userEmail: 'store@test.com', title: 'Another issue', content: 'Body', status: 'Pending', createdAt: '2025-06-13T10:00:00Z', attachmentUrl: 'https://example.com/doc.pdf' },
];

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
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue(allComplaints);
    vi.mocked(complaintService.respondToComplaint).mockResolvedValue({} as unknown as Complaint);
  });

  afterEach(() => {
    vi.mocked(complaintService.getAllComplaints).mockReset();
    vi.mocked(complaintService.respondToComplaint).mockReset();
  });

  it('renders page heading', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Quản lý khiếu nại & Hỗ trợ')).toBeInTheDocument());
  });

  it('shows loading state', async () => {
    vi.mocked(complaintService.getAllComplaints).mockImplementation(() => new Promise(() => {}));
    renderComplaintsPage();
    expect(screen.getByText('Đang tải danh sách khiếu nại...')).toBeInTheDocument();
  });

  it('shows empty state when no complaints', async () => {
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([]);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Không tìm thấy khiếu nại nào')).toBeInTheDocument());
  });

  it('renders all complaint items', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Late delivery')).toBeInTheDocument());
    expect(screen.getByText('Another issue')).toBeInTheDocument();
  });

  it('shows both Pending and Resolved badges', async () => {
    renderComplaintsPage();
    await waitFor(() => {
      expect(screen.getByText('Đang chờ')).toBeInTheDocument();
      expect(screen.getByText('Đã xử lý')).toBeInTheDocument();
    });
  });

  it('filters by search — title match', async () => {
    const user = userEvent.setup();
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([allComplaints[0]]);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Tìm kiếm theo tiêu đề/i);
    await user.clear(input);
    await user.type(input, 'defect');
    expect(screen.getByText('Product defect')).toBeInTheDocument();
  });

  it('filters by search — email match', async () => {
    const user = userEvent.setup();
    vi.mocked(complaintService.getAllComplaints).mockResolvedValue([allComplaints[2]]);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Another issue')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Tìm kiếm theo tiêu đề/i);
    await user.clear(input);
    await user.type(input, 'store@test.com');
    expect(screen.getByText('Another issue')).toBeInTheDocument();
  });

  it('filters by search — hides non-matching item', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Late delivery')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Tìm kiếm theo tiêu đề/i);
    await user.clear(input);
    await user.type(input, 'defect');
    expect(screen.getByText('Product defect')).toBeInTheDocument();
    expect(screen.queryByText('Late delivery')).not.toBeInTheDocument();
  });

  it('filters by status — Pending only', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Late delivery')).toBeInTheDocument());
    const btn = screen.getByRole('button', { name: /Đang chờ/i });
    await user.click(btn);
    expect(screen.getByText('Product defect')).toBeInTheDocument();
    expect(screen.queryByText('Late delivery')).not.toBeInTheDocument();
  });

  it('filters by status — Resolved only', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Late delivery')).toBeInTheDocument());
    const btn = screen.getByRole('button', { name: /Đã xử lý/i });
    await user.click(btn);
    expect(screen.getByText('Late delivery')).toBeInTheDocument();
    expect(screen.queryByText('Product defect')).not.toBeInTheDocument();
  });

  it('filters by status — All shows every item', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    const allBtn = screen.getByRole('button', { name: /Tất cả/i });
    await user.click(allBtn);
    expect(screen.getByText('Product defect')).toBeInTheDocument();
    expect(screen.getByText('Late delivery')).toBeInTheDocument();
    expect(screen.getByText('Another issue')).toBeInTheDocument();
  });

  it('shows resolved detail with adminResponse', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Late delivery')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Late delivery'));
    await waitFor(() => expect(screen.getByText('Phản hồi từ Admin')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Đã giải quyết')).toBeInTheDocument());
    expect(screen.queryByText('Nhập phản hồi cho khách hàng')).not.toBeInTheDocument();
  });

  it('shows pending detail with response form', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    await user.click(screen.getByText('Product defect'));
    await waitFor(() => expect(screen.getByText('Nội dung khiếu nại')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Nhập phản hồi cho khách hàng')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Nhập nội dung giải quyết/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Gửi phản hồi/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submits response and updates complaint state', async () => {
    const user = userEvent.setup();
    const updated: Complaint = {
      ...allComplaints[0],
      status: 'Resolved',
      adminResponse: 'Kết quả xử lý',
      resolvedAt: '2025-06-15T12:00:00Z',
    };
    vi.mocked(complaintService.respondToComplaint).mockResolvedValue(updated);
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    await user.click(screen.getByText('Product defect'));
    await waitFor(() => expect(screen.getByText('Nhập phản hồi cho khách hàng')).toBeInTheDocument());

    const txt = screen.getByPlaceholderText(/Nhập nội dung giải quyết/i);
    await user.type(txt, 'Kết quả xử lý');
    await user.click(screen.getByRole('button', { name: /Gửi phản hồi/i }));

    await waitFor(() => expect(complaintService.respondToComplaint).toHaveBeenCalledWith('c1', 'Kết quả xử lý'));
    await waitFor(() => expect(screen.getByText('Kết quả xử lý')).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/Nhập nội dung giải quyết/i)).not.toBeInTheDocument();
  });

  it('does not submit empty response', async () => {
    const user = userEvent.setup();
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    await user.click(screen.getByText('Product defect'));
    await waitFor(() => expect(screen.getByText('Nhập phản hồi cho khách hàng')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Gửi phản hồi/i })).toBeDisabled();
    expect(complaintService.respondToComplaint).not.toHaveBeenCalled();
  });

  it('shows attachment link for complaints with attachmentUrl', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Another issue')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Another issue'));
    await waitFor(() => expect(screen.getByText('Tải xuống / Mở tệp')).toBeInTheDocument());
    const link = screen.getByRole('link', { name: /Tải xuống/i });
    expect(link).toHaveAttribute('href', 'https://example.com/doc.pdf');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not show attachment link when attachmentUrl is empty', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Product defect')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Product defect'));
    await waitFor(() => expect(screen.queryByText('Tải xuống / Mở tệp')).not.toBeInTheDocument());
  });

  it('refresh button re-fetches complaints', async () => {
    renderComplaintsPage();
    await waitFor(() => expect(screen.getByText('Làm mới')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Làm mới'));
    expect(complaintService.getAllComplaints).toHaveBeenCalled();
  });
});
