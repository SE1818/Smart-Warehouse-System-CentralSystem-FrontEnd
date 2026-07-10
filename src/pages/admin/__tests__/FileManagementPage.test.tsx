import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { FileManagementPage } from '../FileManagementPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Folder: mockIcon('folder'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Plus: mockIcon('plus'),
      AlertWarning: mockIcon('alert-warning'),
      Refresh: mockIcon('refresh'),
      Search: mockIcon('search'),
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
      UsersGroup: mockIcon('users-group'),
      Product: mockIcon('product'),
      CartOrder: mockIcon('cartorder'),
      Dashboard: mockIcon('dashboard'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
      Robot: mockIcon('robot'),
      Warehouse: mockIcon('warehouse'),
    },
  };
});

vi.mock('@/services/file', () => ({
  fileService: {
    listFiles: vi.fn(),
    deleteFile: vi.fn(),
    uploadProductImage: vi.fn(),
    uploadReceipt: vi.fn(),
    uploadAvatar: vi.fn(),
  },
  FileSubFolder: {
    Products: 'products',
    Receipts: 'receipts',
    Avatars: 'avatars',
    Root: '',
  },
}));

import { fileService } from '@/services/file';

const renderFileManagementPage = () => {
  render(<BrowserRouter><FileManagementPage /></BrowserRouter>);
};

describe('FileManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Quản lý File" heading', () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: 'root',
      count: 0,
      files: [],
    });
    renderFileManagementPage();
    expect(screen.getByText('Quản lý File')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(fileService.listFiles).mockImplementation(() => new Promise(() => {}));
    renderFileManagementPage();
    expect(screen.getByText('Đang tải danh sách file...')).toBeInTheDocument();
  });

  it('shows empty state when no files', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Thư mục hiện tại đang trống')).toBeInTheDocument();
    });
  });

  it('renders subfolder tabs: Sản phẩm, Hóa đơn, Avatar, Tất cả', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    });
    expect(screen.getByText('Hóa đơn')).toBeInTheDocument();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
  });

  it('renders file name and URL in table when files exist', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 2,
      files: [
        { fileName: 'document.pdf', url: 'http://localhost:5000/api/v1/files/document.pdf' },
        { fileName: 'image.png', url: 'http://localhost:5000/api/v1/files/image.png' },
      ],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('image.png')).toBeInTheDocument();
    });
  });

  it('renders "Tải xuống" download button for each file', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 1,
      files: [
        { fileName: 'doc.pdf', url: 'http://localhost:5000/api/v1/files/doc.pdf' },
      ],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Tải xuống')).toBeInTheDocument();
    });
  });

  it('renders "Xóa" delete button for each file', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 1,
      files: [
        { fileName: 'doc.pdf', url: 'http://localhost:5000/api/v1/files/doc.pdf' },
      ],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xóa')).toBeInTheDocument();
    });
  });

  it('calls deleteFile and refreshes list when "Xóa" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(fileService.deleteFile).mockResolvedValue(undefined);
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 1,
      files: [
        { fileName: 'doc.pdf', url: 'http://localhost:5000/api/v1/files/doc.pdf' },
      ],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xóa')).toBeInTheDocument();
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByText('Xóa'));

    expect(fileService.deleteFile).toHaveBeenCalledWith('doc.pdf');
    expect(fileService.listFiles).toHaveBeenCalledTimes(2); // initial + refresh
    confirmSpy.mockRestore();
  });

  it('does NOT delete when confirm is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(fileService.deleteFile).mockResolvedValue(undefined);
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 1,
      files: [
        { fileName: 'doc.pdf', url: 'http://localhost:5000/api/v1/files/doc.pdf' },
      ],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xóa')).toBeInTheDocument();
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByText('Xóa'));

    expect(fileService.deleteFile).not.toHaveBeenCalled();
    expect(fileService.listFiles).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('renders "Upload File mới" section heading', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Upload File mới')).toBeInTheDocument();
    });
  });

  it('renders upload button with "Upload" text', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    });
  });

  it('calls listFiles when switching tabs', async () => {
    const user = userEvent.setup();
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sản phẩm'));
    expect(fileService.listFiles).toHaveBeenCalledWith('products');
  });

  it('calls listFiles on mount with Root tab', async () => {
    vi.mocked(fileService.listFiles).mockResolvedValue({
      subFolder: '',
      count: 0,
      files: [],
    });
    renderFileManagementPage();
    await waitFor(() => {
      expect(fileService.listFiles).toHaveBeenCalledWith(undefined);
    });
  });
});
