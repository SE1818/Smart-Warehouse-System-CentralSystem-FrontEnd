import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authService } from '@/services';

// Mock authService from @/services
vi.mock('@/services', () => ({
  authService: {
    verifyEmail: vi.fn(),
  },
}));

// Mock the Icons component
vi.mock('@/components/Icons', () => ({
  Icons: {
    Spinner: () => <span data-testid="spinner-icon" />,
    Check: () => <span data-testid="check-icon" />,
    AlertWarning: () => <span data-testid="alert-warning-icon" />,
  },
}));

import { VerifyEmailPage } from '../VerifyEmailPage';

const renderVerifyEmailPage = (initialEntries: string[] = ['/']) => {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <VerifyEmailPage />
    </MemoryRouter>
  );
};

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should show error when no token in URL', async () => {
    renderVerifyEmailPage(['/verify-email']);

    // No token -> useEffect immediately sets error state
    expect(await screen.findByText('Missing verification token.')).toBeInTheDocument();
  });

  it('should call verifyEmail when token is present', async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValueOnce({ message: 'success' });

    renderVerifyEmailPage(['/verify-email?token=valid-token']);

    await waitFor(() => {
      expect(authService.verifyEmail).toHaveBeenCalledWith('valid-token');
    });
  });

  it('should show success state after verification', async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValueOnce({ message: 'success' });

    renderVerifyEmailPage(['/verify-email?token=valid-token']);

    expect(await screen.findByText('Email verified successfully! Redirecting to login...')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.getByText('Email Verified!')).toBeInTheDocument();
  });

  it('should show error on API failure', async () => {
    vi.mocked(authService.verifyEmail).mockRejectedValueOnce({
      response: { data: { message: 'Invalid or expired token.' } },
    });

    renderVerifyEmailPage(['/verify-email?token=expired-token']);

    expect(await screen.findByText('Invalid or expired token.')).toBeInTheDocument();
    expect(screen.getByTestId('alert-warning-icon')).toBeInTheDocument();
    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
  });

  it('should show "Go to Login" link in all states', async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValueOnce({ message: 'success' });

    renderVerifyEmailPage(['/verify-email?token=valid-token']);

    // Link is always rendered (not conditional on status)
    expect(screen.getByText('Go to Login')).toBeInTheDocument();
    const goToLoginLink = screen.getByRole('link', { name: /Go to Login/i });
    expect(goToLoginLink).toHaveAttribute('href', '/login');
  });

  it('should show "Go to Login" link on loading state', async () => {
    let resolveFn: (value: { message: string } | PromiseLike<{ message: string }>) => void;
    vi.mocked(authService.verifyEmail).mockImplementation(
      () => new Promise<{ message: string }>((resolve) => { resolveFn = resolve; })
    );

    renderVerifyEmailPage(['/verify-email?token=valid-token']);

    // Loading state shows message and link
    expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
    expect(screen.getByText('Go to Login')).toBeInTheDocument();

    resolveFn!({ message: 'success' });
  });
});
