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
    fetchStores();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(stores);
    } else {
      setFiltered(stores.filter(
        (s) => s.name.toLowerCase().includes(q) || s.ownerEmail.toLowerCase().includes(q),
      ));
    }
  }, [search, stores]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cửa hàng</h1>
          <p className="text-sm text-slate-500 font-medium">
            Danh sách tất cả cửa hàng đã được phê duyệt trên hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1.5 rounded-full border border-green-200">
            {stores.length} cửa hàng
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email chủ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 placeholder-slate-400 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Icons.Spinner className="w-8 h-8 text-brand-600 animate-spin" />
          <span className="text-slate-500 font-medium text-sm">Đang tải danh sách cửa hàng...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Icons.Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {search ? 'Không tìm thấy kết quả' : 'Chưa có cửa hàng nào'}
            </h3>
            <p className="text-slate-450 text-sm max-w-sm">
              {search
                ? `Không tìm thấy cửa hàng nào khớp với "${search}".`
                : 'Các cửa hàng sẽ xuất hiện ở đây sau khi được phê duyệt.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((store) => (
            <div
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group p-5 space-y-4"
            >
              {/* Store Icon & Name */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Icons.Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 text-sm truncate">{store.name}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{store.ownerEmail}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">
                  <Icons.Calendar className="w-3 h-3" />
                  {new Date(store.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 border border-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">
                  ● Hoạt động
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Store Detail Modal */}
      {selectedStore && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand-500 to-brand-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icons.Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">{selectedStore.name}</h3>
                  <p className="text-brand-100 text-xs font-medium">Chi tiết cửa hàng</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <InfoRow label="ID Cửa hàng" value={selectedStore.id} mono />
              <InfoRow label="Tên cửa hàng" value={selectedStore.name} />
              <InfoRow label="Email chủ cửa hàng" value={selectedStore.ownerEmail} />
              <InfoRow label="Khu vực (AreaId)" value={selectedStore.areaId} mono />
              <InfoRow label="Trạm (StationId)" value={selectedStore.stationId} mono />
              <InfoRow label="Ngày tạo" value={new Date(selectedStore.createdAt).toLocaleString('vi-VN')} />
              {selectedStore.updatedAt && (
                <InfoRow label="Cập nhật lần cuối" value={new Date(selectedStore.updatedAt).toLocaleString('vi-VN')} />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStore(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
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

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm text-slate-800 font-semibold ${mono ? 'font-mono text-xs text-slate-600' : ''}`}>
        {value}
      </span>
    </div>
  );
}
