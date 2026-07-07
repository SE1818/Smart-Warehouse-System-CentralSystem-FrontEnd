import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Initial state ─────────────────────────────────────────────────────

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('settles to loading=false with user=null when localStorage is empty', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  // ─── Restoration from localStorage ────────────────────────────────────

  it('restores user from localStorage when token + user exist', async () => {
    const storedUser = {
      id: 'abc123',
      username: 'john',
      email: 'john@test.com',
      role: 'Admin',
      isActive: true,
      createdAt: '2024-01-01',
    };
    localStorage.setItem('authToken', 'jwt-token');
    localStorage.setItem('user', JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.id).toBe('abc123');
    expect(result.current.user!.email).toBe('john@test.com');
    expect(result.current.user!.role).toBe('Admin');
  });

  it('auto-populates user.id from JWT payload when localStorage user lacks id', async () => {
    // Craft a base64url-encoded JWT payload:  { "sub": "from-jwt" }
    const payload = JSON.stringify({ sub: 'from-jwt', email: 'jwt@test.com' });
    // btoa produces base64, we need base64url (replace +/ with -_ and trim =)
    const base64 = btoa(payload);
    const jwtToken = `header.${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`;

    const userWithoutId = {
      username: 'jwtuser',
      email: 'jwt@test.com',
      role: 'User',
      isActive: true,
      createdAt: '',
    };
    localStorage.setItem('authToken', jwtToken);
    localStorage.setItem('user', JSON.stringify(userWithoutId));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user!.id).toBe('from-jwt');
  });

  it('removes storage and sets user=null when localStorage user JSON is malformed', async () => {
    localStorage.setItem('user', 'not-valid-json');
    localStorage.setItem('authToken', 'some-token');

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ─── login() ───────────────────────────────────────────────────────────

  it('login stores token and userData in localStorage and updates state', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const fakeUser = {
      id: '1',
      username: 'testuser',
      email: 't@t.com',
      role: 'Admin',
      isActive: true,
      createdAt: '',
    };

    act(() => {
      result.current.login('my-token', fakeUser);
    });

    expect(localStorage.getItem('authToken')).toBe('my-token');
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored).toEqual(fakeUser);
    expect(result.current.user).toEqual(fakeUser);
  });

  // ─── logout() ──────────────────────────────────────────────────────────

  it('logout clears localStorage and sets user to null', async () => {
    const storedUser = {
      id: '1',
      username: 'admin',
      email: 'a@t.com',
      role: 'Admin',
      isActive: true,
      createdAt: '',
    };
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ─── edge cases ────────────────────────────────────────────────────────

  it('does not throw when localStorage is cleared mid-test', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Clear storage while hook is mounted
    act(() => {
      localStorage.clear();
    });

    expect(result.current.user).toBeNull();
    expect(() => result.current.logout()).not.toThrow();
  });
});
