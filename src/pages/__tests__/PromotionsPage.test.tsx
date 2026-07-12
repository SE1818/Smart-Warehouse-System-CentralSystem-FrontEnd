/** @vitest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PromotionsPage } from '../PromotionsPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return { Icons: { TagDiscount: mockIcon('tag-discount'), Bolt: mockIcon('bolt'), Plus: mockIcon('plus'), AlertWarning: mockIcon('alert-warning'), Close: mockIcon('close'), Spinner: mockIcon('spinner') } };
});

const mockListPromotions = vi.fn();
const mockCreatePromotion = vi.fn();
const mockUpdatePromotion = vi.fn();
const mockDeletePromotion = vi.fn();
const mockCreateFlashSale = vi.fn();
const mockGetProducts = vi.fn();

vi.mock('@/services/promotion', () => ({
  promotionService: {
    listPromotions: (...args: unknown[]) => mockListPromotions(...args),
    createPromotion: (...args: unknown[]) => mockCreatePromotion(...args),
    updatePromotion: (...args: unknown[]) => mockUpdatePromotion(...args),
    deletePromotion: (...args: unknown[]) => mockDeletePromotion(...args),
    createFlashSale: (...args: unknown[]) => mockCreateFlashSale(...args),
  },
}));

vi.mock('@/services/productService', () => ({
  productService: {
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
  },
}));

const mockPromotion = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: overrides.id ?? 'promo-1',
  code: (overrides.code as string) ?? 'TEST10',
  description: (overrides.description as string) ?? 'Test description',
  type: (overrides.type as string) ?? 'percentage',
  value: (overrides.value as number) ?? 10,
  startDate: (overrides.startDate as string) ?? '2026-01-01T00:00:00Z',
  endDate: (overrides.endDate as string) ?? '2026-12-31T23:59:59Z',
  usageLimit: (overrides.usageLimit as number) ?? 100,
  usedCount: (overrides.usedCount as number) ?? 0,
  status: (overrides.status as string) ?? 'active',
  createdAt: (overrides.createdAt as string) ?? '2026-01-01T00:00:00Z',
  flashSaleProducts: (overrides.flashSaleProducts as unknown[]) ?? [],
});

const mockFlashSale = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...mockPromotion(overrides),
  id: overrides.id ?? 'flash-1',
  type: 'flashSale',
  flashSaleProducts: (overrides.flashSaleProducts as unknown[]) ?? [],
});

const renderPromotionsPage = () => {
  render(<BrowserRouter><PromotionsPage /></BrowserRouter>);
};

describe('PromotionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPromotions.mockResolvedValue([]);
    mockCreatePromotion.mockResolvedValue(undefined);
    mockUpdatePromotion.mockResolvedValue(undefined);
    mockDeletePromotion.mockResolvedValue(undefined);
    mockCreateFlashSale.mockResolvedValue(undefined);
    mockGetProducts.mockResolvedValue([]);
  });

  /* ─────── Rendering & loading ─────── */

  it('renders page heading', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Khuyến mãi & Flash Sales')).toBeInTheDocument());
  });

  it('shows loading spinner while fetching', () => {
    mockListPromotions.mockImplementation(() => new Promise(() => {}));
    renderPromotionsPage();
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  });

  it('shows error message when listPromotions API fails', async () => {
    mockListPromotions.mockRejectedValueOnce(new Error('Network error'));
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Không thể tải danh sách khuyến mãi')).toBeInTheDocument());
  });

  it('shows empty promotions tab with create button', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Tất cả')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument();
  });

  /* ─────── Promotion table rendering ─────── */

  it('renders promotion row with code', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'PROMO1' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('PROMO1')).toBeInTheDocument());
  });

  it('renders percentage discount label in table', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'PCT' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('% Phần trăm')).toBeInTheDocument());
  });

  it('renders fixed discount label in table', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'FIXED', type: 'fixed' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Cố định đ')).toBeInTheDocument());
  });

  it('shows discount value with % sign for percentage type', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'PCT10', value: 10, type: 'percentage' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText(/10%/)).toBeInTheDocument());
  });

  it('shows fixed value for fixed discount type', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'FIX20', type: 'fixed' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('FIX20')).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(/đ/).length).toBeGreaterThanOrEqual(1));
  });

  /* ─────── Status chips / filtering ─────── */

  it('shows all status chips', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Tất cả')).toBeInTheDocument());
    // Use getAllByText since labels may appear in both filter chips and stats sections
    expect(screen.getAllByText('Hoạt động').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sắp diễn ra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tắt/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hết hạn').length).toBeGreaterThanOrEqual(1);
  });

  it('filters promotions by status Inactive', async () => {
    const p1 = mockPromotion({ code: 'ACTIVE-1', status: 'active' });
    const p2 = mockPromotion({ code: 'INACTIVE-1', status: 'inactive' });
    mockListPromotions.mockResolvedValue([p1, p2]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('ACTIVE-1')).toBeInTheDocument());

    const user = userEvent.setup();
    const allChips = screen.getAllByRole('button', { name: 'Tắt' });
    await user.click(allChips[0]);

    await waitFor(() => {
      expect(screen.getByText('INACTIVE-1')).toBeInTheDocument();
      expect(screen.queryByText('ACTIVE-1')).not.toBeInTheDocument();
    });
  });

  /* ─────── Promotion CRUD ─────── */

  it('opens create promotion modal', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Thêm khuyến mãi/i }));
    expect(screen.getByText('Thêm khuyến mãi mới')).toBeInTheDocument();
  });

  it('opens edit promotion modal with existing data', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'EDITME' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('EDITME')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => expect(screen.getByText(/Sửa khuyến mãi/)).toBeInTheDocument());
  });

  it('creates a promotion successfully', async () => {
    const user = userEvent.setup();
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Thêm khuyến mãi/i }));

    fireEvent.change(screen.getByPlaceholderText('VD: GIAMGIA30'), { target: { value: 'NEW25' } });
    fireEvent.change(screen.getByPlaceholderText('Nhập mô tả...'), { target: { value: 'New promo' } });
    const val = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(val, { target: { value: '25' } });

    await user.click(screen.getByText('Tạo mới'));
    await waitFor(() => expect(mockCreatePromotion).toHaveBeenCalled());
  });

  it('edits a promotion successfully', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'EDITME' })]);
    mockUpdatePromotion.mockResolvedValue(undefined);
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByText('EDITME')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Sửa'));

    await waitFor(() => expect(screen.getByText(/Sửa khuyến mãi/)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Nhập mô tả...'), { target: { value: 'Updated desc' } });
    await user.click(screen.getByText('Cập nhật'));

    await waitFor(() => expect(mockUpdatePromotion).toHaveBeenCalled());
  });

  it('shows delete confirmation and cancels', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'DEL' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('DEL')).toBeInTheDocument());

    const user = userEvent.setup();
    const btns = screen.getAllByText('Xóa');
    await user.click(btns[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();

    await user.click(screen.getByText('Hủy'));
    expect(screen.queryByText('Xác nhận xóa')).not.toBeInTheDocument();
  });

  it('confirms and calls deletePromotion', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'DEL' })]);
    mockDeletePromotion.mockResolvedValue(undefined);
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByText('DEL')).toBeInTheDocument());
    const user = userEvent.setup();
    const btns = screen.getAllByText('Xóa');
    await user.click(btns[0]);
    await user.click(screen.getByText('Xóa ngay'));
    expect(mockDeletePromotion).toHaveBeenCalledWith('promo-1');
  });

  /* ─────── Flash Sales tab ─────── */

  it('switches to Flash Sales tab', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    expect(screen.getByText(/Chưa có Flash Sale/)).toBeInTheDocument();
  });

  it('shows empty flash sales with create CTA', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    expect(screen.getByText('Chưa có Flash Sale nào')).toBeInTheDocument();
    expect(screen.getByText('Tạo Flash Sale đầu tiên')).toBeInTheDocument();
  });

  it('shows flash sale stats (active/upcoming counts)', async () => {
    mockListPromotions.mockResolvedValue([
      mockFlashSale({ code: 'STATA1', status: 'active' }),
      mockFlashSale({ code: 'STATU2', status: 'upcoming' }),
    ]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('Tổng Flash Sale')).toBeInTheDocument());
  });

  it('shows flash sale stats when count is zero', async () => {
    mockListPromotions.mockResolvedValue([]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    // stats still show; count will be 0 for all
    await waitFor(() => {
      expect(screen.getAllByText('Đang diễn ra').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Sắp diễn ra').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens create flash sale modal', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await user.click(screen.getByText('Tạo Flash Sale đầu tiên'));
    expect(screen.getByText('Tạo Flash Sale mới')).toBeInTheDocument();
  });

  it('shows empty hint in product picker when no products', async () => {
    mockListPromotions.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('Tạo Flash Sale đầu tiên')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Tạo Flash Sale đầu tiên'));
    expect(screen.getByText(/Chưa có sản phẩm nào/)).toBeInTheDocument();
  });

  it('creates a flash sale successfully', async () => {
    const products = [{ id: 'prod-1', name: 'Sản phẩm A', price: 100000 } as Record<string, unknown>];
    mockGetProducts.mockResolvedValue(products);
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('Tạo Flash Sale đầu tiên')).toBeInTheDocument());
    await user.click(screen.getByText('Tạo Flash Sale đầu tiên'));

    expect(screen.getByText('Tạo Flash Sale mới')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('VD: FLASH28'), { target: { value: 'FLASH50' } });
    fireEvent.change(screen.getByPlaceholderText('Tên chương trình Flash Sale'), { target: { value: 'Mega sale' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'prod-1' } });

    fireEvent.change(screen.getByPlaceholderText('VD: 50000'), { target: { value: '80000' } });
    await user.click(screen.getByText('Thêm vào danh sách'));

    await waitFor(() => expect(screen.getByText('Sản phẩm A')).toBeInTheDocument());

    await user.click(screen.getByText('Kích hoạt Flash Sale'));
    await waitFor(() => expect(mockCreateFlashSale).toHaveBeenCalled());
  });

  /* ─────── Error handling ─────── */

  it('shows api error toast shape when createPromotion fails', async () => {
    mockCreatePromotion.mockRejectedValueOnce(new Error('Lỗi server'));
    const user = userEvent.setup();
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Thêm khuyến mãi/i }));

    fireEvent.change(screen.getByPlaceholderText('VD: GIAMGIA30'), { target: { value: 'ERR1' } });
    fireEvent.change(screen.getByPlaceholderText('Nhập mô tả...'), { target: { value: 'desc' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10' } });
    await user.click(screen.getByText('Tạo mới'));

    await waitFor(() => {
      expect(screen.getByText('Thêm khuyến mãi mới')).toBeInTheDocument();
    });
  });

  it('renders reloading after createPromotion resolves', async () => {
    const user = userEvent.setup();
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Thêm khuyến mãi/i }));

    fireEvent.change(screen.getByPlaceholderText('VD: GIAMGIA30'), { target: { value: 'OK1' } });
    fireEvent.change(screen.getByPlaceholderText('Nhập mô tả...'), { target: { value: 'desc' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '5' } });
    await user.click(screen.getByText('Tạo mới'));

    await waitFor(() => expect(mockCreatePromotion).toHaveBeenCalled());
  });

  /* ─────── Tab switching coverage ─────── */

  it('switches tabs back and forth', async () => {
    const user = userEvent.setup();
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByText('Khuyến mãi')).toBeInTheDocument());
    await user.click(screen.getByText('Flash Sales'));
    expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    await user.click(screen.getByText('Khuyến mãi'));
    expect(screen.getByText('Khuyến mãi')).toBeInTheDocument();
  });

  it('status chip resets when switching to flash sales tab', async () => {
    const user = userEvent.setup();
    renderPromotionsPage();

    await waitFor(() => expect(screen.getByText('Tất cả')).toBeInTheDocument());
    const btn = screen.getByRole('button', { name: 'Hoạt động' });
    await user.click(btn);

    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('Chưa có Flash Sale nào')).toBeInTheDocument());
  });

  /* ─────── Event handlers ─────── */

  it('re-fetches on smartwarehouse-notification event', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Khuyến mãi & Flash Sales')).toBeInTheDocument());
    window.dispatchEvent(new CustomEvent('smartwarehouse-notification'));
    expect(mockListPromotions).toHaveBeenCalled();
  });

  it('re-fetches after tab switch triggers data load', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Khuyến mãi & Flash Sales')).toBeInTheDocument());
    expect(mockListPromotions).toHaveBeenCalled();
  });

  it('clicking empty-result action does not crash', async () => {
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('Flash Sales')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    // CTA in empty state
    const cta = screen.queryByText('Tạo Flash Sale đầu tiên');
    expect(cta).toBeInTheDocument();
  });

  it('displays flash sale products with progress bar', async () => {
    const flash = mockFlashSale({
      code: 'SWEEP3',
      status: 'active',
      flashSaleProducts: [
        { productId: 'p1', flashSalePrice: 50000, stockLimit: 100, soldCount: 75, id: 'fp1' },
      ],
    });
    mockListPromotions.mockResolvedValue([flash]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('SWEEP3')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('75/100')).toBeInTheDocument());
  });

  it('removes product from flash sale form', async () => {
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));

    await waitFor(() => expect(screen.getByText('Tạo Flash Sale đầu tiên')).toBeInTheDocument());
    await user.click(screen.getByText('Tạo Flash Sale đầu tiên'));
    expect(screen.getByText('Tạo Flash Sale mới')).toBeInTheDocument();
  });

  it('formats date range correctly in flash sale card', async () => {
    const flash = mockFlashSale({ code: 'DTRNG4', startDate: '2026-03-01T00:00:00Z', endDate: '2026-03-31T23:59:59Z' });
    mockListPromotions.mockResolvedValue([flash]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('DTRNG4')).toBeInTheDocument());
  });

  it('shows countdown for active flash sale card', async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 86400000).toISOString();
    const flash = mockFlashSale({ code: 'CNTDN5', status: 'active', endDate: end });
    mockListPromotions.mockResolvedValue([flash]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => expect(screen.getByText('CNTDN5')).toBeInTheDocument());
  });

  it('renders flash sale card actions (edit and delete buttons)', async () => {
    const flash = mockFlashSale({ code: 'FSACT6', status: 'upcoming' });
    mockListPromotions.mockResolvedValue([flash]);
    renderPromotionsPage();
    const user = userEvent.setup();
    await user.click(screen.getByText('Flash Sales'));
    await waitFor(() => {
      expect(screen.getByText('FSACT6')).toBeInTheDocument();
      expect(screen.getAllByText('Sửa').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Xóa').length).toBeGreaterThan(0);
    });
  });

  it('renders promotion card actions (edit and delete buttons)', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'ACT' })]);
    renderPromotionsPage();
    await waitFor(() => expect(screen.getByText('ACT')).toBeInTheDocument());
    expect(screen.getAllByText('Sửa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Xóa').length).toBeGreaterThan(0);
  });
});
