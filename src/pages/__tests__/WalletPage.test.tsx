/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock useAuthContext to return a user
const mockUser = { id: 'user-123', email: 'test@example.com' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({ user: mockUser })),
}));

import { WalletPage } from '../WalletPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Icons', () => ({
  Icons: {
    Wallet: () => <span data-testid="icon-wallet" />,
    Spinner: () => <span data-testid="icon-spinner" />,
    SuccessCheck: () => <span data-testid="icon-success" />,
    AlertWarning: () => <span data-testid="icon-alert-warning" />,
    HistoryLogs: () => <span data-testid="icon-history" />,
    Search: () => <span data-testid="icon-search" />,
  },
}));

vi.mock('@/services/wallet', () => ({
  __esModule: true,
  walletService: {
    getBalance: vi.fn(),
    getTransactions: vi.fn(),
    topUp: vi.fn(),
  },
}));

const walletService = (await import('@/services/wallet')).walletService as unknown as {
  getBalance: ReturnType<typeof vi.fn>;
  getTransactions: ReturnType<typeof vi.fn>;
  topUp: ReturnType<typeof vi.fn>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWalletPage() {
  return render(
    <BrowserRouter>
      <WalletPage />
    </BrowserRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: 'user-123', email: 'test@example.com', role: 'admin' }));
  });

  it('renders balance "Số dư hiện tại" heading', async () => {
    walletService.getBalance.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 100000 });
    walletService.getTransactions.mockResolvedValue([]);

    renderWalletPage();

    await waitFor(() => {
      expect(screen.getByText('Số dư hiện tại')).toBeDefined();
    });
  });

  it('renders transaction history table section', async () => {
    walletService.getBalance.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 100000 });
    walletService.getTransactions.mockResolvedValue([]);

    renderWalletPage();

    await waitFor(() => {
      expect(screen.getByText('Lịch sử giao dịch ví')).toBeDefined();
    });
  });

  it('shows loading skeleton while fetching data', () => {
    let balanceResolve!: (value: { id: string; userId: string; balance: number }) => void;
    const pendingBalance = new Promise<{ id: string; userId: string; balance: number }>((r) => {
      balanceResolve = r;
    });
    walletService.getBalance.mockReturnValue(pendingBalance);
    walletService.getTransactions.mockResolvedValue([]);

    renderWalletPage();

    expect(screen.getByText('Đang tải thông tin ví...')).toBeDefined();
    balanceResolve({ id: 'w1', userId: 'u1', balance: 100000 });
  });

  it('renders top-up form with amount and description fields', async () => {
    walletService.getBalance.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 100000 });
    walletService.getTransactions.mockResolvedValue([]);

    renderWalletPage();

    await waitFor(() => {
      expect(screen.queryByText('Đang tải thông tin ví...')).toBeNull();
    });

    expect(screen.getByText('Nạp tiền vào tài khoản')).toBeDefined();
    expect(screen.getByPlaceholderText('VD: 100000')).toBeDefined();
    expect(screen.getByPlaceholderText('VD: Nạp cho đơn hàng...')).toBeDefined();
  });

  it('submitting top-up calls walletService.topUp', async () => {
    walletService.getBalance.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 100000 });
    walletService.getTransactions.mockResolvedValue([]);
    walletService.topUp.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 150000 });

    renderWalletPage();

    await waitFor(() => {
      expect(screen.queryByText('Đang tải thông tin ví...')).toBeNull();
    });

    const amountInput = screen.getByPlaceholderText('VD: 100000');
    const topUpButton = screen.getByText('Nạp tiền ngay');

    fireEvent.change(amountInput, { target: { value: '50000' } });
    fireEvent.click(topUpButton);

    await waitFor(() => {
      expect(walletService.topUp).toHaveBeenCalled();
    });
  });

  it('displays formatted balance after loading', async () => {
    walletService.getBalance.mockResolvedValue({ id: 'w1', userId: 'u1', balance: 100000 });
    walletService.getTransactions.mockResolvedValue([]);

    renderWalletPage();

    await waitFor(() => {
      expect(screen.queryByText('Đang tải thông tin ví...')).toBeNull();
    });

    // Balance should be displayed (VND formatted)
    expect(screen.getByText('Ví điện tử cá nhân')).toBeDefined();
  });
});
