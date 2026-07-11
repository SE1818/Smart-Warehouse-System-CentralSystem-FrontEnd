/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SearchPage } from '../search/SearchPage';
import type { ProductIndex, AskResponse } from '@/types/search';

vi.mock('@/components/Icons', () => ({
  Icons: {
    Search: () => <span data-testid="icon-search" />,
    StockBox: () => <span data-testid="icon-stock-box" />,
    Spinner: () => <span data-testid="icon-spinner" />,
    Robot: () => <span data-testid="icon-robot" />,
    AlertWarning: () => <span data-testid="icon-alert-warning" />,
    LightBulb: () => <span data-testid="icon-lightbulb" />,
    Info: () => <span data-testid="icon-info" />,
  },
}));

// Declare mock variables BEFORE vi.mock so the factory can reference them
const mockSuggestProducts = vi.fn();
const mockSearchProducts = vi.fn();
const mockAskWarehouseAssistant = vi.fn();

vi.mock('@/services/search', () => ({
  searchService: {
    suggestProducts: (...args: unknown[]) => mockSuggestProducts(...args) as Promise<string[]>,
    searchProducts: (...args: unknown[]) => mockSearchProducts(...args) as unknown as Promise<ProductIndex[]>,
    askWarehouseAssistant: (...args: unknown[]) => mockAskWarehouseAssistant(...args) as unknown as Promise<AskResponse>,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSearchPage() {
  return render(
    <BrowserRouter>
      <SearchPage />
    </BrowserRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggestProducts.mockResolvedValue([]);
    mockSearchProducts.mockResolvedValue([]);
    mockAskWarehouseAssistant.mockResolvedValue({ answer: '', contextProducts: [] });
  });

  it('renders search input with placeholder text', async () => {
    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...')).toBeDefined();
    });
  });

  it('renders "Tim kiem & Tro ly AI" heading', async () => {
    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText('Tìm kiếm & Trợ lý AI')).toBeDefined();
    });
  });

  it('shows loading state during search', async () => {
    let searchResolve: (value: ProductIndex[]) => void;
    const pendingSearch = new Promise<ProductIndex[]>((r) => {
      searchResolve = r;
    });
    mockSearchProducts.mockReturnValue(pendingSearch);

    renderSearchPage();

    const searchInput = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Đang tìm kiếm sản phẩm...')).toBeDefined();
    });

    searchResolve!([]);
  });

  it('shows empty results message when no products found', async () => {
    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...')).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent product xyz' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy sản phẩm nào')).toBeDefined();
    });
  });

  it('displays search results after data loads', async () => {
    const mockResults: ProductIndex[] = [
      {
        id: 'prod-1',
        name: 'San pham A',
        sku: 'SKU-A',
        description: 'Mo ta san pham A',
        price: 100000,
        stockQuantity: 50,
      },
    ];
    mockSearchProducts.mockResolvedValue(mockResults);

    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...')).toBeDefined();
    });
    const searchInput = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(searchInput, { target: { value: 'san pham' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('San pham A')).toBeDefined();
    });
    expect(screen.getByText('Tìm thấy 1 sản phẩm')).toBeDefined();
  });

  it('renders AI assistant section with input field', async () => {
    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText('Trợ lý AI kho hàng')).toBeDefined();
    });
    expect(screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...')).toBeDefined();
  });

  it('submits search and renders result name and price', async () => {
    mockSearchProducts.mockResolvedValue([
      { id: 'rs1', name: 'Ket qua A', sku: 'KQA', description: 'MoTa', price: 50000, stockQuantity: 10 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'ket qua' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText('Ket qua A')).toBeDefined());
    expect(screen.getByText(/50K VND/)).toBeDefined();
  });

  it('shows search error text block on API failure', async () => {
    mockSearchProducts.mockRejectedValue(new Error('fail'));

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'err' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText(/Không thể tìm kiếm sản phẩm/)).toBeDefined());
  });

  it('renders multiple results with count label', async () => {
    mockSearchProducts.mockResolvedValue([
      { id: 'mr1', name: 'Multi 1', sku: 'M1', description: 'D', price: 10000, stockQuantity: 1 },
      { id: 'mr2', name: 'Multi 2', sku: 'M2', description: 'D', price: 20000, stockQuantity: 2 },
      { id: 'mr3', name: 'Multi 3', sku: 'M3', description: 'D', price: 30000, stockQuantity: 3 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'multi' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText('Tìm thấy 3 sản phẩm')).toBeDefined());
    expect(screen.getByText('Multi 1')).toBeDefined();
    expect(screen.getByText('Multi 2')).toBeDefined();
  });

  it('renders stock quantity label for search result', async () => {
    mockSearchProducts.mockResolvedValue([
      { id: 'sq1', name: 'StockQty', sku: 'SQ1', description: 'D', price: 1000, stockQuantity: 42 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'stock' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText('Tồn: 42')).toBeDefined());
  });

  it('renders zero stock quantity in search results', async () => {
    mockSearchProducts.mockResolvedValue([
      { id: 'zst1', name: 'ZeroStock', sku: 'ZS1', description: 'D', price: 1000, stockQuantity: 0 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'zero' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText('Tồn: 0')).toBeDefined());
  });

  it('does not call search when query is only whitespace', async () => {
    mockSearchProducts.mockResolvedValue([]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.submit(input.closest('form')!);

    await new Promise<void>((r) => setTimeout(r, 100));
    expect(mockSearchProducts).not.toHaveBeenCalled();
  });

  it('shows suggestions dropdown when typing', async () => {
    mockSuggestProducts.mockResolvedValue(['iPhone 15', 'iPhone 15 Pro Max']);
    mockSearchProducts.mockResolvedValue([]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'iPhone' } });

    await waitFor(() => expect(screen.getByText('iPhone 15')).toBeDefined());
    expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();
  });

  it('AI ask renders response and context products', async () => {
    mockAskWarehouseAssistant.mockResolvedValue({
      answer: 'Goi y: nen mua loai A',
      contextProducts: [
        { id: 'ap1', name: 'AIProduct', sku: 'AP1', description: 'D', price: 30000, stockQuantity: 5 },
      ] as ProductIndex[],
    });

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: 'tu van' } });
    fireEvent.submit(ta.closest('form')!);

    await waitFor(() => expect(screen.getByText('Trả lời:')).toBeDefined());
    expect(screen.getByText('Goi y: nen mua loai A')).toBeDefined();
    expect(screen.getByText('Sản phẩm tham khảo')).toBeDefined();
    expect(screen.getByText('AIProduct')).toBeDefined();
    expect(screen.getByText(/30K/)).toBeDefined();
  });

  it('AI ask shows loading while waiting for response', async () => {
    let askResolve: (v: { answer: string; contextProducts: unknown[] }) => void;
    mockAskWarehouseAssistant.mockReturnValue(
      new Promise<{ answer: string; contextProducts: unknown[] }>((r) => {
        askResolve = r;
      }),
    );

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: 'loading test?' } });
    fireEvent.submit(ta.closest('form')!);

    expect(screen.getByText('Trợ lý đang suy nghĩ...')).toBeDefined();
    expect(screen.getByText(/Trợ lý đang phân tích câu hỏi/)).toBeDefined();
    askResolve!({ answer: '', contextProducts: [] });
  });

  it('AI ask shows error on failure', async () => {
    mockAskWarehouseAssistant.mockRejectedValue(new Error('ai fail'));

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: 'err' } });
    fireEvent.submit(ta.closest('form')!);

    await waitFor(() => expect(screen.getByText(/Không thể xử lý câu hỏi/)).toBeDefined());
  });

  it('does not call ask AI when question is empty', async () => {
    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: ' ' } });
    fireEvent.submit(ta.closest('form')!);

    await new Promise<void>((r) => setTimeout(r, 100));
    expect(mockAskWarehouseAssistant).not.toHaveBeenCalled();
  });

  it('clears suggestions and hides dropdown after search submit', async () => {
    mockSuggestProducts.mockResolvedValue(['Sug X', 'Sug Y']);
    mockSearchProducts.mockResolvedValue([
      { id: 'cs1', name: 'Cleared Result', sku: 'CR', description: 'D', price: 1000, stockQuantity: 1 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'clr' } });
    await waitFor(() => expect(screen.getByText('Sug X')).toBeDefined());

    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(screen.getByText('Cleared Result')).toBeDefined());
    expect(screen.queryByText('Sug X')).toBeNull();
    expect(screen.queryByText('Sug Y')).toBeNull();
  });

  it('suggestion click triggers direct search', async () => {
    mockSuggestProducts.mockResolvedValue(['ClickSug']);
    mockSearchProducts.mockResolvedValue([
      { id: 'sg1', name: 'Clicked', sku: 'SG1', description: 'D', price: 1000, stockQuantity: 1 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'click' } });
    await waitFor(() => expect(screen.getByText('ClickSug')).toBeDefined());

    await userEvent.click(screen.getByText('ClickSug'));

    await waitFor(() => expect(screen.getByText('Clicked')).toBeDefined());
    expect(screen.queryByText('ClickSug')).toBeNull();
  });

  it('renders product description in search result cards', async () => {
    mockSearchProducts.mockResolvedValue([
      { id: 'd1', name: 'DescProduct', sku: 'DP', description: 'Mo ta chi tiet san pham', price: 100000, stockQuantity: 5 },
    ] as ProductIndex[]);

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...'));

    const input = screen.getByPlaceholderText('Nhập từ khóa, tên sản phẩm, SKU...');
    fireEvent.change(input, { target: { value: 'desc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(screen.getByText('Mo ta chi tiet san pham')).toBeDefined());
  });

  it('renders context products with names in AI response', async () => {
    mockAskWarehouseAssistant.mockResolvedValue({
      answer: 'Check these',
      contextProducts: [
        { id: 'cp1', name: 'CtxProduct 1', sku: 'CP1', description: 'D', price: 75000, stockQuantity: 3 },
      ] as ProductIndex[],
    });

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: 'ctx?' } });
    fireEvent.submit(ta.closest('form')!);

    await waitFor(() => expect(screen.getByText('CtxProduct 1')).toBeDefined());
    expect(screen.getByText(/75K/)).toBeDefined();
  });

  it('renders AI answer with multiline whitespace preserved', async () => {
    mockAskWarehouseAssistant.mockResolvedValue({
      answer: 'Line 1\nLine 2\nLine 3',
      contextProducts: [],
    });

    renderSearchPage();
    await waitFor(() => screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...'));

    const ta = screen.getByPlaceholderText('Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm...');
    fireEvent.change(ta, { target: { value: 'nl?' } });
    fireEvent.submit(ta.closest('form')!);

    await waitFor(() => expect(screen.getByText(/Line 1/)).toBeDefined());
    expect(screen.getByText(/Line 2/)).toBeDefined();
  });

  it('renders Cach su dung info box', async () => {
    renderSearchPage();

    await waitFor(() => expect(screen.getByText('Cách sử dụng')).toBeDefined());
    expect(screen.getByText('Nhập từ khóa để tìm kiếm sản phẩm theo tên, mô tả, hoặc SKU')).toBeDefined();
  });
});
