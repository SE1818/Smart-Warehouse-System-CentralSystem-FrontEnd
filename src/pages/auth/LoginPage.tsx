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
      navigate(res.role === 'Warehouse_Admin' || res.role === 'Admin' ? '/admin/dashboard' : '/');
    } catch (err) {
      console.warn('API error during login, falling back to mock authentication', err);
      
      // Fallback for manual testing/offline demo
      if (email === 'admin@smartwarehouse.com' && password === 'password') {
        localStorage.setItem('authToken', 'mock-admin-token');
        localStorage.setItem('user', JSON.stringify({ role: 'Admin', name: 'Lê Hoàng C', email: 'admin@smartwarehouse.com' }));
        navigate('/admin/dashboard');
      } else if (email === 'user@smartwarehouse.com' && password === 'password') {
        localStorage.setItem('authToken', 'mock-user-token');
        localStorage.setItem('user', JSON.stringify({ role: 'User', name: 'Nguyễn Văn A', email: 'user@smartwarehouse.com' }));
        navigate('/');
      } else {
        setError('Email hoặc mật khẩu không chính xác. Sử dụng thông tin gợi ý phía dưới để kiểm thử.');
      }
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
          <p className="text-slate-500 text-sm font-medium">Hệ thống phân phối hàng hóa tự hành AMR</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email truy cập</label>
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
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mật khẩu bảo mật</label>
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

        {/* Demo Accounts Suggestion Card */}
        <div className="bg-slate-55/60 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>💡</span> Tài khoản kiểm thử (Demo):
          </p>
          <div className="space-y-1 text-slate-500 font-medium">
            <p>• <span className="font-bold text-slate-800">Admin:</span> admin@smartwarehouse.com | Mật khẩu: password</p>
            <p>• <span className="font-bold text-slate-800">Nhân viên:</span> user@smartwarehouse.com | Mật khẩu: password</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 font-medium">
          Chưa có tài khoản đăng ký?{' '}
          <Link to="/register" className="text-brand-650 font-bold hover:underline">
            Tạo tài khoản mới
          </Link>
        </p>
      </div>
    </div>
  );
}
