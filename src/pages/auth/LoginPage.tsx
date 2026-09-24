/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/Icons';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for password reset success message from navigation state
  useEffect(() => {
    const state = location.state as { passwordResetSuccess?: boolean } | null;
    if (state?.passwordResetSuccess) {
      setError('');
      setEmailNotVerified(false);
      setError('Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
    }
    if (state) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
          userId = payload.sub || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
        }
      } catch (e) {
        console.error('Failed to parse JWT token:', e);
      }

      localStorage.setItem(
        'user',
        JSON.stringify({
          id: userId,
          role: res.role,
          name: email.split('@')[0] || 'Người dùng',
          email: email,
        })
      );

      // Phân quyền theo vai trò chính xác
      const roleStr = (res.role || '').toLowerCase();
      if (
        roleStr.includes('staff') ||
        roleStr.includes('kds') ||
        roleStr.includes('waiter') ||
        roleStr.includes('kitchen') ||
        roleStr.includes('phucvu')
      ) {
        navigate('/staff');
      } else {
        // Technical Engineer / Kỹ sư kỹ thuật / Quản trị viên
        navigate('/technical');
      }
    } catch (err) {
      console.error('API error during login', err);
      const apiError = err as { response?: { data?: { message?: string; code?: string } } };
      const data = apiError.response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setError(data.message || 'Vui lòng xác thực email trước khi đăng nhập.');
      } else {
        setError(data?.message || 'Email hoặc mật khẩu không chính xác hoặc không thể kết nối đến máy chủ API Gateway.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Vui lòng nhập địa chỉ email trước.');
      return;
    }
    try {
      await authService.resendVerification({ email });
      setError('');
      alert('Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
    } catch {
      setError('Gửi email xác thực thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans px-4 tech-grid relative overflow-hidden">
      {/* Decorative gradient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-850/95 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl p-8 w-full max-w-md space-y-6 relative z-10 text-white">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Icons.Robot className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartWarehouse Robotics</h1>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            Hệ thống Quản Trị & Vận Hành AMR
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs font-semibold leading-relaxed flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <Icons.AlertWarning className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {emailNotVerified && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="self-start text-red-400 font-bold hover:text-red-300 underline text-xs cursor-pointer"
              >
                Gửi lại email xác minh
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Email công vụ
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhanvien@smartwarehouse.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm text-white font-medium placeholder-slate-500 transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Mật khẩu bảo mật
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm text-white font-medium placeholder-slate-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                <span>Đang xác thực hệ thống...</span>
              </>
            ) : (
              <span>Đăng nhập hệ thống</span>
            )}
          </button>
        </form>

        {/* Quick Credentials Pre-fills */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Chọn nhanh vai trò đăng nhập
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('engineer@smartwarehouse.com');
                setPassword('Password123!');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300">
                👷 Kỹ Sư Kỹ Thuật
              </div>
              <div className="text-[10px] text-slate-400 truncate">Role: Technical Engineer</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('staff@smartwarehouse.com');
                setPassword('Password123!');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">
                🍳 Nhân Viên Vận Hành
              </div>
              <div className="text-[10px] text-slate-400 truncate">Role: Staff KDS</div>
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Chỉ dành cho cán bộ kỹ thuật và nhân viên được cấp quyền truy cập.
        </div>
      </div>
    </div>
  );
}
