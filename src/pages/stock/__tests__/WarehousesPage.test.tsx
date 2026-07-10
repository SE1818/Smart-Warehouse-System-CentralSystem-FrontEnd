/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { WarehousesPage } from '../WarehousesPage';

vi.mock('@/components/Icons', () => ({
	Icons: {
		Warehouse: () => <span data-testid="icon-warehouse" />,
		Refresh: () => <span data-testid="icon-refresh" />,
		Plus: () => <span data-testid="icon-plus" />,
		Search: () => <span data-testid="icon-search" />,
		AlertWarning: () => <span data-testid="icon-alert-warning" />,
		Spinner: () => <span data-testid="icon-spinner" />,
	},
}));

vi.mock('@/components/CustomSelect', () => ({
	CustomSelect: ({
		value,
		onChange,
		options,
		placeholder,
	}: {
		value: string;
		onChange: (v: string) => void;
		options: { value: string; label: string }[];
		placeholder: string;
	}) => (
		<select
			data-testid="custom-select"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		>
			<option value="">{placeholder}</option>
			{options?.map((o) => (
				<option key={o.value} value={o.value}>
					{o.label}
				</option>
			))}
		</select>
	),
}));

vi.mock('@/services/stock', () => ({
	stockService: {
		getWarehouses: vi.fn(),
		updateWarehouse: vi.fn(),
		createWarehouse: vi.fn(),
		deleteWarehouse: vi.fn(),
	},
}));

const stockService = vi.mocked(await import('@/services/stock')).stockService;

function renderWarehousesPage() {
	render(
		<BrowserRouter>
			<WarehousesPage />
		</BrowserRouter>,
	);
}

const mockWarehouses = (overrides: Record<string, unknown> = {}) => ({
	id: overrides.id ?? 'wh-1',
	code: overrides.code ?? 'WH-01',
	name: overrides.name ?? 'Kho chính',
	address: overrides.address ?? '123 ABC, HN',
	isActive: overrides.isActive ?? true,
});

describe('WarehousesPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('renders heading "Quản lý kho hàng"', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Quản lý kho hàng')).toBeDefined(),
		);
	});

	it('shows loading spinner while fetching', () => {
		let resolve: (v: never[]) => void;
		const pending = new Promise<never[]>((r) => {
			resolve = r;
		});
		stockService.getWarehouses.mockReturnValue(pending);
		renderWarehousesPage();
		expect(
			screen.getByText('Đang tải danh sách kho hàng...'),
		).toBeDefined();
		resolve!([]);
	});

	it('renders warehouse list items after data loads', async () => {
		const warehouses = [
			mockWarehouses(),
			mockWarehouses({ id: 'wh-2', code: 'WH-02', name: 'Kho phụ' }),
		];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Kho chính')).toBeDefined(),
		);
		expect(screen.getByText('Kho phụ')).toBeDefined();
	});

	it('renders search input for filtering', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.queryByText('Đang tải danh sách kho hàng...'),
			).toBeNull(),
		);
		expect(
			screen.getByPlaceholderText('Tìm kiếm theo tên kho hoặc mã kho...'),
		).toBeDefined();
	});

	it('shows empty state when no warehouses', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.getByText('Không tìm thấy kho hàng nào'),
			).toBeDefined(),
		);
	});

	it('displays Sửa and Xóa action buttons for each warehouse row', async () => {
		const warehouses = [mockWarehouses()];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.queryByText('Đang tải danh sách kho hàng...'),
			).toBeNull(),
		);
		expect(screen.getAllByText('Sửa').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Xóa').length).toBeGreaterThanOrEqual(1);
	});

	it('shows error state when fetch fails', async () => {
		stockService.getWarehouses.mockRejectedValue(new Error('Network error'));
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.getByText(/Không thể tải danh sách kho hàng/),
			).toBeDefined(),
		);
	});

	it('displays warehouse code and address in the table', async () => {
		const warehouses = [
			mockWarehouses({ code: 'WH-01', address: '123 ABC, HN' }),
		];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() => expect(screen.getByText('WH-01')).toBeDefined());
		expect(screen.getByText('123 ABC, HN')).toBeDefined();
	});

	it('renders the Thêm kho mới button', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /Thêm kho mới/i }),
			).toBeDefined(),
		);
	});

	it('filters warehouses by search name', async () => {
		const warehouses = [
			mockWarehouses({ id: 'wh-1', name: 'Kho chính', code: 'WH-01' }),
			mockWarehouses({ id: 'wh-2', name: 'Kho phụ', code: 'WH-02' }),
		];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Kho phụ')).toBeDefined(),
		);

		const user = userEvent.setup();
		const searchInput = screen.getByPlaceholderText(
			'Tìm kiếm theo tên kho hoặc mã kho...',
		);
		await user.type(searchInput, 'Kho phụ');
		expect(screen.getByText('Kho phụ')).toBeDefined();
		expect(screen.queryByText('Kho chính')).toBeNull();
	});

	it('click "Thêm kho mới" button opens add modal', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.queryByText('Đang tải danh sách kho hàng...'),
			).toBeNull(),
		);

		const user = userEvent.setup();
		await user.click(
			screen.getByRole('button', { name: /Thêm kho mới/i }),
		);
		expect(screen.getByText('Thêm kho hàng mới')).toBeDefined();
	});

	it('shows form fields in add modal', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.queryByText('Đang tải danh sách kho hàng...'),
			).toBeNull(),
		);

		const user = userEvent.setup();
		await user.click(
			screen.getByRole('button', { name: /Thêm kho mới/i }),
		);
		expect(screen.getByPlaceholderText('Ví dụ: WH-01')).toBeDefined();
		expect(screen.getByPlaceholderText('Ví dụ: Kho chính')).toBeDefined();
		expect(
			screen.getByPlaceholderText('Địa chỉ cụ thể của kho...'),
		).toBeDefined();
	});

	it('submit add form calls createWarehouse', async () => {
		stockService.getWarehouses.mockResolvedValue([]);
		renderWarehousesPage();
		await waitFor(() =>
			expect(
				screen.queryByText('Đang tải danh sách kho hàng...'),
			).toBeNull(),
		);

		const user = userEvent.setup();
		await user.click(
			screen.getByRole('button', { name: /Thêm kho mới/i }),
		);

		await user.type(screen.getByPlaceholderText('Ví dụ: WH-01'), 'WH-03');
		await user.type(screen.getByPlaceholderText('Ví dụ: Kho chính'), 'Kho mới');
		await user.type(
			screen.getByPlaceholderText('Địa chỉ cụ thể của kho...'),
			'456 DEF, HCM',
		);

		await user.click(
			screen.getByRole('button', { name: /Tạo kho hàng/i }),
		);
		await waitFor(() =>
			expect(stockService.createWarehouse).toHaveBeenCalledTimes(1),
		);
		expect(stockService.createWarehouse).toHaveBeenCalledWith({
			code: 'WH-03',
			name: 'Kho mới',
			address: '456 DEF, HCM',
			isActive: true,
		});
	});

	it('edit an existing warehouse opens edit modal with current values', async () => {
		const warehouses = [
			mockWarehouses({ id: 'wh-1', name: 'Kho chính', code: 'WH-01' }),
		];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Kho chính')).toBeDefined(),
		);

		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: /Sửa/i }));
		expect(screen.getByText('Chỉnh sửa kho hàng')).toBeDefined();
		expect(screen.getByDisplayValue('WH-01')).toBeDefined();
	});

	it('shows delete confirmation when clicking Xóa', async () => {
		const warehouses = [mockWarehouses({ id: 'wh-1', name: 'Kho chính' })];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Kho chính')).toBeDefined(),
		);

		const confirmSpy = vi
			.spyOn(window, 'confirm')
			.mockReturnValue(false);
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: /Xóa/i }));
		expect(confirmSpy).toHaveBeenCalledWith(
			'Bạn có chắc muốn xóa kho hàng này?',
		);
		confirmSpy.mockRestore();
	});

	it('confirm delete calls deleteWarehouse', async () => {
		const warehouses = [mockWarehouses({ id: 'wh-1', name: 'Kho chính' })];
		stockService.getWarehouses.mockResolvedValue(warehouses);
		renderWarehousesPage();
		await waitFor(() =>
			expect(screen.getByText('Kho chính')).toBeDefined(),
		);

		const confirmSpy = vi
			.spyOn(window, 'confirm')
			.mockReturnValue(true);
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: /Xóa/i }));
		await waitFor(() =>
			expect(stockService.deleteWarehouse).toHaveBeenCalledWith('wh-1'),
		);
		confirmSpy.mockRestore();
	});
});
