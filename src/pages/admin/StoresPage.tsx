/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Icons } from '@/components/Icons';
import { storeService } from '@/services';
import type { StoreDto } from '@/services/storeService';

export function StoresPage() {
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [filtered, setFiltered] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDto | null>(null);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await storeService.getAllStores();
      setStores(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStores();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(stores);
    } else {
      setFiltered(
        stores.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.ownerEmail.toLowerCase().includes(q),
        ),
      );
    }
  }, [search, stores]);

  // Generate a consistent avatar color from store name
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-amber-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-blue-600',
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cửa hàng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Danh sách tất cả cửa hàng đã được phê duyệt trên hệ thống
          </p>
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="text-sm font-black text-slate-800">{stores.length}</span>
            <span className="text-sm text-slate-500 font-medium">cửa hàng hoạt động</span>
          </div>
          <button
            onClick={fetchStores}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Làm mới"
          >
            <Icons.Refresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="relative max-w-sm">
        <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email chủ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <Icons.Close className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
              <Icons.Store className="w-6 h-6 text-brand-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Icons.Spinner className="w-3 h-3 text-brand-600 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách cửa hàng...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
            <Icons.Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {search ? 'Không tìm thấy kết quả' : 'Chưa có cửa hàng nào'}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              {search
                ? `Không có cửa hàng nào khớp với "${search}".`
                : 'Các cửa hàng đã phê duyệt sẽ xuất hiện ở đây.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((store) => (
            <div
              key={store.id}
              onClick={() => setSelectedStore(store)}
        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedStore(store); }}
  role="button"
        tabIndex={0}
        aria-label="Xem sản phẩm cửa hàng"
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Card top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${getAvatarColor(store.name)}`} />

              <div className="p-5 space-y-4">
                {/* Store Icon & Name */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColor(store.name)} text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm select-none`}
                  >
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-800 text-sm truncate group-hover:text-brand-700 transition-colors">
                      {store.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      {store.ownerEmail}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100" />

                {/* Meta footer */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                    <Icons.Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(store.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Hoạt động
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Store Detail Modal ── */}
      {selectedStore && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStore(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setSelectedStore(null); }}
  role="dialog"
  aria-modal="true"
  aria-label="Chi tiết cửa hàng"
          tabIndex={0}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-5 bg-gradient-to-r ${getAvatarColor(selectedStore.name)} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-black text-lg">
                  {selectedStore.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-white text-base leading-tight">{selectedStore.name}</h3>
                  <p className="text-white/70 text-xs font-medium mt-0.5">Chi tiết cửa hàng</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icons.Close className="w-4 h-4" />
              </button>
            </div>

            {/* Status bar */}
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-bold text-emerald-700">Đang hoạt động</span>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3.5">
              <InfoRow label="ID Cửa hàng" value={selectedStore.id} mono />
              <InfoRow label="Tên cửa hàng" value={selectedStore.name} />
              <InfoRow label="Email chủ cửa hàng" value={selectedStore.ownerEmail} />
              <InfoRow label="Khu vực (AreaId)" value={selectedStore.areaId} mono />
              <InfoRow label="Trạm (StationId)" value={selectedStore.stationId} mono />
              <InfoRow
                label="Ngày tạo"
                value={new Date(selectedStore.createdAt).toLocaleString('vi-VN')}
              />
              {selectedStore.updatedAt && (
                <InfoRow
                  label="Cập nhật lần cuối"
                  value={new Date(selectedStore.updatedAt).toLocaleString('vi-VN')}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStore(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-sm text-slate-800 font-semibold break-all ${
          mono ? 'font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
