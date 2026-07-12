/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/Icons', () => ({
  Icons: {
    LockReset: () => <span data-testid="lock-reset-icon" />,
    Spinner: () => <span data-testid="spinner-icon" />,
    Check: () => <span data-testid="check-icon" />,
    AlertWarning: () => <span data-testid="alert-warning-icon" />,
  },
}));

vi.mock('@/services', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

import { ResetPasswordPage } from '../ResetPasswordPage';
import { authService } from '@/services';

function renderResetPassword(entries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.mocked(authService.resetPassword).mockReset();
  });

  it('shows error when no token in URL', async () => {
    renderResetPassword(['/reset-password?email=test@example.com']);
    expect(await screen.findByText('Invalid or incomplete reset link.')).toBeDefined();
  });

  it('shows error when no email in URL', async () => {
    renderResetPassword(['/reset-password?token=some-token']);
    expect(await screen.findByText('Invalid or incomplete reset link.')).toBeDefined();
  });

  it('renders form when token and email present', async () => {
    renderResetPassword(['/reset-password?token=valid-token&email=test@example.com']);
    expect(await screen.findByText('Set New Password')).toBeDefined();
    const pws = screen.getAllByPlaceholderText('••••••••');
    expect(pws.length).toBe(2);
  });

  it('shows error when passwords do not match', async () => {
    renderResetPassword(['/reset-password?token=valid-token&email=test@example.com']);
    await waitFor(() => expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2));
    const [pw1, pw2] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(pw1, { target: { value: 'password123' } });
    fireEvent.change(pw2, { target: { value: 'different' } });
    const form = (pw2 as HTMLElement).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText('Passwords do not match.')).toBeDefined();
  });

  it('shows error when password < 8 chars', async () => {
    renderResetPassword(['/reset-password?token=valid-token&email=test@example.com']);
    await waitFor(() => expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2));
    const [pw1, pw2] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(pw1, { target: { value: 'short' } });
    fireEvent.change(pw2, { target: { value: 'short' } });
    const form = (pw2 as HTMLElement).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeDefined();
  });

  it('success calls resetPassword with correct data', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValueOnce({ message: 'success' });
    renderResetPassword(['/reset-password?token=valid-token&email=test@example.com']);
    await waitFor(() => expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2));
    const [pw1, pw2] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(pw1, { target: { value: 'password123' } });
    fireEvent.change(pw2, { target: { value: 'password123' } });
    const form = (pw2 as HTMLElement).closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText((content) => content.includes('Password reset successfully'))).toBeInTheDocument();
  });
});
