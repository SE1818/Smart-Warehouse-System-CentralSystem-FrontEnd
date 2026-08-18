import React, { useState, useEffect } from 'react';

interface DiningTable {
  id: string;
  storeId: string;
  tableNo: string;
  tableName: string;
  capacity: number;
  status: string;
  qrCodeUrl: string;
  createdAt: string;
}

export const TablesPage: React.FC = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedQrTable, setSelectedQrTable] = useState<DiningTable | null>(null);

  const [tableNo, setTableNo] = useState<string>('');
  const [tableName, setTableName] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(4);

  const storeId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/tables?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          storeId,
          tableNo,
          tableName,
          capacity
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTableNo('');
        setTableName('');
        fetchTables();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi khi tạo bàn.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bàn này?')) return;
    try {
      const res = await fetch(`/api/v1/tables/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchTables();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quản Lý Sơ Đồ Bàn Ăn & Mã QR</h1>
          <p className="text-sm text-slate-400">Tạo bàn ăn và xuất mã QR gọi món tại bàn cho khách hàng.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTables}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            ↻ Làm Mới
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold transition shadow-lg shadow-indigo-500/20"
          >
            + Thêm Bàn Mới
          </button>
        </div>
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-extrabold text-xl text-white">{table.tableNo}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      table.status === 'Occupied'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {table.status === 'Occupied' ? 'Có Khách' : 'Bàn Trống'}
                  </span>
                </div>
                <p className="text-slate-300 font-medium text-sm">{table.tableName}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  👥 {table.capacity} chỗ ngồi
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex justify-between items-center">
                <button
                  onClick={() => setSelectedQrTable(table)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition"
                >
                  📷 Mã QR
                </button>
                <button
                  onClick={() => handleDeleteTable(table.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Table */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Thêm Bàn Ăn Mới</h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mã Bàn (Ví dụ: B01, T02)</label>
                <input
                  type="text"
                  required
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="B01"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tên Bàn Hiển Thị</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="Bàn 01 - Tầng 1"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sức Chứa (Số Ghế)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-xl hover:bg-indigo-500"
                >
                  Lưu Bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQrTable && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-white mb-1">Mã QR Bàn {selectedQrTable.tableNo}</h2>
            <p className="text-xs text-slate-400 mb-4">{selectedQrTable.tableName}</p>

            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  selectedQrTable.qrCodeUrl || ''
                )}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>

            <p className="text-xs text-slate-500 break-all mb-4 bg-slate-800 p-2 rounded-lg">
              {selectedQrTable.qrCodeUrl}
            </p>

            <button
              onClick={() => setSelectedQrTable(null)}
              className="w-full bg-slate-800 text-white py-2.5 rounded-xl hover:bg-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
