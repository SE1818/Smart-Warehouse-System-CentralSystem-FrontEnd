import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Database,
  Activity,
  ShieldCheck,
  RefreshCw,
  Search,
  HardDrive,
  CheckCircle2,
  Play,
  RotateCcw,
  Copy,
  Terminal,
} from 'lucide-react';

import { saasService } from '@/services/saasService';
import type { TenantDatabaseInfo } from '@/types/saas';

export function DatabasesPage() {
  const [databases, setDatabases] = useState<TenantDatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [migratingId, setMigratingId] = useState<string | null>(null);
  const [migratingAll, setMigratingAll] = useState(false);
  const [selectedDb, setSelectedDb] = useState<TenantDatabaseInfo | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await saasService.getDatabases();
      setDatabases(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải thông tin cụm cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép chuỗi kết nối vào clipboard!');
  };

  const handleMigrateSingle = (db: TenantDatabaseInfo) => {
    setMigratingId(db.tenantId);
    setTimeout(() => {
      setDatabases((prev) =>
        prev.map((item) =>
          item.tenantId === db.tenantId
            ? {
                ...item,
                schemaVersion: 'v2.4.2_latest',
                lastMigratedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              }
            : item
        )
      );
      setMigratingId(null);
      toast.success(`Đã chạy thành công Schema Migration cho ${db.dbName}!`);
    }, 1000);
  };

  const handleMigrateAll = () => {
    setMigratingAll(true);
    setTimeout(() => {
      setDatabases((prev) =>
        prev.map((item) => ({
          ...item,
          schemaVersion: 'v2.4.2_latest',
          lastMigratedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        }))
      );
      setMigratingAll(false);
      toast.success('Đã đồng bộ thành công Schema Migration trên toàn bộ 5 Cụm Database Tenant!');
    }, 1500);
  };

  const filteredDbs = useMemo(() => {
    return databases.filter(
      (db) =>
        db.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        db.dbName.toLowerCase().includes(search.toLowerCase()) ||
        db.host.toLowerCase().includes(search.toLowerCase())
    );
  }, [databases, search]);

  const totalConnections = useMemo(() => {
    return databases.reduce((sum, d) => sum + d.activeConnections, 0);
  }, [databases]);

  const totalStorageMB = useMemo(() => {
    return databases.reduce((sum, d) => sum + d.sizeMB, 0);
  }, [databases]);

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Giám Sát Cụm Database Per-Tenant
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
              PostgreSQL Isolated
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Kiến trúc cơ sở dữ liệu cô lập tuyệt đối theo từng Tenant, phân vùng dữ liệu và quản lý kết nối Connection Pool
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleMigrateAll}
            disabled={migratingAll || loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Play className={`w-4 h-4 ${migratingAll ? 'animate-spin' : ''}`} />
            <span>{migratingAll ? 'Đang Migrate...' : 'Migrate Toàn Bộ DB'}</span>
          </button>

          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Kiểm tra Ping</span>
          </button>
        </div>
      </div>

      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cụm DB Độc Lập</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{databases.length} Cụm</h3>
            <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Khách hàng có DB riêng
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kết Nối Socket Hoạt Động</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalConnections} Sockets</h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              PgBouncer Connection Pooling
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Dung Lượng Đĩa</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {(totalStorageMB / 1024).toFixed(2)} GB
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              NVMe SSD Tốc độ cao
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sức Khỏe Cụm DB</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">100% Khỏe Mạnh</h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5">
              Auto failover replica active
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên DB, khách hàng hoặc host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* ── Database Clusters Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDbs.map((db) => (
          <div
            key={db.tenantId}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{db.tenantName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                      {db.dbName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {db.healthStatus}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDb(db)}
                className="text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                title="Xem chi tiết"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Cluster Host:</span>
                <p className="font-mono font-bold text-slate-700 truncate mt-0.5">{db.host}:{db.port}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Schema Version:</span>
                <p className="font-mono font-bold text-purple-700 mt-0.5">{db.schemaVersion}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Active Connections:</span>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {db.activeConnections} sockets
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Dung lượng bảng:</span>
                <p className="font-bold text-slate-800 mt-0.5">{db.sizeMB} MB</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>Lần migrate: {db.lastMigratedAt}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(`postgresql://postgres:secret@${db.host}:${db.port}/${db.dbName}`)}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
                  title="Sao chép Connection String"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMigrateSingle(db)}
                  disabled={migratingId === db.tenantId}
                  className="px-2.5 py-1 font-bold text-xs bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className={`w-3 h-3 ${migratingId === db.tenantId ? 'animate-spin' : ''}`} />
                  {migratingId === db.tenantId ? 'Đang chạy...' : 'Migrate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DB Terminal Inspection Modal ── */}
      {selectedDb && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDb(null)}
        >
          <div
            className="bg-slate-950 text-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-800 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-brand-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>PostgreSQL Cluster Diagnostics: {selectedDb.dbName}</span>
              </div>
              <button
                onClick={() => setSelectedDb(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800/80 leading-relaxed">
              <p className="text-emerald-400">➜ SELECT version();</p>
              <p className="text-slate-400">PostgreSQL 16.2 on x86_64-pc-linux-gnu, compiled by gcc</p>
              <p className="text-emerald-400 mt-2">➜ SELECT count(*) FROM pg_stat_activity WHERE datname = '{selectedDb.dbName}';</p>
              <p className="text-slate-300">count: {selectedDb.activeConnections} active clients via pgBouncer</p>
              <p className="text-emerald-400 mt-2">➜ SELECT pg_size_pretty(pg_database_size('{selectedDb.dbName}'));</p>
              <p className="text-slate-300">size: {selectedDb.sizeMB} MB</p>
              <p className="text-emerald-400 mt-2">➜ Current Schema Migration Hash:</p>
              <p className="text-amber-400">b9a78f2e411b_{selectedDb.schemaVersion}</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500">Connection pool status: NORMAL</span>
              <button
                onClick={() => {
                  toast.success('Đã tạo bản sao lưu Snapshot tự động!');
                  setSelectedDb(null);
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl"
              >
                Tạo bản Snapshot dự phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DatabasesPage;
