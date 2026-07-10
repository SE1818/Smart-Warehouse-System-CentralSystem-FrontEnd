/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StockAdjustmentsPage } from '../StockAdjustmentsPage';
import { stockService } from '@/services/stock';
import type { Warehouse, Product, StockLevel } from '@/types/stock';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Icons', () => ({
  Icons: {
    AdjustmentSettings: () => <span data-testid="icon-adjustment-settings" />,
    Folder: () => <span data-testid="icon-folder" />,
    AlertWarning: () => <span data-testid="icon-alert-warning" />,
    SuccessCheck: () => <span data-testid="icon-success-check" />,
    Spinner: () => <span data-testid="icon-spinner" />,
    Info: () => <span data-testid="icon-info" />,
    AnalyticsReport: () => <span data-testid="icon-analytics" />,
  },
}));

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: ({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; label?: string }) => (
    <div>
      {label && <label>{label}</label>}
      <select data-testid="custom-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  ),
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockWarehouses: Warehouse[] = [
  { id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội', isActive: true, createdAt: '2024-01-01' },
];

const mockProducts: Product[] = [
  { id: 'p1', sku: 'SKU001', name: 'Sản phẩm A', description: 'Mô tả', price: 10000, stockQuantity: 50, imageUrl: '', category: '', unit: 'pcs', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockLevels: StockLevel[] = [
  {
    id: 'sl1', warehouseId: 'w1', productId: 'p1', quantity: 100, reservedQuantity: 10, updatedAt: '2024-01-01',
    warehouse: { id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội', isActive: true, createdAt: '2024-01-01' } as Warehouse,
    product: { id: 'p1', sku: 'SKU001', name: 'Sản phẩm A', description: 'Mô tả', price: 10000, stockQuantity: 50, imageUrl: '', category: '', unit: 'pcs', createdAt: '2024-01-01', updatedAt: '2024-01-01' } as Product,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderStockAdjustments() {
  return render(
    <BrowserRouter>
      <StockAdjustmentsPage />
    </BrowserRouter>
  );
}

function setupMocks(levels: StockLevel[] = mockLevels) {
  vi.spyOn(stockService, 'getWarehouses').mockResolvedValue(mockWarehouses);
  vi.spyOn(stockService, 'getProducts').mockResolvedValue(mockProducts);
  vi.spyOn(stockService, 'getStockLevels').mockResolvedValue(levels);
  vi.spyOn(stockService, 'adjustStock').mockResolvedValue({ quantity: 95 } as StockLevel);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockAdjustmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders heading "Điều chỉnh tồn kho"', async () => {
    setupMocks();
    renderStockAdjustments();

    await waitFor(() => {
      expect(screen.getByText('Điều chỉnh tồn kho')).toBeDefined();
    });
  });

  it('renders form section with labels after data loads', async () => {
    setupMocks();
    renderStockAdjustments();

    await waitFor(() => {
      expect(screen.getByText('Form điều chỉnh')).toBeDefined();
    });

    expect(screen.getByText('Kho hàng')).toBeDefined();
    expect(screen.getByText('Sản phẩm')).toBeDefined();
    expect(screen.getByText('Loại điều chỉnh')).toBeDefined();
  });

  it('renders warehouse and product selects after loading', async () => {
    setupMocks();
    renderStockAdjustments();

    await waitFor(() => {
      expect(screen.queryByTestId('icon-spinner')).toBeNull();
    });

    const selects = screen.getAllByTestId('custom-select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders adjustment form section with labels', async () => {
    setupMocks();
    renderStockAdjustments();

    await waitFor(() => {
      expect(screen.getByText('Form điều chỉnh')).toBeDefined();
    });

    expect(screen.getByText('Kho hàng')).toBeDefined();
    expect(screen.getByText('Sản phẩm')).toBeDefined();
    expect(screen.getByText('Loại điều chỉnh')).toBeDefined();
  });
});
