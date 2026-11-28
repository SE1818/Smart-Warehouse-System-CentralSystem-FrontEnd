/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService, tenantService, robotService } from '@/services';
import type { EdgeNodeInfo } from '@/services/robot';
import { Icons } from '@/components/common/Icons';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [edgeNode, setEdgeNode] = useState<EdgeNodeInfo | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for password reset or edge access denied message from navigation state
  useEffect(() => {
    const state = location.state as { passwordResetSuccess?: boolean; accessDeniedReason?: string } | null;
    if (state?.passwordResetSuccess) {
      setError('');
      setEmailNotVerified(false);
      setError('Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
    }
    if (state?.accessDeniedReason) {
      setError(state.accessDeniedReason);
    }
    if (state) {
      window.history.replaceState({}, document.title);
    }

    let isMounted = true;
    robotService.getEdgeNodeInfo().then((info) => {
      if (isMounted && info && info.isEdgeNode) {
        setEdgeNode(info);
      }
    });

    return () => {
      isMounted = false;
    };
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
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }

      let userId = '';
      let tenantId = '';
      let subdomain = '';
      try {
        const tokenParts = res.accessToken.split('.');
        if (tokenParts.length > 1) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
          tenantId = payload.tenant_id || payload.tenantId || payload.TenantId || '';
          subdomain = payload.subdomain || payload.tenant_slug || payload.tenantSlug || '';
        }
      } catch (e) {
        console.error('Failed to parse JWT token:', e);
      }

      // Dynamic Tenant Resolution via Backend API
      const tenantInfo = await tenantService.resolveUserTenant(email);
      if (tenantInfo) {
        if (!tenantId && tenantInfo.tenantId) {
          tenantId = tenantInfo.tenantId;
        }
        if (!subdomain && tenantInfo.tenantSlug) {
          subdomain = tenantInfo.tenantSlug;
        }
      }

      // 🛡️ STRICT MULTI-TENANT ISOLATION CHECK FOR EDGE NODES
      const edgeInfo = edgeNode || (await robotService.getEdgeNodeInfo());
      const roleNormalized = (res.role || '').toLowerCase().replace(/[-_\s]/g, '');
      const isSuperAdmin =
        roleNormalized === 'superadmin' ||
        Boolean(tenantInfo?.isSuperAdmin);

      if (edgeInfo && edgeInfo.isEdgeNode && edgeInfo.subdomain) {
        const userSub = (subdomain || '').toLowerCase().trim();
        const edgeSub = edgeInfo.subdomain.toLowerCase().trim();

        if (!isSuperAdmin && userSub !== edgeSub) {
          authService.logout();
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('TENANT_SUBDOMAIN');
          setError(
            `Truy cập bị từ chối: Thiết bị tại quán này thuộc nhà hàng '${edgeInfo.restaurantName || edgeSub}'. Tài khoản của bạn thuộc quán '${userSub || 'khác'}'. Bạn không có quyền truy cập vào thiết bị của nhà hàng khác!`
          );
          setLoading(false);
          return;
        }
      }

      // If SuperAdmin logs into Edge box, bind to the local edge subdomain context
      const effectiveSubdomain = subdomain || (isSuperAdmin && edgeInfo?.subdomain ? edgeInfo.subdomain : '');
      if (effectiveSubdomain) {
        localStorage.setItem('TENANT_SUBDOMAIN', effectiveSubdomain);
      } else {
        localStorage.removeItem('TENANT_SUBDOMAIN');
      }

      localStorage.setItem(
        'user',
        JSON.stringify({
          id: userId,
          role: res.role,
          name: email.split('@')[0] || 'Người dùng',
          email: email,
          tenantId: tenantId,
          subdomain: effectiveSubdomain,
          tenantSlug: effectiveSubdomain,
          tenantName: tenantInfo?.tenantName || edgeInfo?.restaurantName || '',
          isSuperAdmin: isSuperAdmin,
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
      } else if (
        isSuperAdmin ||
        roleStr.includes('tech') ||
        roleStr.includes('engineer') ||
        roleStr.includes('ky thuat')
      ) {
        // Technician / SuperAdmin
        navigate('/technical');
      } else {
        // Admin only uses the SaaS Admin Portal, not Technician/KDS console
        navigate('/unauthorized');
      }
    } catch (err) {
      console.error('API error during login', err);
      const apiError = err as { response?: { data?: { message?: string; code?: string } } };
      const data = apiError.response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setError(data.message || 'Vui lòng xác thực email trước khi đăng nhập.');
      } else {
        setError(data?.message || 'Email hoặc mật khẩu không chính xác hoặc không thể kết nối đến máy chủ hệ thống.');
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 w-full max-w-md space-y-6 text-slate-900">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 mx-auto flex items-center justify-center shadow-xs">
            <img src="/brand/vora-icon.png" alt="VORA Emblem" width="48" height="48" loading="eager" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold text-[#0A192F] tracking-normal font-heading">VORA</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
              Hệ Thống Quản Trị &amp; Vận Hành AMR
            </p>
          </div>
        </div>

        {edgeNode?.isEdgeNode && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
            <p className="font-semibold text-amber-900">
              Trạm Điều Phối Tại Quán: {edgeNode.restaurantName || edgeNode.subdomain}
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Chỉ nhân viên thuộc nhà hàng này mới được phép đăng nhập.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium leading-relaxed flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {emailNotVerified && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="self-start text-red-700 font-semibold hover:text-red-800 underline text-xs cursor-pointer"
              >
                Gửi lại email xác minh
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Email công vụ
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhanvien@vora.vn"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0062FF]/15 focus:border-[#0062FF] focus:bg-white text-sm text-slate-900 font-medium placeholder-slate-400 transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Mật khẩu bảo mật
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-[#0062FF] hover:text-[#0052CC] transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0062FF]/15 focus:border-[#0062FF] focus:bg-white text-sm text-slate-900 font-medium placeholder-slate-400 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0062FF] hover:bg-[#0052CC] text-white py-3.5 rounded-xl font-semibold text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
        <div className="pt-3 border-t border-slate-200 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
            Chọn nhanh vai trò đăng nhập
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEmail('engineer@vora.vn');
                setPassword('Password123!');
              }}
              className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#0062FF]/40 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-900">
                Kỹ Sư Kỹ Thuật
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">Vận hành &amp; Bảo trì kỹ thuật</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('staff@vora.vn');
                setPassword('Password123!');
              }}
              className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-900">
                Nhân Viên Vận Hành
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">Quầy bếp &amp; Phục vụ bàn</div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Chỉ dành cho cán bộ kỹ thuật và nhân viên được cấp quyền truy cập.
        </div>
      </div>
    </div>
  );
}
