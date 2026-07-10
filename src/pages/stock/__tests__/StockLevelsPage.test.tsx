/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StockLevelsPage } from '../StockLevelsPage';
import { stockService } from '@/services/stock';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Icons', () => ({
  Icons: {
    StockBox: () => <span data-testid="icon-stock-box" />,
    Refresh: () => <span data-testid="icon-refresh" />,
    Warehouse: () => <span data-testid="icon-warehouse" />,
    Spinner: () => <span data-testid="icon-spinner" />,
    AlertWarning: () => <span data-testid="icon-alert-warning" />,
    Product: () => <span data-testid="icon-product" />,
  },
}));

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: ({ options, value }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) => (
    <select data-testid="custom-select" value={value} onChange={() => {}}>
      {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderStockLevels() {
  return render(
    <BrowserRouter>
      <StockLevelsPage />
    </BrowserRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockLevelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders heading "Tồn kho hiện tại"', async () => {
    // Spy on the real module methods
    const spyLevels = vi.spyOn(stockService, 'getStockLevels').mockResolvedValue([]);
    const spyWh = vi.spyOn(stockService, 'getWarehouses').mockResolvedValue([]);
    const spyProd = vi.spyOn(stockService, 'getProducts').mockResolvedValue([]);

    renderStockLevels();

    await waitFor(() => {
      expect(screen.getByText('Tồn kho hiện tại')).toBeDefined();
    });

    spyLevels.mockRestore();
    spyWh.mockRestore();
    spyProd.mockRestore();
  });

  it('shows loading spinner initially', async () => {
    const spyLevels = vi.spyOn(stockService, 'getStockLevels').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderStockLevels();

    expect(screen.getByText('Đang tải dữ liệu tồn kho...')).toBeDefined();

    spyLevels.mockRestore();
  });

  it('renders warehouse table after loading', async () => {
    const spyLevels = vi.spyOn(stockService, 'getStockLevels').mockResolvedValue([
      {
        id: 'sl1',
        warehouseId: 'w1',
        productId: 'p1',
        quantity: 100,
        reservedQuantity: 10,
        product: { id: 'p1', sku: 'SKU001', name: 'Sản phẩm A', description: '', price: 100000, stockQuantity: 50 },
        warehouse: { id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội' },
      },
    ]);
    const spyWh = vi.spyOn(stockService, 'getWarehouses').mockResolvedValue([{ id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội', isActive: true }]);
    const spyProd = vi.spyOn(stockService, 'getProducts').mockResolvedValue([{ id: 'p1', sku: 'SKU001', name: 'Sản phẩm A', description: '', price: 10000 }]);

    renderStockLevels();

    await waitFor(() => {
      expect(screen.getByText('Kho chính')).toBeDefined();
    });

    spyLevels.mockRestore();
    spyWh.mockRestore();
    spyProd.mockRestore();
  });

  it('shows empty state when no stock levels', async () => {
    const spyLevels = vi.spyOn(stockService, 'getStockLevels').mockResolvedValue([]);
    const spyWh = vi.spyOn(stockService, 'getWarehouses').mockResolvedValue([]);
    const spyProd = vi.spyOn(stockService, 'getProducts').mockResolvedValue([]);

    renderStockLevels();

    await waitFor(() => {
      expect(screen.getByText('Không có dữ liệu tồn kho nào')).toBeDefined();
    });

    spyLevels.mockRestore();
    spyWh.mockRestore();
    spyProd.mockRestore();
  });
});
