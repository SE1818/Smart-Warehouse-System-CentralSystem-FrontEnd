import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services';
import { Icons } from '@/components/common/Icons';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authService.forgotPassword({ email });
      setMessage('Nếu tài khoản với email này tồn tại, hệ thống sẽ gửi liên kết đặt lại mật khẩu trong giây lát.');
      setEmail('');
    } catch {
      setError('Đã xảy ra sự cố. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 mx-auto flex items-center justify-center shadow-xs">
            <img src="/brand/vora-icon.png" alt="VORA Emblem" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold text-[#0A192F] tracking-normal font-heading">VORA</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Khôi phục mật khẩu</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium leading-relaxed flex items-start gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium leading-relaxed">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@vora.vn"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0062FF]/15 focus:border-[#0062FF] focus:bg-white transition-all text-sm text-slate-900 font-medium placeholder-slate-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0062FF] hover:bg-[#0052CC] text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Icons.Spinner className="w-4 h-4 text-white" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <span>Gửi Liên Kết Đặt Lại</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium">
          Bạn đã nhớ mật khẩu?{' '}
          <Link to="/login" className="text-[#0062FF] font-semibold hover:text-[#0052CC] transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
