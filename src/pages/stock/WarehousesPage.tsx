import { useState, useEffect } from 'react';
import type { Warehouse } from '@/types/stock';
import { stockService } from '@/services/stock';

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
    code: '',
    name: '',
    address: '',
    isActive: true,
  });

  const fetchWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockService.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Error fetching warehouses from API', err);
      setError('Không thể tải danh sách kho hàng từ máy chủ. Vui lòng kiểm tra lại dịch vụ.');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWarehouses();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const saveWarehouses = (updated: Warehouse[]) => {
    setWarehouses(updated);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;

    const updated = warehouses.map((w) =>
      w.id === editingWarehouse.id ? editingWarehouse : w
    );
    saveWarehouses(updated);
    setEditingWarehouse(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.code || !newWarehouse.name || !newWarehouse.address) return;

    const added: Warehouse = {
      id: `${Date.now()}`,
      code: newWarehouse.code,
      name: newWarehouse.name,
      address: newWarehouse.address,
      isActive: newWarehouse.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...warehouses, added];
    saveWarehouses(updated);
    setIsAdding(false);
    setNewWarehouse({
      code: '',
      name: '',
      address: '',
      isActive: true,
    });
  };

  const deleteWarehouse = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa kho hàng này?')) {
      const updated = warehouses.filter((w) => w.id !== id);
      saveWarehouses(updated);
    }
  };

  const toggleActive = (id: string) => {
    const updated = warehouses.map((w) =>
      w.id === id ? { ...w, isActive: !w.isActive } : w
    );
    saveWarehouses(updated);
  };

  const filtered = warehouses.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏭</span> Quản lý kho hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý danh sách các kho hàng và trung tâm phân phối
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center gap-2 self-start sm:self-auto transition-all duration-150 active:scale-98"
        >
          ➕ Thêm kho mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên kho hoặc mã kho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {/* Table List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 text-xs font-medium">
            Đang tải danh sách kho hàng...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-4">Mã kho</th>
                  <th className="p-4">Tên kho</th>
                  <th className="p-4">Địa chỉ</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 font-mono text-xs">
                      {w.code}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{w.name}</td>
                    <td className="p-4 text-slate-600">{w.address}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActive(w.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                          w.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {w.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setEditingWarehouse(w)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => deleteWarehouse(w.id)}
                        className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      Không tìm thấy kho hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-heading font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              ✏️ Chỉnh sửa kho hàng
            </h3>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Mã kho
                </label>
                <input
                  type="text"
                  value={editingWarehouse.code}
                  onChange={(e) =>
                    setEditingWarehouse({ ...editingWarehouse, code: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tên kho
                </label>
                <input
                  type="text"
                  value={editingWarehouse.name}
                  onChange={(e) =>
                    setEditingWarehouse({ ...editingWarehouse, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Địa chỉ
                </label>
                <textarea
                  value={editingWarehouse.address}
                  onChange={(e) =>
                    setEditingWarehouse({ ...editingWarehouse, address: e.target.value })
                  }
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Trạng thái
                </label>
                <select
                  value={editingWarehouse.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditingWarehouse({
                      ...editingWarehouse,
                      isActive: e.target.value === 'active',
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWarehouse(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-heading font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              ➕ Thêm kho hàng mới
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Mã kho
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: WH-01"
                  value={newWarehouse.code}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tên kho
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kho chính"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Địa chỉ
                </label>
                <textarea
                  placeholder="Địa chỉ cụ thể của kho..."
                  value={newWarehouse.address}
                  onChange={(e) =>
                    setNewWarehouse({ ...newWarehouse, address: e.target.value })
                  }
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Trạng thái
                </label>
                <select
                  value={newWarehouse.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setNewWarehouse({
                      ...newWarehouse,
                      isActive: e.target.value === 'active',
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all"
                >
                  Tạo kho hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
