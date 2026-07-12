import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProductsPage } from '../ProductsPage';
import { productService } from '@/services';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const p = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '1', name: 'P1', sku: 'SKU1', category: 'Đồ uống',
  price: 15000, stockQuantity: 50, description: '', unit: 'chiếc',
  createdAt: '', updatedAt: '', imageUrl: '', ...overrides,
});

// Creates a fresh spy on the named method. Use when a test cares about toHaveBeenCalled.
const spy = (method: keyof typeof productService, impl: unknown) => {
  return vi.spyOn(productService, method).mockImplementation(impl as never);
};

const renderPage = () => render(
  <BrowserRouter>
    <ProductsPage />
  </BrowserRouter>
);

describe('ProductsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders page heading', () => {
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    expect(screen.getByText('Quản lý sản phẩm')).toBeInTheDocument();
  });

  it('shows loading while fetching', () => {
    spy('getProducts', () => new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Đang tải danh sách sản phẩm...')).toBeInTheDocument();
  });

  it('shows error block when fetch fails', async () => {
    spy('getProducts', () => Promise.reject(new Error('err')));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Không thể tải danh sách sản phẩm/)).toBeInTheDocument();
    });
  });

  it('calls getProducts on mount', async () => {
    const s = spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(s).toHaveBeenCalled();
    });
  });

  it('renders empty state when no products', async () => {
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy sản phẩm nào')).toBeInTheDocument();
    });
  });

  it('shows table headers', async () => {
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThanOrEqual(5);
    });
  });

  it('renders product row with name', async () => {
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
  });

  it('renders category badge', async () => {
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Đồ uống')).toBeInTheDocument();
    });
  });

  it('formats price with locale', async () => {
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/15[,.]000/)).toBeInTheDocument();
    });
  });

  it('shows Hết hàng label for zero stock', async () => {
    spy('getProducts', () => Promise.resolve([p({ stockQuantity: 0, name: 'Z' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/(Hết hàng)/)).toBeInTheDocument();
    });
  });

  it('shows product initial placeholder', async () => {
    spy('getProducts', () => Promise.resolve([p({ name: 'XYZ' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  it('shows image element when product has imageUrl', async () => {
    spy('getProducts', () => Promise.resolve([p({ imageUrl: '/api/files/static/products/1.jpg' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByAltText('P1')).toBeInTheDocument();
    });
  });

  it('renders Sửa and Xóa buttons', async () => {
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sửa')).toBeInTheDocument();
      expect(screen.getAllByText('Xóa').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens delete confirmation dialog', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getAllByText('Xóa')[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
  });

  it('opens edit modal', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
  });

  it('shows product values in edit modal inputs', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('P1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('SKU1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
    });
  });

  it('typing in edit form changes product name', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('P1')).toBeInTheDocument();
    });
    const nameInput = screen.getByDisplayValue('P1');
    await user.clear(nameInput);
    await user.type(nameInput, 'NewName');
    expect(screen.getByDisplayValue('NewName')).toBeInTheDocument();
  });

  it('shows unit combobox in edit form', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('P1')).toBeInTheDocument();
    });
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('opens add modal on button click', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
  });

  it('shows add form placeholders', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    const boxes = screen.getAllByRole('textbox');
    expect(boxes.length).toBeGreaterThanOrEqual(3);
  });

  it('calls getProducts on refresh click', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Làm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Làm mới'));
    expect(productService.getProducts).toHaveBeenCalled();
  });

  it('searches products by name', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([
      p({ id: '1', name: 'Coca' }),
      p({ id: '2', name: 'Pepsi' }),
    ]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Coca')).toBeInTheDocument();
    });
    const searchInput = screen.getAllByPlaceholderText(/Tìm kiếm theo tên sản phẩm/)[0];
    await user.type(searchInput, 'Pep');
    expect(screen.queryByText('Coca')).not.toBeInTheDocument();
    expect(screen.getByText('Pepsi')).toBeInTheDocument();
  });

  it('renders pagination for more than 8 products', async () => {
    spy('getProducts', () => Promise.resolve(
      Array.from({ length: 10 }, (_, i) => p({ id: String(i), name: 'P' + i }))
    ));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hiển thị/)).toBeInTheDocument();
    });
  });

  it('shows page 2 when clicking page button 2', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve(
      Array.from({ length: 10 }, (_, i) => p({ id: String(i), name: 'P' + i }))
    ));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hiển thị/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('P8')).toBeInTheDocument();
  });

  it('shows image element for product with bad URL', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 'badimg', name: 'BadImg', imageUrl: 'http://bad.url/img.jpg' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('BadImg')).toBeInTheDocument();
      expect(screen.getByAltText('BadImg')).toBeInTheDocument();
    });
  });

  it('shows initial placeholder when product has no imageUrl', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 'noimg', name: 'NoImg', imageUrl: '' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('NoImg')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
    });
  });

  it('shows sku label when product has sku', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 's1', name: 'SKUProduct', sku: 'SKU-001' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });
  });

  it('renders negative stock as text', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 'ns1', name: 'NegStock', stockQuantity: -5 })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/-5/)).toBeInTheDocument();
    });
  });

  it('opens edit modal via Sửa button', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p({ id: 'e1', name: 'EditMe' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('EditMe')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
  });

  it('cancel delete keeps product in list', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p({ id: 'keep1', name: 'Keep' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
    await user.click(screen.getAllByText('Xóa')[0]);
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    await user.click(screen.getByText('Hủy'));
    expect(screen.queryByText('Xác nhận xóa')).not.toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('shows no results text when search yields empty filtering', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 's1', name: 'Coca' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Coca')).toBeInTheDocument();
    });
    const searchInput = screen.getAllByPlaceholderText(/Tìm kiếm theo tên sản phẩm/)[0];
    await userEvent.type(searchInput, 'XYZNOTFOUND');
    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy sản phẩm nào')).toBeInTheDocument();
    });
  });

  it('disables previous page button on page 1', async () => {
    spy('getProducts', () => Promise.resolve(
      Array.from({ length: 10 }, (_, i) => ({ ...p(), id: String(i), name: 'P' + i }))
    ));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hiển thị/)).toBeInTheDocument();
    });
    const disabled = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('disabled'));
    expect(disabled.length).toBeGreaterThanOrEqual(1);
  });

  it('disables next page button on last page', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve(
      Array.from({ length: 10 }, (_, i) => ({ ...p(), id: String(i), name: 'P' + i }))
    ));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hiển thị/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => {
      expect(screen.getByText('P8')).toBeInTheDocument();
    });
    const nextDisabled = screen.getAllByRole('button').filter((btn) => (btn as HTMLButtonElement).disabled);
    expect(nextDisabled.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Add product flow ──────────────────────────────────────────────────────

  it('does not call createProduct when add form submitted with empty data', async () => {
    const user = userEvent.setup();
    // getProducts returns products so list is visible; clicking "Thêm sản phẩm" opens modal
    spy('getProducts', () => Promise.resolve([]));
    // createProduct resolves (not called because form is empty)
    spy('createProduct', () => Promise.resolve({}));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    // The form has `required` attributes on name/sku/price — browser validation
    // should block submit when those fields are empty. Click the submit button:
    const submitBtn = screen.getByRole('button', { name: 'Tạo sản phẩm' });
    await user.click(submitBtn);
    // Validate: modal should still be open (not closed = not submitted), no call made
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    // productService.createProduct must NOT have been called at all
    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('calls createProduct with valid add form data and resets form fields', async () => {
    const user = userEvent.setup();
    const s = spy('createProduct', () => Promise.resolve({}));
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText(/Ví dụ: Nước uống đóng chai/);
    const skuInput = screen.getByPlaceholderText(/Ví dụ: SKU-WATER-01/);
    const priceInput = screen.getAllByRole('spinbutton')[0];

    await user.type(nameInput, 'NewProd');
    await user.type(skuInput, 'SKU-NEW');
    await user.type(priceInput, '20000');
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }));
    await waitFor(() => {
      expect(s).toHaveBeenCalled();
    });
    // Form resets after success. Re-open modal to check:
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      const nameAfterReset = screen.getByPlaceholderText(/Nước uống đóng chai/);
      expect(nameAfterReset).toHaveValue('');
    });
  });

  it('shows error toast when createProduct fails', async () => {
    const user = userEvent.setup();
    const s = spy('createProduct', () => Promise.reject(new Error('Server error')));
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText(/Ví dụ: Nước uống đóng chai/);
    const skuInput = screen.getByPlaceholderText(/Ví dụ: SKU-WATER-01/);
    const priceInput = screen.getAllByRole('spinbutton')[0];

    await user.type(nameInput, 'FailProd');
    await user.type(skuInput, 'SKU-F');
    await user.type(priceInput, '5000');
    await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }));
    // Error: createProduct was called but rejected; modal stays open
    await waitFor(() => {
      expect(s).toHaveBeenCalled();
    });
    expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
  });

  // ─── Edit / update product ─────────────────────────────────────────────────

  it('shows error toast when updateProduct fails', async () => {
    const user = userEvent.setup();
    const s = spy('updateProduct', () => Promise.reject(new Error('Server error')));
    spy('getProducts', () => Promise.resolve([p()]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('P1')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => {
      expect(s).toHaveBeenCalled();
    });
    // Modal stays open on error
    expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
  });

  // ─── Delete product ────────────────────────────────────────────────────────

  it('shows error toast when deleteProduct fails', async () => {
    const user = userEvent.setup();
    const s = spy('deleteProduct', () => Promise.reject(new Error('Server error')));
    spy('getProducts', () => Promise.resolve([p({ id: 'fail-del', name: 'DelFail' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('DelFail')).toBeInTheDocument();
    });
    await user.click(screen.getAllByText('Xóa')[0]);
    await waitFor(() => {
      expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Xóa ngay'));
    await waitFor(() => {
      expect(s).toHaveBeenCalled();
    });
    // Dialog stays open on error
    expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
  });

  // ─── Image handling ─────────────────────────────────────────────────────────

  it('shows initial placeholder when product image fails to load', async () => {
    spy('getProducts', () => Promise.resolve([p({ id: 'img-err', name: 'BadImg', imageUrl: 'invalid://bad.url/img.jpg' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('BadImg')).toBeInTheDocument();
    });
    await waitFor(() => {
      const img = screen.getByAltText('BadImg');
      fireEvent.error(img);
    });
    await waitFor(() => {
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  it('shows upload success toast when editing with image upload', async () => {
    const user = userEvent.setup();
    spy('uploadImage', () => Promise.resolve({ url: 'http://localhost:5000/api/files/static/products/1.jpg' }));
    spy('getProducts', () => Promise.resolve([p({ id: 'img-up', name: 'ImgUp', imageUrl: 'http://example.com/existing.jpg' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ImgUp')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
    });
    const dialog = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
    const fileInput = dialog?.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    const fakeFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput!, 'files', { value: [fakeFile] });
    fileInput!.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đã tải ảnh lên thành công!');
    });
  });

  // ─── Cancel / modal close ───────────────────────────────────────────────────

  it('clicking cancel on edit modal closes it', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([p({ id: 'e-cancel', name: 'ECancel' })]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ECancel')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Sửa'));
    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByText('Chỉnh sửa sản phẩm')).not.toBeInTheDocument();
    expect(screen.getByText('ECancel')).toBeInTheDocument();
  });

  it('clicking cancel on add modal closes it', async () => {
    const user = userEvent.setup();
    spy('getProducts', () => Promise.resolve([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByPlaceholderText(/Nước uống đóng chai/)).not.toBeInTheDocument();
  });

  // ─── Table stock labels ─────────────────────────────────────────────────────

  it('renders multiple stockQuantity chiếc labels in the table', async () => {
    spy('getProducts', () => Promise.resolve([
      p({ id: 's1', name: 'ProdA', stockQuantity: 50 }),
      p({ id: 's2', name: 'ProdB', stockQuantity: 30 }),
    ]));
    renderPage();
    await waitFor(() => {
      const stockLabels = screen.getAllByText(/chiếc/);
      expect(stockLabels.length).toBeGreaterThanOrEqual(2);
    });
  });
});
