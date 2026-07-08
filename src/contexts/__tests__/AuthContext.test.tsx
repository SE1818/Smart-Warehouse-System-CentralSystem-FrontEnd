import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext, AuthContextType } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import type { User } from '@/types/auth';
import { useContext, useEffect, useState } from 'react';

// Per-test stub setup — direct assignment (no vi.mock ESM issues)
function setupStubs(opts?: {
  loginRes?: { accessToken: string; refreshToken: string; accessTokenExpiresIn: string; role: string };
  registerRes?: { accessToken: string; refreshToken: string; accessTokenExpiresIn: string; role: string };
  logoutOk?: boolean;
  profile?: { id: string; username: string; email: string; role: string; isActive: boolean; createdAt: string };
}) {
  authService.login = vi.fn(async () =>
    opts?.loginRes ?? { accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' }
  );
  authService.register = vi.fn(async () =>
    opts?.registerRes ?? { accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' }
  );
  authService.logout = vi.fn(async () => {
    if (opts?.logoutOk === false) throw new Error('Network');
  });
  authService.getProfile = vi.fn(async () =>
    opts?.profile ?? { id: '99', username: 'p', email: 'e@t.com', role: 'Admin', isActive: true, createdAt: '' }
  );
}

function restoreStubs() {
  authService.login = vi.fn();
  authService.register = vi.fn();
  authService.logout = vi.fn();
  authService.getProfile = vi.fn();
}

// Helper: get the context value synchronously from a mounted consumer.
function getContext(container: HTMLElement): AuthContextType {
  // Trigger a re-render by mutating a tracked state in a descendant.
  // We read context via a rendered function component using direct call.
  // The simplest approach: render with a consumer that calls a ref-setter.
  let ctxVal: AuthContextType | null = null;
  const setter = (v: AuthContextType) => { ctxVal = v; };

  function Consumer({ onReady }: { onReady: (v: AuthContextType) => void }) {
    const ctx = useContext(AuthContext);
    // Only fire when loading is false (settled) or null (initial render)
    if (ctx && !ctx.loading) {
      onReady(ctx);
    }
    return null;
  }

  render(<Consumer onReady={setter} />, { container });
  if (!ctxVal) {
    throw new Error('Context not yet settled — use waitSettledAuth() instead');
  }
  return ctxVal;
}

// Helper: mount inside AuthProvider and wait for loading=false.
// Returns an object with context value and an inner query function.
async function settleAuth(): Promise<AuthContextType> {
  function Consumer({ onReady }: { onReady: (v: AuthContextType) => void }) {
    const ctx = useContext(AuthContext);
    if (ctx && !ctx.loading) {
      onReady(ctx);
    }
    return null;
  }

  const holder: { ctx: AuthContextType | null } = { ctx: null };
  const { container } = render(
    <AuthProvider>
      <Consumer onReady={(c) => { holder.ctx = c; }} />
    </AuthProvider>,
  );

  // Flush the AuthProvider's setTimeout(0) + all micro-tasks
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });

  if (!holder.ctx) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
  }

  if (!holder.ctx) {
    throw new Error('AuthContext did not settle to loading=false within ' +
      'the expected time. Check AuthProvider implementation.');
  }

  // Cleanup all rendered elements (including the Consumer)
  container.innerHTML = '';
  return holder.ctx;
}

// Queries the context synchronously for the "loading=true" check:
// renders only the Consumer (not full tree) — reads context synchronously.
function getLoadingState(): { loading: boolean; user: User | null } {
  let captured: { loading: boolean; user: User | null } | null = null;
  function Consumer() {
    const ctx = useContext(AuthContext);
    captured = { loading: ctx?.loading ?? false, user: ctx?.user ?? null };
    return null;
  }
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
  if (!captured) throw new Error('Consumer did not render');
  return captured;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreStubs();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  // ─── Initialization ──────────────────────────────────────────────────────

  it('loading=true immediately after mount', async () => {
    const state = getLoadingState();
    expect(state.loading).toBe(true);
    expect(state.user).toBeNull();
  });

  it('settles to loading=false with user=null when localStorage is empty', async () => {
    const ctx = await settleAuth();
    expect(ctx.user).toBeNull();
  });

  it('restores user from localStorage when valid JSON is stored', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '42', username: 'restored', email: 'r@t.com', role: 'Admin', isActive: true, createdAt: '' }),
    );
    const ctx = await settleAuth();
    expect(ctx.user).not.toBeNull();
    expect(ctx.user!.username).toBe('restored');
  });

  it('removes malformed user JSON from localStorage', async () => {
    localStorage.setItem('user', 'not-valid-json');
    const ctx = await settleAuth();
    expect(ctx.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ─── login ──────────────────────────────────────────────────────────────

  it('login calls authService.login then getProfile, stores tokens', async () => {
    setupStubs({
      loginRes: { accessToken: 'at-l', refreshToken: 'rt-l', accessTokenExpiresIn: '3600', role: 'Admin' },
      profile: { id: '99', username: 'loginuser', email: 'lo@t.com', role: 'Admin', isActive: true, createdAt: '' },
    });
    const ctx = await settleAuth();

    await act(async () => {
      await ctx.login('test@example.com', 'password123');
    });

    expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-l');
  });

  // ─── register ───────────────────────────────────────────────────────────

  it('register calls authService.register then getProfile, stores token', async () => {
    setupStubs({
      registerRes: { accessToken: 'at-r', refreshToken: 'rt-r', accessTokenExpiresIn: '3600', role: 'User' },
      profile: { id: '55', username: 'reguser', email: 're@t.com', role: 'User', isActive: true, createdAt: '' },
    });
    const ctx = await settleAuth();

    await act(async () => {
      await ctx.register('newuser', 'new@t.com', 'SecurePass1!');
    });

    expect(authService.register).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@t.com',
      password: 'SecurePass1!',
    });
    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-r');
  });

  // ─── logout ─────────────────────────────────────────────────────────────

  it('logout calls API and clears storage', async () => {
    setupStubs({ logoutOk: true });
    const user = { id: '1', username: 'lo', email: 'lo@t.com', role: 'User', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'old-token');
    localStorage.setItem('user', JSON.stringify(user));

    const ctx = await settleAuth();
    await act(async () => {
      await ctx.logout();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logout clears storage even when API rejects', async () => {
    setupStubs({ logoutOk: false });
    const user = { id: '2', username: 'u', email: 'e@t.com', role: 'Admin', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'tok');
    localStorage.setItem('user', JSON.stringify(user));

    const ctx = await settleAuth();
    await act(async () => {
      try {
        await ctx.logout();
      } catch { /* expected */ }
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // ─── refreshUser ────────────────────────────────────────────────────────

  it('refreshUser fetches profile and persists to localStorage', async () => {
    setupStubs();
    authService.getProfile = vi.fn(async () => ({
      id: '7', username: 'refreshed', email: 'r@t.com', role: 'Admin', isActive: true, createdAt: '2024-06-01',
    }));

    const ctx = await settleAuth();
    await act(async () => {
      await ctx.refreshUser();
    });

    expect(authService.getProfile).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.username).toBe('refreshed');
    expect(stored.id).toBe('7');
  });

  it('refreshUser clears storage on 401', async () => {
    setupStubs();
    authService.getProfile = vi.fn(async () => {
      throw new Error('401 Unauthorized');
    });
    const user = { id: '1', username: 'expired', email: 'e@t.com', role: 'User', isActive: true, createdAt: '' };
    localStorage.setItem('authToken', 'expired-token');
    localStorage.setItem('user', JSON.stringify(user));

    const ctx = await settleAuth();
    await act(async () => {
      try {
        await ctx.refreshUser();
      } catch { /* expected */ }
    });

    expect(authService.getProfile).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
