import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { authService } from '@/services';

// Mock authService from @/services
vi.mock('@/services', () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

// Mock the Icons component
vi.mock('@/components/common/Icons', () => ({
  Icons: {
    LockReset: () => <span data-testid="lock-reset-icon" />,
    AlertWarning: () => <span data-testid="alert-warning-icon" />,
    Spinner: () => <span data-testid="spinner-icon" />,
  },
}));

import { ForgotPasswordPage } from '../ForgotPasswordPage';

beforeAll(() => {
  (import.meta as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_CLIENT_ID = 'test';
});

const renderForgotPasswordPage = () => {
  render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
};

const getEmailInput = () => screen.getByPlaceholderText('ten@vora.vn');

const submitForm = async () => {
  const form = getEmailInput().closest('form')!;
  fireEvent.submit(form);
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render form with email input and submit button', () => {
    renderForgotPasswordPage();

    expect(screen.getByText('VORA')).toBeInTheDocument();
    expect(screen.getByText('Khôi phục mật khẩu')).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi Liên Kết Đặt Lại/i })).toBeInTheDocument();
  });

  it('should show error when authService.forgotPassword throws', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce(new Error('Server error'));

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(await screen.findByText('Đã xảy ra sự cố. Vui lòng thử lại.')).toBeInTheDocument();
  });

  it('should show success message and clear email on success', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce({ message: 'success' });

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(
      await screen.findByText(
        'Nếu tài khoản với email này tồn tại, hệ thống sẽ gửi liên kết đặt lại mật khẩu trong giây lát.'
      )
    ).toBeInTheDocument();
    expect(getEmailInput()).toHaveValue('');
  });

  it('should show loading state with spinner and "Đang gửi..." text', async () => {
    const user = userEvent.setup();
    let resolveFn: (value: { message: string } | PromiseLike<{ message: string }>) => void;
    vi.mocked(authService.forgotPassword).mockImplementation(
      () => new Promise<{ message: string }>((resolve) => { resolveFn = resolve; })
    );

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(screen.getByText('Đang gửi...')).toBeInTheDocument();
    expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();

    resolveFn!({ message: 'success' });
  });

  it('should have "Bạn đã nhớ mật khẩu?" link to /login', () => {
    renderForgotPasswordPage();

    expect(screen.getByText(/Bạn đã nhớ mật khẩu\?/)).toBeInTheDocument();
    const signInLink = screen.getByRole('link', { name: /Đăng nhập/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });
});
