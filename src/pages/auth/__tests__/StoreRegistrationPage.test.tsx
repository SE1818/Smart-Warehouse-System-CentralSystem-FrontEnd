import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StoreRegistrationPage } from '../StoreRegistrationPage';

vi.mock('@/components/Icons', () => {
  const MockIcon = () => <span data-testid="icon" />;
  return { Icons: { Truck: MockIcon, Spinner: MockIcon, Plus: MockIcon, Search: MockIcon, Close: MockIcon, Store: MockIcon, User: MockIcon, Mail: MockIcon, Phone: MockIcon, Calendar: MockIcon, Check: MockIcon, AlertWarning: MockIcon, Info: MockIcon, Folder: MockIcon, MapPin: MockIcon, Navigation: MockIcon, Eye: MockIcon, Trash: MockIcon, Edit: MockIcon, Home: MockIcon, Box: MockIcon, Settings: MockIcon, Logout: MockIcon, Menu: MockIcon, ChevronDown: MockIcon, Bell: MockIcon, FileText: MockIcon, Warehouse: MockIcon, Product: MockIcon, Package: MockIcon, Route: MockIcon, Archive: MockIcon, ClipboardList: MockIcon } };
});

vi.mock('@/services', () => ({
  storeService: {
    registerStore: vi.fn(),
  },
  robotService: {
    getAreas: vi.fn(),
    getStations: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

import { storeService, robotService } from '@/services';
import { toast } from 'react-toastify';

function renderStoreRegistration() {
  return render(
    <MemoryRouter>
      <StoreRegistrationPage />
    </MemoryRouter>
  );
}

describe('StoreRegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
    vi.mocked(toast.warning).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(storeService.registerStore).mockClear();
    vi.mocked(robotService.getAreas).mockClear();
    vi.mocked(robotService.getStations).mockClear();
  });

  it('renders all form fields', async () => {
    vi.mocked(robotService.getAreas).mockResolvedValueOnce([
      { id: 'area-1', name: 'Khu vực chính', level: 1 },
    ]);
    vi.mocked(robotService.getStations).mockResolvedValueOnce([
      { id: 'station-1', name: 'ST01', areaId: 'area-1', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
    ]);

    renderStoreRegistration();
    await waitFor(() => {
      expect(screen.getByText('Đăng ký mở cửa hàng')).toBeDefined();
    });
    expect(screen.getByText('Tên cửa hàng')).toBeDefined();
    expect(screen.getByText('Tên chủ sở hữu')).toBeDefined();
    expect(screen.getByText('Email liên hệ')).toBeDefined();
    expect(screen.getByText('Số điện thoại')).toBeDefined();
    expect(screen.getByText('Khu vực')).toBeDefined();
    expect(screen.getByText('Trạm liên kết')).toBeDefined();
  });

  it('uses fallback data when API fails', async () => {
    vi.mocked(robotService.getAreas).mockRejectedValueOnce(new Error('fail'));
    vi.mocked(robotService.getStations).mockRejectedValueOnce(new Error('fail'));

    renderStoreRegistration();
    await waitFor(() => {
      expect(screen.getByText('Đăng ký mở cửa hàng')).toBeDefined();
    });
    expect(screen.getByText('Khu vực chính (Mặc định)')).toBeDefined();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('submit calls registerStore with correct data', async () => {
    vi.mocked(robotService.getAreas).mockResolvedValueOnce([
      { id: 'area-1', name: 'Khu A', level: 1 },
    ]);
    vi.mocked(robotService.getStations).mockResolvedValueOnce([
      { id: 'st-1', name: 'ST01', areaId: 'area-1', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
    ]);
    vi.mocked(storeService.registerStore).mockResolvedValueOnce({ message: 'OK' });

    renderStoreRegistration();
    await waitFor(() => {
      expect(screen.getByText('Đăng ký mở cửa hàng')).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText('Ví dụ: Cửa hàng Tiện Lợi 247') as HTMLInputElement;
    const ownerInput = screen.getByPlaceholderText('Ví dụ: Nguyễn Văn A') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('chu_cua_hang@gmail.com') as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText('0987654321') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Cửa hàng Test' } });
    fireEvent.change(ownerInput, { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } });
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    const form = screen.getByText('Gửi yêu cầu đăng ký').closest('button')!.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(storeService.registerStore).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
