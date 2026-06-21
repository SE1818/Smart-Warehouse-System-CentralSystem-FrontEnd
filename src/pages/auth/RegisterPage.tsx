import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/Icons';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const hasRepeatingChars = (str: string): boolean => {
    for (let i = 0; i < str.length - 2; i++) {
      if (str[i] === str[i + 1] && str[i] === str[i + 2]) {
        return true;
      }
    }
    return false;
  };

  const hasSequentialChars = (str: string): boolean => {
    for (let i = 0; i < str.length - 2; i++) {
      const code1 = str.charCodeAt(i);
      const code2 = str.charCodeAt(i + 1);
      const code3 = str.charCodeAt(i + 2);
      if (code2 === code1 + 1 && code3 === code1 + 2) return true;
      if (code2 === code1 - 1 && code3 === code1 - 2) return true;
    }
    return false;
  };

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError('Tên tài khoản không được để trống.');
      return false;
    }
    if (username.trim().length < 3) {
      setError('Tên tài khoản phải có ít nhất 3 ký tự.');
      return false;
    }

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
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ cái viết hoa.');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ cái viết thường.');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ số.');
      return false;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một ký tự đặc biệt.');
      return false;
    }
    if (hasRepeatingChars(password)) {
      setError('Mật khẩu không được chứa quá 2 ký tự lặp lại liên tiếp.');
      return false;
    }
    if (hasSequentialChars(password)) {
      setError('Mật khẩu không được chứa chuỗi ký tự liên tiếp.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({ username, email, password });
      localStorage.setItem('authToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify({ role: res.role, name: username, email: email }));
      const isAdmin = res.role === 'warehouse_manager' || res.role === 'Warehouse_Admin' || res.role === 'Admin';
      navigate(isAdmin ? '/admin/dashboard' : '/');
    } catch (err) {
      console.error('API error during registration', err);
      const apiError = err as { response?: { data?: { message?: string, errors?: Record<string, string[]> } } };
      
      let errorMsg = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (apiError.response?.data?.errors) {
        // FluentValidation returns nested errors object, let's extract the first error message
        const firstErrorKey = Object.keys(apiError.response.data.errors)[0];
        const errorsList = apiError.response.data.errors[firstErrorKey];
        if (errorsList && errorsList.length > 0) {
          errorMsg = errorsList[0];
        }
      } else if (apiError.response?.data?.message) {
        errorMsg = apiError.response.data.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
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
          <p className="text-slate-500 text-sm font-medium">Tạo tài khoản mới</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên người dùng</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nguyen Van A"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-brand-500/15 hover:shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              <span>Đăng ký</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

