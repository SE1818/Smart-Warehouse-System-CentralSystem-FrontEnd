import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('authToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify({ role: res.role, name: email.split('@')[0] || 'Nhân viên', email: email }));
      // Supabase roles: 'warehouse_manager' = Warehouse Admin, 'Customer' = regular user
      const isAdmin = res.role === 'warehouse_manager' || res.role === 'Warehouse_Admin' || res.role === 'Admin';
      navigate(isAdmin ? '/admin/dashboard' : '/');
    } catch (err: any) {
      console.error('API error during login', err);
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác hoặc không thể kết nối đến máy chủ API Gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 tech-grid">
      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-2xl p-8 w-full max-w-md space-y-6 glow-blue">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl font-heading font-black shadow-lg shadow-brand-500/10">
            🤖
          </div>
          <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight">SmartWarehouse</h1>
          <p className="text-slate-505 text-sm font-medium">Hệ thống phân phối hàng hóa tự hành AMR</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest">Email truy cập</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@smartwarehouse.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-widest">Mật khẩu bảo mật</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 hover:shadow-brand-500/25 active:scale-98 transition-all flex items-center justify-center"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-505 font-medium">
          Chưa có tài khoản đăng ký?{' '}
          <Link to="/register" className="text-brand-650 font-bold hover:underline">
            Tạo tài khoản mới
          </Link>
        </p>
      </div>
    </div>
  );
}
