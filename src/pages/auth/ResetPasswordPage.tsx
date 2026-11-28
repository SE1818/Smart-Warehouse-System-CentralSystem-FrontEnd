/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/common/Icons';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid or incomplete reset link.');
    } else {
      setStatus('idle');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      await authService.resetPassword({ email, token, newPassword });
      setStatus('success');
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { passwordResetSuccess: true } });
      }, 3000);
    } catch (err: unknown) {
      setStatus('error');
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setMessage(axiosErr.response?.data?.message || 'Password reset failed. The link may be invalid or expired.');
    }
  };

  if (status === 'loading' && !email && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4">
        <div className="text-red-600">Invalid reset link.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 mx-auto flex items-center justify-center shadow-xs">
            <img src="/brand/vora-icon.png" alt="VORA Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-semibold text-[#0A192F]">
              {status === 'success' ? 'Đặt lại thành công!' : 'Đặt lại mật khẩu'}
            </h1>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Hệ thống Điều phối Vận hành Tập trung
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-medium leading-relaxed ${
            status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
            'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {status !== 'success' && status !== 'error' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0062FF]/15 focus:border-[#0062FF] focus:bg-white transition-all text-sm text-slate-900 font-medium placeholder-slate-400"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0062FF]/15 focus:border-[#0062FF] focus:bg-white transition-all text-sm text-slate-900 font-medium placeholder-slate-400"
                required
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-[#0062FF] hover:bg-[#0052CC] text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Icons.Spinner className="w-4 h-4 text-white" />
                  <span>Đang đặt lại...</span>
                </>
              ) : (
                <span>Đặt Lại Mật Khẩu</span>
              )}
            </button>
          </form>
        )}

        {status !== 'error' && (
          <p className="text-center text-xs text-slate-500 font-medium">
            Bạn đã nhớ mật khẩu?{' '}
            <Link to="/login" className="text-[#0062FF] font-semibold hover:text-[#0052CC] transition-colors">
              Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
