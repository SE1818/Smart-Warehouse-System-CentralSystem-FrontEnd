import { useState, useEffect } from 'react';
import { userService } from '@/services';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'warehouse_manager' | 'Customer';
  status: 'Active' | 'Suspended';
}

const getUserRoleBadgeClass = (role: string) => {
  if (role === 'warehouse_manager') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (role === 'Customer') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-slate-50 text-slate-600 border border-slate-200';
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAllUsers();
      const mapped: User[] = data.map(u => ({
        id: u.id,
        name: u.username || 'Khách hàng',
        email: u.email,
        role: (u.role === 'warehouse_manager' || u.role === 'Customer') ? u.role : 'Customer',
        status: u.isActive ? 'Active' : 'Suspended'
      }));
      setUsers(mapped);
    } catch (err) {
      console.error('Error fetching users from API', err);
      setError('Không thể kết nối đến máy chủ để tải danh sách người dùng. Vui lòng kiểm tra lại dịch vụ.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleStatus = async (id: string, currentStatus: 'Active' | 'Suspended') => {
    const targetActive = currentStatus !== 'Active';
    try {
      await userService.updateUserStatus(id, targetActive);
      alert('Cập nhật trạng thái người dùng thành công!');
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      alert('Lỗi cập nhật trạng thái: ' + (apiError.response?.data?.message || apiError.message));
    }
  };

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await userService.updateUserRole(editingUser.id, editingUser.role);
      alert('Cập nhật vai trò thành công!');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user role:', err);
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      alert('Lỗi cập nhật vai trò: ' + (apiError.response?.data?.message || apiError.message));
      setEditingUser(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filtered = users.filter((u) => {
    return u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>👥</span> Quản lý người dùng
        </h1>
        <p className="mt-1 text-sm text-slate-505">Phân quyền vai trò (warehouse_manager, Customer) và điều khiển trạng thái truy cập</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {/* Table grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 text-xs font-medium">Đang tải danh sách người dùng...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-4">Tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-50 border border-brand-200/60 text-brand-700 rounded-lg flex items-center justify-center font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getUserRoleBadgeClass(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {u.status === 'Active' ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                      >
                        ✏️ Sửa vai trò
                      </button>
                      <button
                        onClick={() => toggleStatus(u.id, u.status)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${u.status === 'Active'
                          ? 'border-red-200 text-red-650 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-650 hover:bg-emerald-50'
                          }`}
                      >
                        {u.status === 'Active' ? '🔒 Khóa' : '🔓 Mở'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Không tìm thấy người dùng</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-semibold">
                Hiển thị <span className="font-bold text-slate-800">{startIndex + 1}</span> -{" "}
                <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filtered.length)}</span>{" "}
                trong <span className="font-bold text-slate-800">{filtered.length}</span> người dùng
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                >
                  &larr;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-95 ${
                      currentPage === page
                        ? "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/10"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                >
                  &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col glow-blue transform scale-100 transition-all duration-300">
            
            {/* Top Border Gradient Decoration */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 via-indigo-500 to-purple-600 absolute top-0 left-0 right-0"></div>

            {/* Header Area */}
            <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 mt-1.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-brand-50 to-indigo-50 text-brand-600 border border-brand-100 rounded-2xl flex items-center justify-center text-xl shadow-xs">
                  ✏️
                </div>
                <div>
                  <h3 className="text-lg font-heading font-black text-slate-900 leading-tight">
                    Sửa thông tin tài khoản
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Cập nhật quyền hạn và tên thành viên</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm transition-all border border-slate-200/60 active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Form Area */}
            <form onSubmit={handleEditSave} className="p-6 space-y-6">
              
              {/* Input: Username */}
              <div className="space-y-2">
                <label htmlFor="username-input-field" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                  👤 Tên người dùng
                </label>
                <input
                  type="text"
                  id="username-input-field"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  placeholder="Nguyen Van A"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850 font-bold"
                />
              </div>

              {/* Roles Selector: Dynamic Cards */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  🛠️ Phân quyền vai trò
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Card: Customer */}
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, role: 'Customer' })}
                    className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 relative group ${
                      editingUser.role === 'Customer'
                        ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/10'
                        : 'border-slate-250 bg-white hover:border-slate-350 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-105 ${
                        editingUser.role === 'Customer'
                          ? 'bg-brand-100 text-brand-650'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        👥
                      </span>
                      {editingUser.role === 'Customer' && (
                        <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm mb-1">Customer</span>
                    <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Khách hàng, người đặt hàng và theo dõi tiến độ.
                    </span>
                  </button>

                  {/* Card: warehouse_manager */}
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, role: 'warehouse_manager' })}
                    className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 relative group ${
                      editingUser.role === 'warehouse_manager'
                        ? 'border-red-500 bg-red-50/30 ring-2 ring-red-500/10'
                        : 'border-slate-255 bg-white hover:border-slate-350 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-105 ${
                        editingUser.role === 'warehouse_manager'
                          ? 'bg-red-100 text-red-650'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        ⚙️
                      </span>
                      {editingUser.role === 'warehouse_manager' && (
                        <span className="w-5 h-5 rounded-full bg-red-550 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm mb-1">Warehouse Manager</span>
                    <span className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Quản lý kho hàng, robot AMR, duyệt đơn hàng.
                    </span>
                  </button>

                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-505 transition-colors active:scale-97"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-97 transition-all flex items-center gap-1.5"
                >
                  💾 Lưu thay đổi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
