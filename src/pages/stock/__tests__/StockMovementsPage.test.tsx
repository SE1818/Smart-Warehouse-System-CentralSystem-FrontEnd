/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StockMovementsPage } from '../StockMovementsPage';
import { StockMovementType } from '@/types/stock';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Icons', () => ({ Icons: {
  HistoryLogs: () => <span data-testid="icon-history-logs" />,
  Refresh: () => <span data-testid="icon-refresh" />,
  Warehouse: () => <span data-testid="icon-warehouse" />,
  Product: () => <span data-testid="icon-product" />,
  Filter: () => <span data-testid="icon-filter" />,
  ChartBar: () => <span data-testid="icon-chart" />,
  Spinner: () => <span data-testid="icon-spinner" />,
} }));

vi.mock('@/components/CustomSelect', () => ({ CustomSelect: ({
  value, onChange, options, label,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; label?: string }) => (
  <div>
    {label && <label>{label}</label>}
    <select data-testid="custom-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
), }));

vi.mock('@/services/stock', () => ({
  stockService: {
    getStockMovements: vi.fn(),
    getWarehouses: vi.fn(),
    getStockLevels: vi.fn(),
  },
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockWarehouses = [
  { id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội' },
  { id: 'w2', code: 'WH02', name: 'Kho phụ', address: 'TP.HCM' },
];

const baseProduct = { id: 'p1', sku: 'SKU001', name: 'Sản phẩm A', description: '', price: 100000, stockQuantity: 50, imageUrl: '', category: '', unit: 'pcs', createdAt: '2024-01-01', updatedAt: '2024-01-01' };

function makeMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? 'm1',
    warehouseId: overrides.warehouseId ?? 'w1',
    productId: overrides.productId ?? 'p1',
    type: overrides.type ?? StockMovementType.In,
    quantity: overrides.quantity ?? 50,
    referenceNo: overrides.referenceNo ?? 'PO-001',
    note: overrides.note ?? '',
    createdAt: overrides.createdAt ?? '2024-06-01T10:00:00Z',
    warehouse: overrides.warehouse ?? { id: 'w1', code: 'WH01', name: 'Kho chính', address: 'Hà Nội' },
    product: overrides.product ?? baseProduct,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

const serviceSpies: ReturnType<typeof vi.spyOn>[] = [];

async function getService() {
  const mod = await import('@/services/stock');
  return mod.stockService;
}

async function setupMocks(movements: any[] = [], warehouses: any[] = mockWarehouses, levels: any[] = [{}]) {
  const svc = await getService();
  serviceSpies.push(vi.spyOn(svc, 'getStockMovements').mockResolvedValue(movements as any));
  serviceSpies.push(vi.spyOn(svc, 'getWarehouses').mockResolvedValue(warehouses as any));
  serviceSpies.push(vi.spyOn(svc, 'getStockLevels').mockResolvedValue(levels as any));
}

const waitLoaded = () => waitFor(() => {
  expect(screen.queryByText(/Đang tải/)).toBeNull();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockMovementsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    serviceSpies.forEach((s) => s.mockRestore());
    serviceSpies.length = 0;
  });

  it('renders page heading', async () => {
    await setupMocks([]);
    renderWithRouter(<StockMovementsPage />);
    await waitLoaded();
    expect(screen.getByText('Lịch sử di chuyển tồn kho')).toBeDefined();
  });

  it('calls getStockMovements on mount', async () => {
    await setupMocks([]);
    renderWithRouter(<StockMovementsPage />);
    await waitLoaded();
    const svc = await getService();
    expect(svc.getStockMovements).toHaveBeenCalled();
  });

  it('shows loading spinner on mount', async () => {
    const svc = await getService();
    // All three services must be mocked — the page calls getWarehouses then getStockMovements
    serviceSpies.push(vi.spyOn(svc, 'getStockMovements').mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve([]), 500)) as any
    ));
    serviceSpies.push(vi.spyOn(svc, 'getWarehouses').mockResolvedValue(mockWarehouses as any));
    serviceSpies.push(vi.spyOn(svc, 'getStockLevels').mockResolvedValue([] as any));
    renderWithRouter(<StockMovementsPage />);
    // Spinner is visible before the async fetch resolves
    expect(screen.getByTestId('icon-spinner')).toBeDefined();
  });

  it('renders In movement row with PO number', async () => {
    const mIn = makeMovement({ id: 'm1', type: StockMovementType.In, referenceNo: 'PO-001', quantity: 50 });
    await setupMocks([mIn]);
    renderWithRouter(<StockMovementsPage />);
    await waitLoaded();
    expect(screen.getByText('PO-001')).toBeDefined();
    expect(screen.getByText('Sản phẩm A')).toBeDefined();
  });

  it('shows empty state when no movements', async () => {
    await setupMocks([]);
    renderWithRouter(<StockMovementsPage />);
    await waitLoaded();
    expect(screen.getByText('Không có lịch sử di chuyển nào')).toBeDefined();
  });

  it('renders warehouse and type filter controls', async () => {
    await setupMocks([makeMovement()]);
    renderWithRouter(<StockMovementsPage />);
    await waitLoaded();
    expect(screen.getByText('Tất cả kho')).toBeDefined();
    expect(screen.getByText('Tất cả loại')).toBeDefined();
  });
});
