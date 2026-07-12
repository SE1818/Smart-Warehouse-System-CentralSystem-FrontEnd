import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import { AuthProvider, AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';

/* ---------- shared state to capture real context ---------- */

let capturedCtx: AuthContextType | null = null;

function ExposeAuth({ slot }: { slot: string }) {
  const ctx = useContext(AuthContext);
  useEffect(() => {
    // Store the real context so tests can call its methods directly
    capturedCtx = ctx;
    const node = document.createElement('span');
    node.setAttribute('data-slot', slot);
    node.setAttribute('data-loading', String(ctx?.loading ?? true));
    node.setAttribute('data-user', ctx?.user ? ctx.user.username : 'null');
    document.body.appendChild(node);
    return () => {
      node.remove();
    };
  }, [ctx, slot]);
  return null;
}

function waitForSlot(slot: string, timeout = 3000): Promise<AuthContextType> {
  return new Promise((resolve, reject) => {
    render(
      <AuthProvider>
        <ExposeAuth slot={slot} />
      </AuthProvider>
    );

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out waiting for slot=${slot}`
        )
      );
    }, timeout);

    const check = () => {
      const el = document.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
      if (el && el.getAttribute('data-loading') !== null) {
        const loading = el.getAttribute('data-loading') === 'true';
        if (slot === 'settled' && loading) {
          setTimeout(check, 50);
          return;
        }
        clearTimeout(timer);
        const username = el.getAttribute('data-user');
        cleanup();
        resolve({
          loading,
          user: username === 'null' ? null : ({ username } as AuthContextType['user']),
        } as AuthContextType);
      } else {
        setTimeout(check, 50);
      }
    };

    setTimeout(check, 50);
  });
}

function waitForSettled(timeout = 3000): Promise<AuthContextType> {
  capturedCtx = null;
  const result = waitForSlot('settled', timeout);
  result.then(() => {
    // After settle, expose the real context for action calls
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
  });
  return result;
}

/* ---------- tests ---------- */

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCtx = null;
    Object.assign(authService, {
      login: vi.fn(async () => ({ accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' })),
      register: vi.fn(async () => ({ accessToken: 'tok', refreshToken: 'rt', accessTokenExpiresIn: '3600', role: 'User' })),
      logout: vi.fn(async () => {}),
      getProfile: vi.fn(async () => ({ id: '99', username: 'def', email: 'd@t.com', role: 'User', isActive: true, createdAt: '' })),
    });
    localStorage.clear();
    cleanup();
    document.body.innerHTML = '';
  });

  it('mounts with loading=true', async () => {
    render(
      <AuthProvider>
        <ExposeAuth slot="loading" />
      </AuthProvider>
    );

    await waitFor(
      () => expect(document.querySelector('[data-slot="loading"]')).not.toBeNull(),
      { timeout: 3000 }
    );

    const el = document.querySelector('[data-slot="loading"]') as HTMLElement;
    expect(el.getAttribute('data-loading')).toBe('true');
    expect(el.getAttribute('data-user')).toBe('null');
    cleanup();
  });

  it('settles to loading=false with user=null when localStorage is empty', async () => {
    const ctx = await waitForSettled();
    expect(ctx.loading).toBe(false);
    expect(ctx.user).toBeNull();
  });

  it('restores user from localStorage when valid JSON is stored', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: '42',
        username: 'restored',
        email: 'r@t.com',
        role: 'Admin',
        isActive: true,
        createdAt: '',
      })
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
    const loginMock = vi.fn(async () => ({
      accessToken: 'at-l',
      refreshToken: 'rt-l',
      accessTokenExpiresIn: '3600',
      role: 'Admin',
    }));
    const profileMock = vi.fn(async () => ({
      id: '99',
      username: 'loginuser',
      email: 'lo@t.com',
      role: 'Admin',
      isActive: true,
      createdAt: '',
    }));
    authService.login = loginMock;
    authService.getProfile = profileMock;

    await waitForSettled();
    // Re-render to get fresh context pointing to the new mocks
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    await capturedCtx!.login('test@example.com', 'password123');

    expect(loginMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(profileMock).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-l');
  });

  it('register calls authService.register then getProfile, stores token', async () => {
    const registerMock = vi.fn(async () => ({
      accessToken: 'at-r',
      refreshToken: 'rt-r',
      accessTokenExpiresIn: '3600',
      role: 'User',
    }));
    const profileMock = vi.fn(async () => ({
      id: '55',
      username: 'reguser',
      email: 're@t.com',
      role: 'User',
      isActive: true,
      createdAt: '',
    }));
    authService.register = registerMock;
    authService.getProfile = profileMock;

    await waitForSettled();
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    await capturedCtx!.register('newuser', 'new@t.com', 'SecurePass1!');

    expect(registerMock).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@t.com',
      password: 'SecurePass1!',
    });
    expect(profileMock).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe('at-r');
  });

  it('logout calls API and clears storage', async () => {
    const logoutMock = vi.fn(async () => {});
    authService.logout = logoutMock;

    localStorage.setItem('authToken', 'old-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', username: 'lo', email: 'lo@t.com', role: 'User', isActive: true, createdAt: '' })
    );

    await waitForSettled();
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    await capturedCtx!.logout();

    expect(logoutMock).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logout clears storage even when API rejects', async () => {
    const logoutMock = vi.fn(async () => {
      throw new Error('Network');
    });
    authService.logout = logoutMock;

    localStorage.setItem('authToken', 'tok');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '2', username: 'u', email: 'e@t.com', role: 'Admin', isActive: true, createdAt: '' })
    );

    await waitForSettled();
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    try {
      await capturedCtx!.logout();
    } catch {
      /* expected */
    }

    expect(logoutMock).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('refreshUser fetches profile and persists to localStorage', async () => {
    const profileMock = vi.fn(async () => ({
      id: '7',
      username: 'refreshed',
      email: 'r@t.com',
      role: 'Admin',
      isActive: true,
      createdAt: '2024-06-01',
    }));
    authService.getProfile = profileMock;

    await waitForSettled();
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    await capturedCtx!.refreshUser();

    expect(profileMock).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.username).toBe('refreshed');
    expect(stored.id).toBe('7');
  });

  it('refreshUser clears storage on 401', async () => {
    const profileMock = vi.fn(async () => {
      throw new Error('401 Unauthorized');
    });
    authService.getProfile = profileMock;

    localStorage.setItem('authToken', 'expired-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', username: 'expired', email: 'e@t.com', role: 'User', isActive: true, createdAt: '' })
    );

    await waitForSettled();
    render(
      <AuthProvider>
        <ExposeAuth slot="ctx" />
      </AuthProvider>
    );
    await waitFor(() => capturedCtx !== null && (capturedCtx.loading === false));

    try {
      await capturedCtx!.refreshUser();
    } catch {
      /* expected */
    }

    expect(profileMock).toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
