import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

// Mock authService and tenantService
vi.mock('@/services', () => ({
  authService: {
    login: vi.fn(),
    resendVerification: vi.fn(),
  },
  tenantService: {
    resolveUserTenant: vi.fn().mockResolvedValue(null),
  },
}));

// Mock the Icons component
vi.mock('@/components/common/Icons', () => ({
  Icons: {
    Robot: () => <span data-testid="robot-icon">RobotIcon</span>,
    AlertWarning: () => <span data-testid="alert-warning-icon">AlertIcon</span>,
    Spinner: () => <span data-testid="spinner-icon">SpinnerIcon</span>,
  },
}));

import { authService } from '@/services';

const renderLoginPage = () => {
  render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

const getEmailInput = () => screen.getByPlaceholderText('nhanvien@smartwarehouse.com');
const getPasswordInput = () => screen.getByPlaceholderText('••••••••');

const submitForm = async () => {
  const form = screen.getByPlaceholderText('nhanvien@smartwarehouse.com').closest('form')!;
  fireEvent.submit(form);
};

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render login form elements', () => {
    renderLoginPage();
    expect(screen.getByText('VORA')).toBeInTheDocument();
    expect(screen.getByText('CENTRAL OS')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống Quản Trị & Vận Hành AMR/i)).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng nhập hệ thống/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderLoginPage();
    await submitForm();
    expect(await screen.findByText('Email không được để trống.')).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(getEmailInput(), 'invalid-email');
    await user.type(getPasswordInput(), 'password123');
    await submitForm();

    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument();
  });

  it('should validate minimum password length', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), '12345');
    await submitForm();

    expect(await screen.findByText('Mật khẩu phải có ít nhất 6 ký tự.')).toBeInTheDocument();
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockImplementation(() => new Promise(() => {}));

    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    expect(screen.getByText('Đang xác thực hệ thống...')).toBeInTheDocument();
  });

  it('should store token after successful login', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'mock.eyJzdWIiOiIxMjMiLCJyb2xlIjoidGVjaG5pY2FsIn0=.token',
      refreshToken: 'mock-refresh',
      accessTokenExpiresIn: '3600',
      role: 'technical',
      email: 'engineer@smartwarehouse.com',
    });

    renderLoginPage();

    await user.type(getEmailInput(), 'engineer@smartwarehouse.com');
    await user.type(getPasswordInput(), 'Password123!');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('mock.eyJzdWIiOiIxMjMiLCJyb2xlIjoidGVjaG5pY2FsIn0=.token');
      expect(localStorage.getItem('refreshToken')).toBe('mock-refresh');
    });
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockRejectedValueOnce({
      response: { data: { message: 'Sai email hoặc mật khẩu' } },
    });

    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    expect(await screen.findByText('Sai email hoặc mật khẩu')).toBeInTheDocument();
  });

  it('should populate credentials when quick role buttons are clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const techBtn = screen.getByRole('button', { name: /Kỹ Sư Kỹ Thuật/i });
    await user.click(techBtn);

    expect(getEmailInput()).toHaveValue('engineer@smartwarehouse.com');
    expect(getPasswordInput()).toHaveValue('Password123!');

    const staffBtn = screen.getByRole('button', { name: /Nhân Viên Vận Hành/i });
    await user.click(staffBtn);

    expect(getEmailInput()).toHaveValue('staff@smartwarehouse.com');
    expect(getPasswordInput()).toHaveValue('Password123!');
  });

  it('should display password reset success message from navigation state', async () => {
    const { MemoryRouter } = await import('react-router-dom');
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { passwordResetSuccess: true } }]}>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.')).toBeInTheDocument();
  });

  it('should handle resend verification email', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockRejectedValueOnce({
      response: { data: { code: 'EMAIL_NOT_VERIFIED', message: 'Email chưa xác minh.' } },
    });
    vi.mocked(authService.resendVerification).mockResolvedValueOnce({ message: 'Success' });

    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    const resendBtn = await screen.findByRole('button', { name: 'Gửi lại email xác minh' });
    expect(resendBtn).toBeInTheDocument();

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await user.click(resendBtn);
    expect(authService.resendVerification).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(alertSpy).toHaveBeenCalledWith('Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
    alertSpy.mockRestore();
  });
});
