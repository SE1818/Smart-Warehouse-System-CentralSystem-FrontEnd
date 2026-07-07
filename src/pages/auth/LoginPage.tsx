/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/Icons';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID is not set in .env');
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Check for password reset success message from navigation state
  useEffect(() => {
    const state = location.state as { passwordResetSuccess?: boolean } | null;
    if (state?.passwordResetSuccess) {
      setError('');
      setEmailNotVerified(false);
      // Show a success message temporarily
      setError('Password reset successfully. You can now log in with your new password.');
    }
    // Clear state after showing
    if (state) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load Google Identity Services and render button
  useEffect(() => {
    const loadGoogleScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as Window & typeof globalThis & { google?: unknown }).google) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google script'));
        document.head.appendChild(script);
      });
    };

    const initializeGoogle = async () => {
      try {
        await loadGoogleScript();
        const google = (window as Window & typeof globalThis & { google?: { accounts?: { id?: { initialize?: (cfg: Record<string, unknown>) => void; renderButton?: (el: HTMLElement, cfg: Record<string, unknown>) => void } } } }).google;
        if (!google) return;

        // Define callback for Google credential response
        const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
          if (!response.credential) {
            setError('Không nhận được thông tin xác thực từ Google.');
            return;
          }

          setGoogleLoading(true);
          setError('');
          try {
            const res = await authService.externalLogin({ provider: 'Google', idToken: response.credential });
            // Store tokens and user info (no profile fetch needed - data from login response)
            localStorage.setItem('authToken', res.accessToken);
            localStorage.setItem('authRole', res.role);

            let userId = '';
            try {
              const tokenParts = res.accessToken.split('.');
              if (tokenParts.length > 1) {
                const payload = JSON.parse(atob(tokenParts[1]));
                userId = payload.sub || payload.nameid || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || '';
              }
            } catch (e) {
              console.error('Failed to parse external JWT token:', e);
            }

            localStorage.setItem('user', JSON.stringify({
              id: userId,
              role: res.role,
              name: (res.email || '').split('@')[0] || 'Nhân viên',
              email: res.email || ''
            }));
            navigate(res.role === 'admin' || res.role === 'admin' || res.role === 'Admin' ? '/admin/dashboard' : '/');
          } catch (err) {
            console.error('Google login error:', err);
            const apiError = err as { response?: { data?: { message?: string } } };
            setError(apiError.response?.data?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
          } finally {
            setGoogleLoading(false);
          }
        };

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        if (googleButtonRef.current) {
          google.accounts.id.renderButton(
            googleButtonRef.current,
            { theme: 'outline', size: 'large', width: 320, text: 'signin_with' }
          );
        }
      } catch (err) {
        console.error('Google init error:', err);
        setGoogleError('Tính năng đăng nhập Google tạm thời không khả dụng do origin chưa được cấu hình. Vui lòng dùng email/mật khẩu.');
      }
    };

    initializeGoogle();
  }, [navigate]); // navigate is stable

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Email không được để trống.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Email không đúng định dạng.');
      return false;
    }
    if (!password) {
      setError('Mật khẩu không được để trống.');
      return false;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNotVerified(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('authToken', res.accessToken);

      let userId = '';
      try {
        const tokenParts = res.accessToken.split('.');
        if (tokenParts.length > 1) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub || payload.nameid || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || '';
        }
      } catch (e) {
        console.error('Failed to parse JWT token:', e);
      }

      localStorage.setItem('user', JSON.stringify({
        id: userId,
        role: res.role,
        name: email.split('@')[0] || 'Nhân viên',
        email: email
      }));
      const isAdmin = res.role === 'admin' || res.role === 'admin' || res.role === 'Admin' || res.role === 'store_manager';
      navigate(isAdmin ? '/admin/dashboard' : '/');
    } catch (err) {
      console.error('API error during login', err);
      const apiError = err as { response?: { data?: { message?: string, code?: string } } };
      const data = apiError.response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setError(data.message || 'Please verify your email before logging in.');
      } else {
        setError(data?.message || 'Email hoặc mật khẩu không chính xác hoặc không thể kết nối đến máy chủ API Gateway.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await authService.resendVerification({ email });
      setError('');
      alert('A new verification email has been sent. Please check your inbox.'); // todo: replace with inline message
    } catch {
      setError('Failed to send verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 tech-grid relative overflow-hidden">
      {/* Decorative gradient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-2xl p-8 w-full max-w-md space-y-6 glow-blue relative z-10">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Icons.Robot className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight">SmartWarehouse</h1>
          <p className="text-slate-500 text-sm font-medium">Hệ thống phân phối hàng hóa tự hành AMR</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {emailNotVerified && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="self-start text-red-600 font-bold hover:text-red-700 underline text-xs"
              >
                Gửi lại email xác minh
              </button>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email truy cập</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@smartwarehouse.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-widest">Mật khẩu bảo mật</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-brand-600 font-bold hover:text-brand-700 transition-colors">
              Quên mật khẩu?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-brand-500/15 hover:shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <span>Đăng nhập hệ thống</span>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-50 text-slate-500">Hoặc</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          {googleError ? (
            <div className="w-full flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
              <span>{googleError}</span>
            </div>
          ) : (
            <>
              <div ref={googleButtonRef}></div>
              {googleLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icons.Spinner className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực Google...</span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 font-medium">
          Chưa có tài khoản đăng ký?{' '}
          <Link to="/register" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">
            Tạo tài khoản mới
          </Link>
        </p>
        <p className="text-center text-xs text-slate-550 font-medium mt-2">
          Bạn muốn mở cửa hàng kinh doanh?{' '}
          <Link to="/register-store" className="text-brand-600 font-bold hover:text-brand-700 transition-colors underline">
            Đăng ký mở cửa hàng
          </Link>
        </p>
      </div>
    </div>
  );
}


