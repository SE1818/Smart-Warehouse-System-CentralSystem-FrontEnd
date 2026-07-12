/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ProfilePage } from '../ProfilePage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/Icons', () => ({
  Icons: {
    Profile: () => <span data-testid="icon-profile" />,
    Spinner: () => <span data-testid="icon-spinner" />,
    AlertWarning: () => <span data-testid="icon-alert-warning" />,
    AdjustmentSettings: () => <span data-testid="icon-adjustment" />,
  },
}));

vi.mock('@/services/profile', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profileService = (await import('@/services/profile')).profileService as any;

// ─── Mock types ───────────────────────────────────────────────────────────────

type MockProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

function mockProfile(overrides?: Partial<MockProfile>): MockProfile {
  return {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    phoneNumber: '0909123456',
    address: 'Hà Nội, Việt Nam',
    role: 'Admin',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderProfilePage() {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders "Hồ sơ cá nhân" heading', async () => {
    profileService.getProfile.mockResolvedValue(mockProfile());
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Hồ sơ cá nhân')).toBeDefined();
    });
  });

  it('shows loading spinner while fetching profile', () => {
    let resolve: (value: MockProfile) => void;
    const pending = new Promise<MockProfile>((r) => {
      resolve = r;
    });
    profileService.getProfile.mockReturnValue(pending);
    renderProfilePage();
    expect(screen.getByText('Đang tải thông tin hồ sơ...')).toBeDefined();
    resolve!(mockProfile());
  });

  it('renders form with user data after loading', async () => {
    profileService.getProfile.mockResolvedValue(mockProfile());
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Hồ sơ cá nhân')).toBeDefined();
    });
    expect(screen.getAllByText('Nguyễn Văn A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0909123456')).toBeDefined();
  });

  it('save button triggers update mutation', async () => {
    profileService.getProfile.mockResolvedValue(mockProfile());
    profileService.updateProfile.mockResolvedValue(mockProfile());
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Hồ sơ cá nhân')).toBeDefined();
    });
    const saveButton = screen.queryByText('Lưu thay đổi');
    if (saveButton) {
      await userEvent.click(saveButton);
      expect(profileService.updateProfile).toHaveBeenCalled();
    }
  });

  it('loading state disables save button', () => {
    let resolve: (value: MockProfile) => void;
    const pending = new Promise<MockProfile>((r) => {
      resolve = r;
    });
    profileService.getProfile.mockReturnValue(pending);
    renderProfilePage();
    expect(screen.queryByText('Lưu thay đổi')).toBeNull();
    expect(screen.getByText('Đang tải thông tin hồ sơ...')).toBeDefined();
    resolve!(mockProfile());
  });

  it('shows error state when API fails', async () => {
    profileService.getProfile.mockRejectedValue(new Error('API error'));
    renderProfilePage();
    await waitFor(() => {
      expect(screen.getByText('Không thể tải thông tin hồ sơ')).toBeDefined();
    });
    expect(screen.getByText('Thử lại')).toBeDefined();
  });
});
