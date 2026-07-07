import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

// Mock authService
vi.mock('@/services', () => ({
  authService: {
    login: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

// Mock the Icons component
vi.mock('@/components/Icons', () => ({
  Icons: {
    Robot: () => <span data-testid="robot-icon">RobotIcon</span>,
    AlertWarning: () => <span data-testid="alert-warning-icon">AlertIcon</span>,
    Spinner: () => <span data-testid="spinner-icon">SpinnerIcon</span>,
  },
}));

import { authService } from '@/services';

// Ensure import.meta.env.VITE_GOOGLE_CLIENT_ID is set before LoginPage is evaluated
beforeAll(() => {
  (import.meta as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
});

const renderLoginPage = () => {
  render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

const getEmailInput = () => screen.getByPlaceholderText('ten@smartwarehouse.com');
const getPasswordInput = () => screen.getByPlaceholderText('••••••••');

/**
 * Submit the form by calling handleSubmit directly.
 * By calling the form's onSubmit handler, we bypass HTML5 validation
 * (required, type=email) that would block submission in jsdom.
 */
const submitForm = async () => {
  const form = screen.getByRole('textbox').closest('form')!;
  // Call the submit handler directly to bypass HTML5 constraint validation
  fireEvent.submit(form);
};

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render login form elements', () => {
    renderLoginPage();
    expect(screen.getByText('SmartWarehouse')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống phân phối hàng hóa tự hành AMR/)).toBeInTheDocument();
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

    expect(screen.getByText('Đang xác thực...')).toBeInTheDocument();
  });

  it('should store token after successful login', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      accessTokenExpiresIn: '3600',
      role: 'user',
      email: 'test@example.com',
    });

    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'password123');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('mock-token');
    });
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.login).mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderLoginPage();

    await user.type(getEmailInput(), 'test@example.com');
    await user.type(getPasswordInput(), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Đăng nhập hệ thống/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should have a link to register page', () => {
    renderLoginPage();
    const registerLinks = screen.getAllByRole('link');
    const registerLink = registerLinks.find(link => link.textContent?.includes('Tạo tài khoản mới'));
    expect(registerLink).toBeTruthy();
  });

  it('should have a forgot password link', () => {
    renderLoginPage();
    expect(screen.getByRole('link', { name: /Quên mật khẩu/i })).toBeInTheDocument();
  });
});
