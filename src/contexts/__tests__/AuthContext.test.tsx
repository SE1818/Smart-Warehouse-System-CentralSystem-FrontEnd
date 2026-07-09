import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import { AuthProvider, AuthContext } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import type { AuthContextType } from '@/contexts/AuthContext';

function setupStubs(opts?: {
  loginRes?: { accessToken: string; refreshToken: string; accessTokenExpiresIn: string; role: string };
  registerRes?: { accessToken: string; refreshToken: string; accessTokenExpiresIn: string; role: string };
  logoutOk?: boolean;
  profile?: { id: string; username: string; email: string; role: string; isActive: boolean; createdAt: string };
}) {
  authService.login = vi.fn(async () =>
    opts?.loginRes ?? { accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' });
  authService.register = vi.fn(async () =>
    opts?.loginRes ?? { accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' });
  authService.logout = vi.fn(async () => {
    if (opts?.logoutOk === false) throw new Error('Network');
  });
  authService.getProfile = vi.fn(async () =>
    opts?.profile ?? { id: '99', username: 'p', email: 'e@t.com', role: 'Admin', isActive: true, createdAt: '' });
}

function restoreStubs() {
  authService.login = vi.fn();
  authService.register = vi.fn();
  authService.logout = vi.fn();
  authService.getProfile = vi.fn();
}

function ExposeAuth({ slot }: { slot: string }) {
  const ctx = useContext(AuthContext);
  if (!ctx) return null;
  useEffect(() => {
    const el = document.createElement('span');
    el.dataset.slot = slot;
    el.dataset.loading = String(ctx.loading);
    el.dataset.user = ctx.user ? ctx.user.username : 'null';
    document.body.appendChild(el);
    return () => el.remove();
  }, [ctx, slot]);
  return null;
}

function waitForSlot(slot: string, timeout = 3000): Promise<AuthContextType> {
  return new Promise((resolve, reject) => {
    render(
      <AuthProvider>
        <ExposeAuth slot={slot} />
      </AuthProvider>,
    );

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-slot="${slot}"]`);
      const loading = el?.dataset.loading;
      const username = el?.dataset.user;
      cleanup();
      reject(new Error(`Timed out waiting for slot=${slot}, loading=${loading}, user=${username}`));
    }, timeout);

    const check = () => {
      const el = document.querySelector(`[data-slot="${slot}"]`);
      if (el && el.dataset.loading !== undefined) {
        clearTimeout(timer);
        const loading = el.dataset.loading === 'true';
        const username = el.dataset.user;
        cleanup();
        resolve({ loading, user: username === 'null' ? null : { username } as AuthContextType['user'] });
      } else {
        setTimeout(check, 50);
      }
    };

    setTimeout(check, 50);
  });
}

function waitForSettled(timeout = 3000): Promise<AuthContextType> {
  return waitForSlot('settled', timeout);
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreStubs();
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
  });

  it('mounts with loading=true', async () => {
    render(
      <AuthProvider>
        <ExposeAuth slot="loading" />
      </AuthProvider>,
    );

    await waitFor(
      () => expect(document.querySelector('[data-slot="loading"]')).not.toBeNull(),
      { timeout: 3000 },
    );
    const el = document.querySelector('[data-slot="loading"]')!;
    expect(el.dataset.loading).toBe('true');
    expect(el.dataset.user).toBe('null');
    cleanup();
  });

  it('settles to loading=false with user=null when localStorage is empty', async () => {
    const ctx = await waitForSettled();
    expect(ctx.user).toBeNull();
  });

  it('restores user from localStorage when valid JSON is stored', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '42', username: 'restored', email: 'r@t.com', role: 'Admin', isActive: true, createdAt: '' }),
    );
    const ctx = await waitForSettled();
    expect(ctx.user).not.toBeNull();
    if (ctx.user) expect(ctx.user.username).toBe('restored');
  });

  it('removes malformed user JSON from localStorage', async () => {
    localStorage.setItem('user', 'not-valid-json');
    const ctx = await waitForSettled();
    expect(ctx.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('login calls authService.login then getProfile, stores tokens', async () => {
    setupStubs({
      loginRes: { accessToken: 'at-l', refreshToken: 'rt-l', accessTokenExpiresIn: '3600', role: 'Admin' },
      profile: { id: '99', username: 'loginuser', email: 'lo@t.com', role: 'Admin', isActive: true, createdAt: '' },
    });
    const ctx = await waitForSettled();
    await ctx.login('test@example.com', 'password123');
    expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-l');
  });

  it('register calls authService.register then getProfile, stores token', async () => {
    setupStubs({
      registerRes: { accessToken: 'at-r', refreshToken: 'rt-r', accessTokenExpiresIn: '3600', role: 'User' },
      profile: { id: '55', username: 'reguser', email: 're@t.com', role: 'User', isActive: true, createdAt: '' },
    });
    const ctx = await waitForSettled();
    await ctx.register('newuser', 'new@t.com', 'SecurePass1!');
    expect(authService.register).toHaveBeenCalledWith({ username: 'newuser', email: 'new@t.com', password: 'SecurePass1!' });
    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-r');
  });

  it('logout calls API and clears storage', async () => {
    setupStubs({ logoutOk: true });
    const user = { id: '1', username: 'lo', email: 'lo@t.com', role: 'User', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'old-token');
    localStorage.setItem('user', JSON.stringify(user));

    const ctx = await waitForSettled();
    await ctx.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logout clears storage even when API rejects', async () => {
    setupStubs({ logoutOk: false });
    const user = { id: '2', username: 'u', email: 'e@t.com', role: 'Admin', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'tok');
    localStorage.setItem('user', JSON.stringify(user));

    const ctx = await waitForSettled();
    try { await ctx.logout(); } catch { /* expected */ }
    expect(authService.logout).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('refreshUser fetches profile and persists to localStorage', async () => {
    setupStubs();
    authService.getProfile = vi.fn(async () => ({
      id: '7', username: 'refreshed', email: 'r@t.com', role: 'Admin', isActive: true, createdAt: '2024-06-01',
    }));
    const ctx = await waitForSettled();
    await ctx.refreshUser();
    expect(authService.getProfile).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.username).toBe('refreshed');
    expect(stored.id).toBe('7');
  });

  it('refreshUser clears storage on 401', async () => {
    setupStubs();
    authService.getProfile = vi.fn(async () => { throw new Error('401 Unauthorized'); });
    const user = { id: '1', username: 'expired', email: 'e@t.com', role: 'User', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'expired-token');
    localStorage.setItem('user', JSON.stringify(user));
    const ctx = await waitForSettled();
    try { await ctx.refreshUser(); } catch { /* expected */ }
    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
