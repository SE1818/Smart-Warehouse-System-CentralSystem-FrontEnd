import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  Search,
  RefreshCw,
  Database,
  Bot,
  Warehouse,
  TrendingUp,
  ShieldCheck,
  XCircle,
  Phone,
  Mail,
  HardDrive,
  Layers,
} from 'lucide-react';

import { saasService } from '@/services/saasService';
import type { Tenant, SaaSMetrics, TenantStatus } from '@/types/saas';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, metricsData] = await Promise.all([
        saasService.getTenants(),
        saasService.getMetrics(),
      ]);
      setTenants(tenantsData);
      setMetrics(metricsData);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách Tenant & số liệu SaaS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus: TenantStatus = tenant.status === 'Active' ? 'Suspended' : 'Active';
    setActionLoadingId(tenant.id);
    try {
      await saasService.toggleTenantStatus(tenant.id, newStatus);
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
      if (selectedTenant && selectedTenant.id === tenant.id) {
        setSelectedTenant({ ...selectedTenant, status: newStatus });
      }
      toast.success(
        newStatus === 'Active'
          ? `Đã kích hoạt lại chuỗi quán ${tenant.name}`
          : `Đã tạm ngưng dịch vụ chuỗi quán ${tenant.name}`
      );
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thay đổi trạng thái tenant.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        search === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase()) ||
        t.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
        t.databaseName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchPlan =
        planFilter === 'ALL' ||
        (planFilter === 'starter' && t.planName.toLowerCase().includes('starter')) ||
        (planFilter === 'pro' && t.planName.toLowerCase().includes('pro')) ||
        (planFilter === 'enterprise' && t.planName.toLowerCase().includes('enterprise'));

      return matchSearch && matchStatus && matchPlan;
    });
  }, [tenants, search, statusFilter, planFilter]);

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hoạt động
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Chờ cấp phát DB
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đang tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getPlanBadge = (planName: string) => {
    if (planName.toLowerCase().includes('enterprise')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
          Enterprise
        </span>
      );
    }
    if (planName.toLowerCase().includes('pro')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
          Professional
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
        Starter
      </span>
    );
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Quản trị Chuỗi Quán & Tenant
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-200">
              SaaS Multi-Tenant
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Quản lý vòng đời khách hàng B2B, hạn mức tài nguyên kho & cấp phát cơ sở dữ liệu riêng biệt
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Doanh Thu MRR</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {metrics ? formatVND(metrics.mrr) : '---'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ARR: {metrics ? formatVND(metrics.arr) : '---'}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chuỗi Quán Hoạt Động</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {metrics ? `${metrics.activeTenants} / ${metrics.totalTenants}` : '---'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Churn rate: <span className="font-bold text-slate-700">{metrics?.churnRate || 0}%</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đội Robot AMR</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {metrics ? `${metrics.totalAMRRobotsActive} Robot` : '---'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Trên <span className="font-bold text-slate-700">{metrics?.totalWarehousesManaged || 0}</span> tổng kho
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cơ sở dữ liệu Cô lập</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {metrics ? `${metrics.totalTenants} DB Clusters` : '---'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Isolated Per-Tenant</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên chuỗi, email, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Pending">Chờ cấp phát</option>
              <option value="Suspended">Đang tạm dừng</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Gói cước:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">Tất cả gói cước</option>
              <option value="starter">Starter</option>
              <option value="pro">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tenants Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Chuỗi Quán & Doanh nghiệp</th>
                <th className="py-3.5 px-4">Gói dịch vụ</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Tài nguyên cấp phát</th>
                <th className="py-3.5 px-4">Cơ sở dữ liệu</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy chuỗi quán nào phù hợp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTenant(tenant)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                            {tenant.name}
                            <span className="text-[11px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {tenant.slug}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{tenant.adminEmail}</span>
                            <span>•</span>
                            <span>{tenant.contactPhone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {getPlanBadge(tenant.planName)}
                        <p className="text-[11px] text-slate-400 font-medium">
                          Khởi tạo: {new Date(tenant.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {getStatusBadge(tenant.status)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-700">{tenant.warehousesCount}</span> kho hàng
                        </div>
                        <div className="flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-bold text-slate-700">{tenant.robotsCount}</span> robot AMR
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span>{tenant.storageUsedGB} GB lưu trữ</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          {tenant.databaseName}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedTenant(tenant)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => void handleToggleStatus(tenant)}
                          disabled={actionLoadingId === tenant.id}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                            tenant.status === 'Active'
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {actionLoadingId === tenant.id
                            ? 'Đang xử lý...'
                            : tenant.status === 'Active'
                            ? 'Tạm dừng'
                            : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tenant Details Modal ── */}
      {selectedTenant && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTenant(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {selectedTenant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    {selectedTenant.name}
                    {getPlanBadge(selectedTenant.planName)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenant ID: <span className="font-mono text-slate-700">{selectedTenant.id}</span> • Slug: <span className="font-mono text-slate-700">/{selectedTenant.slug}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Thông tin liên hệ</span>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2 text-slate-700 font-medium">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {selectedTenant.adminEmail}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700 font-medium">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selectedTenant.contactPhone}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Trạng thái & Gói cước</span>
                <div className="space-y-1">
                  <div>{getStatusBadge(selectedTenant.status)}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ngày đăng ký: {new Date(selectedTenant.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Cụm Database cô lập */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Isolated PostgreSQL Database Cluster</span>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Active Replica
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Database Name:</span>
                  <p className="font-mono font-bold text-white text-sm">{selectedTenant.databaseName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Dung lượng sử dụng:</span>
                  <p className="font-bold text-white text-sm">{selectedTenant.storageUsedGB} GB</p>
                </div>
              </div>
            </div>

            {/* Quota tài nguyên */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Hạn mức tài nguyên hệ thống</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <Warehouse className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-black text-slate-800">{selectedTenant.warehousesCount}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Kho hàng đã kết nối</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <Bot className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-lg font-black text-slate-800">{selectedTenant.robotsCount}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Robot AMR vận hành</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                  <Layers className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-black text-slate-800">{selectedTenant.monthlyOrdersCount.toLocaleString('vi-VN')}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Đơn hàng trong tháng</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
              >
                Đóng
              </button>
              <button
                onClick={() => void handleToggleStatus(selectedTenant)}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm ${
                  selectedTenant.status === 'Active'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedTenant.status === 'Active' ? 'Tạm ngưng tenant này' : 'Kích hoạt tenant này'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TenantsPage;
