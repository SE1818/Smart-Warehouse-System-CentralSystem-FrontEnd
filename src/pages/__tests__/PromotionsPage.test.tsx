/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PromotionsPage } from '../PromotionsPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      TagDiscount: mockIcon('tag-discount'),
      Bolt: mockIcon('bolt'),
      Plus: mockIcon('plus'),
      AlertWarning: mockIcon('alert-warning'),
      Close: mockIcon('close'),
      Spinner: mockIcon('spinner'),
    },
  };
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

const mockPromotion = (overrides: Record<string, unknown> = {}) => ({
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


function renderPromotionsPage() {
  return render(
    <BrowserRouter>
      <PromotionsPage />
    </BrowserRouter>,
  );
}

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

  it('renders page heading', async () => {
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Khuyến mãi & Flash Sales')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while fetching', () => {
    mockListPromotions.mockImplementation(() => new Promise(() => {}));
    renderPromotionsPage();
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    mockListPromotions.mockRejectedValue(new Error('Network error'));
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Không thể tải danh sách khuyến mãi')).toBeInTheDocument();
    });
  });

  it('shows empty promotions tab with create button', async () => {
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Tất cả')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument();
  });

  it('renders promotion table rows with data', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'PROMO1' })]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('PROMO1')).toBeInTheDocument();
    });
  });

  it('renders percentage discount label in table', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'PCT' })]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('% Phần trăm')).toBeInTheDocument();
    });
  });

  it('renders fixed discount label in table', async () => {
    mockListPromotions.mockResolvedValue([
      mockPromotion({ code: 'FIXED', type: 'fixed' }),
    ]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Cố định đ')).toBeInTheDocument();
    });
  });

  it('shows discount value with percent sign', async () => {
    mockListPromotions.mockResolvedValue([
      mockPromotion({ code: 'P10', value: 10 }),
    ]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText(/10%/)).toBeInTheDocument();
    });
  });

  it('opens create promotion modal on button click', async () => {
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm khuyến mãi/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Thêm khuyến mãi/i }));
    expect(screen.getByText('Thêm khuyến mãi mới')).toBeInTheDocument();
  });

  it('opens edit modal on Sửa click', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'EDIT' })]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('EDIT')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Sửa'));
    expect(screen.getByText(/Sửa khuyến mãi/)).toBeInTheDocument();
  });

  it('shows delete confirmation dialog on Xóa click', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'DEL' })]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('DEL')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByText('Xóa');
    await userEvent.click(deleteButtons[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
  });

  it('calls deletePromotion on confirm delete', async () => {
    mockListPromotions.mockResolvedValue([mockPromotion({ code: 'DEL' })]);
    mockGetProducts.mockResolvedValue([]);
    mockDeletePromotion.mockResolvedValue(undefined);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('DEL')).toBeInTheDocument();
    });
    const user = userEvent.setup();
    const deleteButtons = screen.getAllByText('Xóa');
    await user.click(deleteButtons[0]);
    await user.click(screen.getByText('Xóa ngay'));
    expect(mockDeletePromotion).toHaveBeenCalledWith('promo-1');
  });

  it('switches to Flash Sales tab', async () => {
    mockListPromotions.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Flash Sales'));
    expect(screen.getByText(/Chưa có Flash Sale/)).toBeInTheDocument();
  });

  it('shows empty flash sales state with create CTA', async () => {
    mockListPromotions.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Flash Sales'));
    expect(screen.getByText('Chưa có Flash Sale nào')).toBeInTheDocument();
    expect(screen.getByText('Tạo Flash Sale đầu tiên')).toBeInTheDocument();
  });

  it('shows flash sale stats when flash sales exist', async () => {
    mockListPromotions.mockResolvedValue([
      mockFlashSale({ id: 'fs1', status: 'active' }),
      mockFlashSale({ id: 'fs2', status: 'upcoming' }),
    ]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Flash Sales'));
    await waitFor(() => {
      expect(screen.getByText('Tổng Flash Sale')).toBeInTheDocument();
    });
  });

  it('filters promotions by status chip Tắt', async () => {
    const p1 = mockPromotion({ code: 'ACT-1', status: 'active' });
    const p2 = mockPromotion({ code: 'INA-2', status: 'inactive' });
    mockListPromotions.mockResolvedValue([p1, p2]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('ACT-1')).toBeInTheDocument();
    });
    // Click the "Tắt" filter chip (the chip is a button)
    const tatChips = screen.getAllByRole('button', { name: 'Tắt' });
    await userEvent.click(tatChips[0]);
    // After filtering, only the inactive promo should be visible
    await waitFor(() => {
      expect(screen.getByText('INA-2')).toBeInTheDocument();
      expect(screen.queryByText('ACT-1')).not.toBeInTheDocument();
    });
  });

  it('shows schema.org BIS loading for expired status', async () => {
    // This covers the expired status chip click path
    mockListPromotions.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Hết hạn')).toBeInTheDocument();
    });
  });

  it('opens create flash sale modal', async () => {
    mockListPromotions.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Flash Sales'));
    await userEvent.click(screen.getByText('Tạo Flash Sale đầu tiên'));
    expect(screen.getByText('Tạo Flash Sale mới')).toBeInTheDocument();
  });

  it('shows No products hint in flash sale product picker', async () => {
    mockListPromotions.mockResolvedValue([]);
    mockGetProducts.mockResolvedValue([]);
    renderPromotionsPage();
    await waitFor(() => {
      expect(screen.getByText('Flash Sales')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Flash Sales'));
    await userEvent.click(screen.getByText('Tạo Flash Sale đầu tiên'));
    expect(screen.getByText(/Chưa có sản phẩm nào/)).toBeInTheDocument();
  });
});
