import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Radio,
  Bot,
  BrainCircuit,
  Boxes,
  LineChart,
  Code2,
  RefreshCw,
  Search,
} from 'lucide-react';

import { saasService } from '@/services/saasService';
import type { TenantFeatureFlag } from '@/types/saas';

export function FeatureFlagsPage() {
  const [flags, setFlags] = useState<TenantFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await saasService.getFeatureFlags();
      setFlags(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải ma trận Feature Flags.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleToggleFlag = async (
    tenantId: string,
    field: keyof Omit<TenantFeatureFlag, 'tenantId' | 'tenantName'>,
    currentVal: boolean,
    tenantName: string
  ) => {
    const newVal = !currentVal;
    const actionKey = `${tenantId}-${field}`;
    setUpdatingKey(actionKey);

    try {
      await saasService.updateFeatureFlag(tenantId, { [field]: newVal });
      setFlags((prev) =>
        prev.map((item) =>
          item.tenantId === tenantId ? { ...item, [field]: newVal } : item
        )
      );

      const fieldNames: Record<string, string> = {
        enableAMRIntegration: 'Robot AMR',
        enableAIChatbot: 'AI Assistant',
        enableMultiWarehouseRouting: 'Đa kho Multi-Routing',
        enableAdvancedAnalytics: 'Báo cáo BI nâng cao',
        enableCustomIntegrations: 'Tích hợp API B2B',
      };

      toast.success(
        `Đã ${newVal ? 'kích hoạt' : 'tắt'} module ${fieldNames[field] || field} cho ${tenantName} (Đã phát qua Redis Pub/Sub)!`
      );
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật Feature Flag.');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleApplyPreset = async (
    tenantId: string,
    preset: 'starter' | 'pro' | 'enterprise',
    tenantName: string
  ) => {
    let newSettings: Partial<TenantFeatureFlag> = {};
    if (preset === 'starter') {
      newSettings = {
        enableAMRIntegration: true,
        enableAIChatbot: false,
        enableMultiWarehouseRouting: false,
        enableAdvancedAnalytics: false,
        enableCustomIntegrations: false,
      };
    } else if (preset === 'pro') {
      newSettings = {
        enableAMRIntegration: true,
        enableAIChatbot: true,
        enableMultiWarehouseRouting: false,
        enableAdvancedAnalytics: true,
        enableCustomIntegrations: false,
      };
    } else {
      newSettings = {
        enableAMRIntegration: true,
        enableAIChatbot: true,
        enableMultiWarehouseRouting: true,
        enableAdvancedAnalytics: true,
        enableCustomIntegrations: true,
      };
    }

    try {
      await saasService.updateFeatureFlag(tenantId, newSettings);
      setFlags((prev) =>
        prev.map((item) =>
          item.tenantId === tenantId ? { ...item, ...newSettings } : item
        )
      );
      toast.success(`Đã áp dụng cấu hình mẫu ${preset.toUpperCase()} cho ${tenantName}!`);
    } catch {
      toast.error('Lỗi khi áp dụng mẫu tính năng.');
    }
  };

  const filteredFlags = useMemo(() => {
    return flags.filter(
      (f) =>
        f.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        f.tenantId.toLowerCase().includes(search.toLowerCase())
    );
  }, [flags, search]);

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Feature Flags & Bật Tắt Tính Năng Động
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Redis Pub/Sub Sync
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Cấu hình bật/tắt module chức năng theo từng Tenant tức thì mà không cần triển khai lại máy chủ hay khởi động lại app
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

      {/* ── Notice Banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-blue-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Đồng bộ Thời Gian Thực (Real-Time Pub/Sub)</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Mỗi thay đổi sẽ được phát trực tiếp qua Redis Channel <code className="text-brand-300 font-mono">tenant:flags:changed</code> tới Edge Box tại chi nhánh của chuỗi trong vòng dưới 50ms.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full shrink-0">
          Sẵn sàng kết nối
        </span>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên chuỗi quán..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* ── Matrix Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-5">Chuỗi Quán & Tenant</th>
                <th className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span>Robot AMR</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <BrainCircuit className="w-4 h-4 text-blue-600" />
                    <span>AI Assistant</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>Đa Kho Routing</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <LineChart className="w-4 h-4 text-emerald-600" />
                    <span>Báo cáo BI</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span>Custom API B2B</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-right">Mẫu cấu hình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFlags.map((tenantFlag) => (
                <tr key={tenantFlag.tenantId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-5 font-black text-slate-900">
                    {tenantFlag.tenantName}
                    <div className="text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                      {tenantFlag.tenantId}
                    </div>
                  </td>

                  {/* Flag 1: AMR */}
                  <td className="py-4 px-4 text-center">
                    <button
                      disabled={updatingKey !== null}
                      onClick={() =>
                        handleToggleFlag(
                          tenantFlag.tenantId,
                          'enableAMRIntegration',
                          tenantFlag.enableAMRIntegration,
                          tenantFlag.tenantName
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer disabled:opacity-50 ${
                        tenantFlag.enableAMRIntegration ? 'bg-purple-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tenantFlag.enableAMRIntegration ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Flag 2: AI */}
                  <td className="py-4 px-4 text-center">
                    <button
                      disabled={updatingKey !== null}
                      onClick={() =>
                        handleToggleFlag(
                          tenantFlag.tenantId,
                          'enableAIChatbot',
                          tenantFlag.enableAIChatbot,
                          tenantFlag.tenantName
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer disabled:opacity-50 ${
                        tenantFlag.enableAIChatbot ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tenantFlag.enableAIChatbot ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Flag 3: Multi-warehouse Routing */}
                  <td className="py-4 px-4 text-center">
                    <button
                      disabled={updatingKey !== null}
                      onClick={() =>
                        handleToggleFlag(
                          tenantFlag.tenantId,
                          'enableMultiWarehouseRouting',
                          tenantFlag.enableMultiWarehouseRouting,
                          tenantFlag.tenantName
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer disabled:opacity-50 ${
                        tenantFlag.enableMultiWarehouseRouting ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tenantFlag.enableMultiWarehouseRouting ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Flag 4: Advanced BI Analytics */}
                  <td className="py-4 px-4 text-center">
                    <button
                      disabled={updatingKey !== null}
                      onClick={() =>
                        handleToggleFlag(
                          tenantFlag.tenantId,
                          'enableAdvancedAnalytics',
                          tenantFlag.enableAdvancedAnalytics,
                          tenantFlag.tenantName
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer disabled:opacity-50 ${
                        tenantFlag.enableAdvancedAnalytics ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tenantFlag.enableAdvancedAnalytics ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Flag 5: Custom B2B Integrations */}
                  <td className="py-4 px-4 text-center">
                    <button
                      disabled={updatingKey !== null}
                      onClick={() =>
                        handleToggleFlag(
                          tenantFlag.tenantId,
                          'enableCustomIntegrations',
                          tenantFlag.enableCustomIntegrations,
                          tenantFlag.tenantName
                        )
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer disabled:opacity-50 ${
                        tenantFlag.enableCustomIntegrations ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tenantFlag.enableCustomIntegrations ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </td>


                  {/* Quick Preset Buttons */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleApplyPreset(tenantFlag.tenantId, 'starter', tenantFlag.tenantName)}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        Starter
                      </button>
                      <button
                        onClick={() => handleApplyPreset(tenantFlag.tenantId, 'pro', tenantFlag.tenantName)}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                      >
                        Pro
                      </button>
                      <button
                        onClick={() => handleApplyPreset(tenantFlag.tenantId, 'enterprise', tenantFlag.tenantName)}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                      >
                        Enterprise
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default FeatureFlagsPage;
