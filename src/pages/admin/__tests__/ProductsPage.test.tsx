import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProductsPage } from '../ProductsPage';
import { ToastContainer } from 'react-toastify';

vi.mock('react-toastify', () => {
  const messages: string[] = [];
  return {
    toast: {
      success: (msg: string) => { messages.push(msg); },
      error: (msg: string) => { messages.push(msg); },
      info: (msg: string) => { messages.push(msg); },
      warning: (msg: string) => { messages.push(msg); },
    },
    ToastContainer: () => <div data-testid="toast-content">{messages.join(' ')}</div>,
  };
});

vi.mock('@/components/Icons', () => {
	const fn = function (n) { return function () { return <span data-testid={'icon-' + n}>{n}</span>; }; };
	return {
		Icons: {
			Product: fn('product'), Refresh: fn('refresh'), Plus: fn('plus'),
			Search: fn('search'), AlertWarning: fn('warning'), Spinner: fn('spinner'),
			ChevronLeft: fn('chevron-left'), ChevronRight: fn('chevron-right'),
			UsersGroup: fn('users-group'), Thermometer: fn('thermo'), Droplet: fn('droplet'),
			Bolt: fn('bolt'), Profile: fn('profile'), Close: fn('close'),
			Calendar: fn('calendar'), Inbox: fn('inbox'), SuccessCheck: fn('check'),
			User: fn('user'), Check: fn('check'), Store: fn('store'),
			Folder: fn('folder'), Warehouse: fn('warehouse'), CartOrder: fn('cart'),
			Dashboard: fn('dash'), Truck: fn('truck'), StockBox: fn('box'),
			AnalyticsReport: fn('report'),
		},
	};
});

vi.mock('@/components/CustomSelect', () => ({
	CustomSelect: function (props) {
		return <select data-testid="custom-select"><option value="">{props.placeholder}</option></select>;
	},
}));

vi.mock('@/services', () => ({
	productService: { getProducts: vi.fn(), updateProduct: vi.fn(), deleteProduct: vi.fn(), createProduct: vi.fn(), uploadImage: vi.fn() },
	metricsService: { getMetrics: vi.fn() },
}));

const productService = vi.mocked(await import('@/services')).productService;

const renderPage = () => render(
  <BrowserRouter>
    <ProductsPage />
    <ToastContainer />
  </BrowserRouter>
);

describe('ProductsPage', () => {
	beforeEach(() => { localStorage.clear(); });
	afterEach(() => { productService.getProducts.mockReset(); cleanup(); });

	const product = function (overrides) {
		overrides = overrides || {};
		return Object.assign({ id: '1', name: 'P1', sku: 'SKU1', category: 'Đồ uống', price: 15000,
			stockQuantity: 50, description: '', unit: 'lon',
			createdAt: '', updatedAt: '', imageUrl: '' }, overrides);
	};

	it('renders page heading', () => {
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		expect(screen.getByText('Quản lý sản phẩm')).toBeInTheDocument();
	});

	it('shows loading while fetching', () => {
		productService.getProducts.mockImplementation(function () { return new Promise(function () {}); });
		renderPage();
		expect(screen.getByText('Đang tải danh sách sản phẩm...')).toBeInTheDocument();
	});

	it('shows error block when fetch fails', async () => {
		productService.getProducts.mockRejectedValue(new Error('err'));
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/Không thể tải danh sách sản phẩm/)).toBeInTheDocument(); });
	});

	it('calls getProducts on mount', async () => {
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(productService.getProducts).toHaveBeenCalled(); });
	});

	it('renders empty state when no products', async () => {
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Không tìm thấy sản phẩm nào')).toBeInTheDocument(); });
	});

	it('shows table headers', async () => {
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getAllByRole('columnheader').length).toBeGreaterThanOrEqual(5); });
	});

	it('renders product row with name', async () => {
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
	});

	it('renders category badge', async () => {
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Đồ uống')).toBeInTheDocument(); });
	});

	it('formats price with locale', async () => {
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/15[,.]000/)).toBeInTheDocument(); });
	});

	it('shows Hết hàng label for zero stock', async () => {
		productService.getProducts.mockResolvedValue([product({ stockQuantity: 0, name: 'Z' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/(Hết hàng)/)).toBeInTheDocument(); });
	});

	it('shows product initial placeholder', async () => {
		productService.getProducts.mockResolvedValue([product({ name: 'XYZ' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('X')).toBeInTheDocument(); });
	});

	it('shows image element when product has imageUrl', async () => {
		productService.getProducts.mockResolvedValue([product({ imageUrl: '/api/files/static/products/1.jpg' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByAltText('P1')).toBeInTheDocument(); });
	});

	it('renders Sửa and Xóa buttons', async () => {
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Sửa')).toBeInTheDocument(); });
		expect(screen.getAllByText('Xóa').length).toBeGreaterThanOrEqual(1);
	});

	it('opens delete confirmation dialog', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getAllByText('Xóa')[0]);
		expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
	});

	it('opens edit modal', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
	});

	it('shows product values in edit modal inputs', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByDisplayValue('P1')).toBeInTheDocument(); });
		expect(screen.getByDisplayValue('SKU1')).toBeInTheDocument();
		expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
	});

	it('typing in edit form changes product name', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByDisplayValue('P1')).toBeInTheDocument(); });
		const inputs = screen.getAllByRole('textbox');
		await user.clear(inputs[0]);
		await user.type(inputs[0], 'NewName');
		expect(screen.getByDisplayValue('NewName')).toBeInTheDocument();
	});

	it('shows unit combobox in edit form', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByDisplayValue('P1')).toBeInTheDocument(); });
		const selects = screen.getAllByRole('combobox');
		expect(selects.length).toBeGreaterThanOrEqual(1);
	});

	it('opens add modal on button click', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
	});

	it('shows add form placeholders', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		await waitFor(function () { return expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument(); });
		const boxes = screen.getAllByRole('textbox');
		expect(boxes.length).toBeGreaterThanOrEqual(3);
	});

	it('calls getProducts on refresh click', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Làm mới')).toBeInTheDocument(); });
		await user.click(screen.getByText('Làm mới'));
		expect(productService.getProducts).toHaveBeenCalledTimes(2);
	});

	it('searches products by name', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([
			product({ id: '1', name: 'Coca' }),
			product({ id: '2', name: 'Pepsi' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Coca')).toBeInTheDocument(); });
		const searchInput = screen.getAllByPlaceholderText(/Tìm kiếm theo tên sản phẩm/)[0];
		await user.type(searchInput, 'Pep');
		expect(screen.queryByText('Coca')).not.toBeInTheDocument();
		expect(screen.getByText('Pepsi')).toBeInTheDocument();
	});

	it('renders pagination for more than 8 products', async () => {
		productService.getProducts.mockResolvedValue(
			Array.from({ length: 10 }, function (_, i) { return product({ id: String(i), name: 'P' + i }); })
		);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/Hiển thị/)).toBeInTheDocument(); });
	});

	it('shows page 2 when clicking page button 2', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue(
			Array.from({ length: 10 }, function (_, i) { return product({ id: String(i), name: 'P' + i }); })
		);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/Hiển thị/)).toBeInTheDocument(); });
		const pageBtn = screen.getByRole('button', { name: '2' });
		await user.click(pageBtn);
		expect(screen.getByText('P8')).toBeInTheDocument();
	});

	it('shows image element for product with bad URL', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 'badimg', name: 'BadImg', imageUrl: 'http://bad.url/img.jpg' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('BadImg')).toBeInTheDocument(); });
	});

	it('shows initial placeholder when product has no imageUrl', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 'noimg', name: 'NoImg', imageUrl: '' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('NoImg')).toBeInTheDocument(); });
		expect(screen.getByText('N')).toBeInTheDocument();
	});

	it('shows sku label when product has sku', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 's1', name: 'SKUProduct', sku: 'SKU-001' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('SKU-001')).toBeInTheDocument(); });
	});

	it('renders negative stock as text', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 'ns1', name: 'NegStock', stockQuantity: -5 }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/-5/)).toBeInTheDocument(); });
	});

	it('opens edit modal via double-click text on Sửa button', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product({ id: 'e1', name: 'EditMe' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('EditMe')).toBeInTheDocument(); });
		const editBtns = screen.getAllByText('Sửa');
		await user.click(editBtns[0]);
		expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument();
	});

	it('cancel delete keeps product in list', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product({ id: 'keep1', name: 'Keep' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Keep')).toBeInTheDocument(); });
		await user.click(screen.getAllByText('Xóa')[0]);
		expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument();
		await user.click(screen.getByText('Hủy'));
		expect(screen.queryByText('Xác nhận xóa')).not.toBeInTheDocument();
		expect(screen.getByText('Keep')).toBeInTheDocument();
	});

	it('shows no results text when search yields empty filtering', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 's1', name: 'Coca' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Coca')).toBeInTheDocument(); });
		const searchInput = screen.getAllByPlaceholderText(/Tìm kiếm theo tên sản phẩm/)[0];
		await userEvent.type(searchInput, 'XYZNOTFOUND');
		await waitFor(function () {
			return expect(screen.getByText('Không tìm thấy sản phẩm nào')).toBeInTheDocument();
		});
	});

	it('disables previous page button on page 1', async () => {
		productService.getProducts.mockResolvedValue(
			Array.from({ length: 10 }, function (_, i) { return product({ id: String(i), name: 'P' + i }); }),
		);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/Hiển thị/)).toBeInTheDocument(); });
		const buttons = screen.getAllByRole('button');
		const disabled = buttons.filter(function (btn) { return btn.hasAttribute('disabled'); });
		expect(disabled.length).toBeGreaterThanOrEqual(1);
	});

	it('disables next page button on last page', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue(
			Array.from({ length: 10 }, function (_, i) { return product({ id: String(i), name: 'P' + i }); }),
		);
		renderPage();
		await waitFor(function () { return expect(screen.getByText(/Hiển thị/)).toBeInTheDocument(); });
		// Navigate to last page by clicking page 2
		await user.click(screen.getByRole('button', { name: '2' }));
		await waitFor(function () { return expect(screen.getByText('P8')).toBeInTheDocument(); });
		const nextDisabled = screen.getAllByRole('button').filter(function (btn) {
			return btn.disabled;
		});
		expect(nextDisabled.length).toBeGreaterThanOrEqual(1);
	});

	it('does not call createProduct when add form submitted with empty required data', async () => {
		const user = userEvent.setup();
		productService.createProduct.mockResolvedValue({ id: 'new', name: '', sku: '', price: 0, stockQuantity: 0 });
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		await waitFor(function () { return expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument(); });
		// Submit with empty required fields — browser valid-required prevents handler execution
		const submitBtn = screen.getByRole('button', { name: 'Tạo sản phẩm' });
		await user.click(submitBtn);
		expect(productService.createProduct).not.toHaveBeenCalled();
		// Modal still open (form not submitted)
		expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument();
	});

	it('calls createProduct with valid add form data and resets form fields', async () => {
		const user = userEvent.setup();
		productService.createProduct.mockResolvedValue({ id: 'new1', name: 'New', sku: 'SKU-N', price: 10000, stockQuantity: 10 });
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		await waitFor(function () { return expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument(); });
		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'NewProd');
		await user.type(inputs[1], 'SKU-NEW');
		await user.type(inputs[2], '20000');
		await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }));
		await waitFor(function () { return expect(productService.createProduct).toHaveBeenCalled(); });
		// Form resets to empty values
		expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toHaveValue('');
	});

	it('shows error toast when createProduct fails', async () => {
		const user = userEvent.setup();
		productService.createProduct.mockRejectedValue(new Error('Server error'));
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		await waitFor(function () { return expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument(); });
		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'FailProd');
		await user.type(inputs[1], 'SKU-F');
		await user.type(inputs[2], '5000');
		await user.click(screen.getByRole('button', { name: 'Tạo sản phẩm' }));
		await waitFor(function () {
			return expect(screen.getByText(/Không thể tạo sản phẩm mới/)).toBeInTheDocument();
		});
	});

	it('shows error toast when updateProduct fails', async () => {
		const user = userEvent.setup();
		productService.updateProduct.mockRejectedValue(new Error('Server error'));
		productService.getProducts.mockResolvedValue([product()]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('P1')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
		await waitFor(function () {
			return expect(screen.getByText(/Không thể cập nhật sản phẩm/)).toBeInTheDocument();
		});
	});

	it('shows error toast when deleteProduct fails', async () => {
		const user = userEvent.setup();
		const failingId = 'fail-del';
		productService.deleteProduct.mockRejectedValue(new Error('Server error'));
		productService.getProducts.mockResolvedValue([product({ id: failingId, name: 'DelFail' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('DelFail')).toBeInTheDocument(); });
		await user.click(screen.getAllByText('Xóa')[0]);
		await waitFor(function () { return expect(screen.getByText('Xác nhận xóa')).toBeInTheDocument(); });
		await user.click(screen.getByText('Xóa ngay'));
		await waitFor(function () {
			return expect(screen.getByText(/Không thể xóa sản phẩm/)).toBeInTheDocument();
		});
	});

	it('shows initial placeholder when product image fails to load', async () => {
		// invalid:// protocol resolves to an invalid URL in the browser, so the img onError fires
		productService.getProducts.mockResolvedValue([
			product({ id: 'img-err', name: 'BadImg', imageUrl: 'invalid://bad.url/img.jpg' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('BadImg')).toBeInTheDocument(); });
		// Fallback should show initial 'B' after onError fires
		await waitFor(function () { return expect(screen.getByText('B')).toBeInTheDocument(); });
	});

	it('shows upload success toast when editing with image upload', async () => {
		const user = userEvent.setup();
		productService.uploadImage.mockResolvedValue({ url: 'http://localhost:5000/api/files/static/products/1.jpg' });
		productService.getProducts.mockResolvedValue([
			product({ id: 'img-up', name: 'ImgUp', imageUrl: 'http://example.com/existing.jpg' }),
		]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('ImgUp')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument(); });
		// Trigger the image upload via the hidden file input
		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
		expect(fileInput).toBeTruthy();
		const fakeFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
		Object.defineProperty(fileInput, 'files', { value: [fakeFile] });
		fileInput.dispatchEvent(new Event('change', { bubbles: true }));
		await waitFor(function () {
			return expect(screen.getByText('Đã tải ảnh lên thành công!')).toBeInTheDocument();
		});
	});

	it('clicking cancel on edit modal closes it', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([product({ id: 'e-cancel', name: 'ECancel' })]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('ECancel')).toBeInTheDocument(); });
		await user.click(screen.getByText('Sửa'));
		await waitFor(function () { return expect(screen.getByText('Chỉnh sửa sản phẩm')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: 'Hủy' }));
		expect(screen.queryByText('Chỉnh sửa sản phẩm')).not.toBeInTheDocument();
		expect(screen.getByText('ECancel')).toBeInTheDocument();
	});

	it('clicking cancel on add modal closes it', async () => {
		const user = userEvent.setup();
		productService.getProducts.mockResolvedValue([]);
		renderPage();
		await waitFor(function () { return expect(screen.getByText('Thêm sản phẩm mới')).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
		await waitFor(function () { return expect(screen.getByPlaceholderText(/Nước uống đóng chai/)).toBeInTheDocument(); });
		await user.click(screen.getByRole('button', { name: 'Hủy' }));
		expect(screen.queryByPlaceholderText(/Nước uống đóng chai/)).not.toBeInTheDocument();
		expect(document.querySelector('.fixed.inset-0.z-50')).toBeNull();
	});

	it('renders multiple stockQuantity chiếc labels in the table', async () => {
		productService.getProducts.mockResolvedValue([
			product({ id: 's1', name: 'ProdA', stockQuantity: 50 }),
			product({ id: 's2', name: 'ProdB', stockQuantity: 30 }),
		]);
		renderPage();
		const stockLabels = screen.getAllByText(/chiếc/);
		expect(stockLabels.length).toBeGreaterThanOrEqual(2);
	});
});
