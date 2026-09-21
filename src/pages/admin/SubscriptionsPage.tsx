import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  CreditCard,
  DollarSign,
  Download,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Receipt,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { saasService } from '@/services/saasService';
import type { Subscription, Invoice } from '@/types/saas';


export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices' | 'plans'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsData, invData] = await Promise.all([
        saasService.getSubscriptions(),
        saasService.getInvoices(),
      ]);
      setSubscriptions(subsData);
      setInvoices(invData);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu gói cước và hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleSendReminder = (invoiceId: string, tenantName: string) => {
    setSendingReminderId(invoiceId);
    setTimeout(() => {
      setSendingReminderId(null);
      toast.success(`Đã gửi mã thanh toán PayOS / VietQR nhắc cước đến ${tenantName}!`);
    }, 600);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.info(`Đang tạo tệp PDF Hóa đơn điện tử ${invoiceId}...`);
  };

  const totalPaidRevenue = useMemo(() => {
    return invoices
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [invoices]);

  const activeSubCount = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'Active').length;
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (s) =>
        s.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        s.planName.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [subscriptions, search]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (i) =>
        i.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.paymentMethod.toLowerCase().includes(search.toLowerCase())
    );
  }, [invoices, search]);

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gói Cước & Doanh Thu Doanh Nghiệp
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              Billing & PayOS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Quản lý hợp đồng thuê bao SaaS chuỗi F&B, cổng thanh toán tự động PayOS và hóa đơn đối soát
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Thu Thu Được</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatVND(totalPaidRevenue)}</h3>
            <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã quyết toán qua PayOS
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp Đồng Hoạt Động</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {activeSubCount} / {subscriptions.length}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              Tự động gia hạn: <span className="font-bold text-slate-700">80%</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hóa Đơn Chờ Thanh Toán</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {invoices.filter((i) => i.status === 'Pending').length} Đơn
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              Đang chờ webhook PayOS
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hạn Ân Hạn (Grace Period)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {subscriptions.filter((s) => s.status === 'GracePeriod').length} Chuỗi
            </h3>
            <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Cần nhắc cước gia hạn
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-colors relative cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'text-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Danh sách Gói thuê bao</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-extrabold text-slate-600">
            {subscriptions.length}
          </span>
          {activeTab === 'subscriptions' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-colors relative cursor-pointer ${
            activeTab === 'invoices'
              ? 'text-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Lịch sử Hóa đơn PayOS</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-extrabold text-slate-600">
            {invoices.length}
          </span>
          {activeTab === 'invoices' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-black transition-colors relative cursor-pointer ${
            activeTab === 'plans'
              ? 'text-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Định mức các Gói dịch vụ</span>
          {activeTab === 'plans' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ── Subscriptions Tab ── */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên chuỗi hoặc gói..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Khách hàng & Chuỗi quán</th>
                    <th className="py-3.5 px-4">Gói cước</th>
                    <th className="py-3.5 px-4">Chu kỳ & Số tiền</th>
                    <th className="py-3.5 px-4">Thời hạn hợp đồng</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Tự động gia hạn</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-black text-slate-900">
                        {sub.tenantName}
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          Mã: {sub.id}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-extrabold text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {sub.planName}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm">{formatVND(sub.amount)}</div>
                        <span className="text-[11px] text-slate-500 capitalize">
                          {sub.billingCycle === 'annual' ? 'Thanh toán năm' : 'Hàng tháng'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="font-medium text-slate-700">
                          {new Date(sub.startDate).toLocaleDateString('vi-VN')} - {new Date(sub.endDate).toLocaleDateString('vi-VN')}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Hạn chót: {new Date(sub.endDate).toLocaleDateString('vi-VN')}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {sub.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Ân hạn nhắc nợ
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {sub.autoRenew ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bật
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Tắt</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleSendReminder(sub.id, sub.tenantName)}
                          className="text-xs font-bold text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Nhắc cước
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoices Tab ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã hóa đơn, tên chuỗi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Mã hóa đơn</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Số tiền</th>
                    <th className="py-3.5 px-4">Phương thức</th>
                    <th className="py-3.5 px-4">Ngày phát hành / Hạn chót</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        {inv.id}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-800">
                        {inv.tenantName}
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900">
                        {formatVND(inv.amount)}
                      </td>

                      <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 rounded-md">
                          {inv.paymentMethod}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div>Phát hành: {inv.issuedAt}</div>
                        <div className="text-slate-400">Hạn: {inv.dueDate}</div>
                      </td>

                      <td className="py-4 px-4">
                        {inv.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Đã quyết toán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Chờ thanh toán
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadInvoice(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Tải hóa đơn PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {inv.status === 'Pending' && (
                            <button
                              onClick={() => handleSendReminder(inv.id, inv.tenantName)}
                              disabled={sendingReminderId === inv.id}
                              className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              {sendingReminderId === inv.id ? 'Đang gửi...' : 'Gửi QR PayOS'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Plans Tab ── */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-black rounded-full">
                  Starter WMS
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">2.500.000 ₫</h3>
                <p className="text-xs text-slate-500 mt-0.5">mỗi tháng / thanh toán định kỳ</p>
              </div>
              <p className="text-sm text-slate-600">
                Dành cho quán lẩu/nướng đơn lẻ muốn tự động hóa vận hành bếp và điều phối cơ bản.
              </p>
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tối đa <strong>1 kho / chi nhánh</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Quản lý tối đa <strong>2 robot AMR</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Hạn mức 5.000 đơn hàng/tháng</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Database PostgreSQL riêng biệt</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.info('Chức năng chỉnh sửa định mức Starter đang được cập nhật')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm transition-all"
            >
              Chỉnh sửa hạn mức
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-3xl p-6 border-2 border-brand-500 shadow-lg space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6 bg-brand-500 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Phổ biến nhất
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-black rounded-full border border-brand-200">
                  Professional WMS
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">6.500.000 ₫</h3>
                <p className="text-xs text-slate-500 mt-0.5">mỗi tháng / thanh toán định kỳ</p>
              </div>
              <p className="text-sm text-slate-600">
                Lựa chọn tiêu chuẩn cho chuỗi nhà hàng 2-5 chi nhánh cần đội robot AMR và AI Analytics.
              </p>
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tối đa <strong>5 kho / chi nhánh</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Quản lý tối đa <strong>10 robot AMR</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AI Báo cáo tồn kho & dự báo nhu cầu</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Hỗ trợ kỹ thuật 24/7 SLA 99.9%</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.info('Chức năng chỉnh sửa định mức Pro đang được cập nhật')}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-brand-500/20"
            >
              Chỉnh sửa hạn mức
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between text-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-black rounded-full border border-purple-500/30">
                  Enterprise Logistics
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">14.500.000 ₫</h3>
                <p className="text-xs text-slate-400 mt-0.5">mỗi tháng / Hợp đồng cam kết năm</p>
              </div>
              <p className="text-sm text-slate-300">
                Quy mô tập đoàn F&B toàn quốc, tích hợp ERP, hạ tầng DB riêng và tùy biến luồng robot.
              </p>
              <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Không giới hạn số chi nhánh & kho</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Đội robot AMR không giới hạn</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-warehouse Auto Routing & AI Dispatch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Custom B2B API & Dedicated Cluster Host</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toast.info('Chức năng chỉnh sửa định mức Enterprise đang được cập nhật')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-all"
            >
              Chỉnh sửa hạn mức
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default SubscriptionsPage;
