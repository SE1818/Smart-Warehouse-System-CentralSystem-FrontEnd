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
vi.mock('@/components/Icons', () => ({
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

const getEmailInput = () => screen.getByPlaceholderText('ten@smartwarehouse.com');

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

    expect(screen.getByText('SmartWarehouse')).toBeInTheDocument();
    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it('should show error when authService.forgotPassword throws', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce(new Error('Server error'));

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(await screen.findByText('An error occurred. Please try again.')).toBeInTheDocument();
  });

  it('should show success message and clear email on success', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce(undefined);

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(
      await screen.findByText(
        'If an account with that email exists, you will receive a password reset link shortly.'
      )
    ).toBeInTheDocument();
    expect(getEmailInput()).toHaveValue('');
  });

  it('should show loading state with spinner and "Sending..." text', async () => {
    const user = userEvent.setup();
    let resolveFn: (value: void | PromiseLike<void>) => void;
    vi.mocked(authService.forgotPassword).mockImplementation(
      () => new Promise<void>((resolve) => { resolveFn = resolve; })
    );

    renderForgotPasswordPage();

    await user.type(getEmailInput(), 'test@example.com');
    await submitForm();

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();

    resolveFn!();
  });

  it('should have "Remember your password?" link to /login', () => {
    renderForgotPasswordPage();

    expect(screen.getByText(/Remember your password\?/)).toBeInTheDocument();
    const signInLink = screen.getByRole('link', { name: /Sign in/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });
});
