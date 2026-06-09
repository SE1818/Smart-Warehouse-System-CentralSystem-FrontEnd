import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operator' | 'User';
  status: 'Active' | 'Suspended';
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>(() => {
    const cachedUsers = localStorage.getItem('admin_users');
    if (cachedUsers) {
      try {
        return JSON.parse(cachedUsers);
      } catch {
        return [];
      }
    }
    const defaultUsers: User[] = [
      { id: 'USR-01', name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'User', status: 'Active' },
      { id: 'USR-02', name: 'Trần Thị B', email: 'tranthib@email.com', role: 'Operator', status: 'Active' },
      { id: 'USR-03', name: 'Lê Hoàng C', email: 'lehoangc@email.com', role: 'Admin', status: 'Active' },
      { id: 'USR-04', name: 'Phạm Minh D', email: 'phammedd@email.com', role: 'User', status: 'Suspended' }
    ];
    localStorage.setItem('admin_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  });
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem('admin_users', JSON.stringify(updated));
  };

  const toggleStatus = (id: string) => {
    const updated = users.map((u) => {
      if (u.id === id) {
        return { ...u, status: (u.status === 'Active' ? 'Suspended' : 'Active') as User['status'] };
      }
      return u;
    });
    saveUsers(updated);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated = users.map((u) => {
      if (u.id === editingUser.id) {
        return editingUser;
      }
      return u;
    });
    saveUsers(updated);
    setEditingUser(null);
  };

  const filtered = users.filter((u) => {
    return u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>👥</span> Quản lý người dùng
        </h1>
        <p className="mt-1 text-sm text-slate-505">Phân quyền vai trò (Admin, Operator, User) và điều khiển trạng thái truy cập</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-4">Nhân viên</th>
                <th className="p-4">Email</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
              {filtered.map((u) => (
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
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      u.role === 'Admin' ? 'bg-red-50 text-red-700 border-red-200' :
                      u.role === 'Operator' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
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
                      onClick={() => toggleStatus(u.id)}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                        u.status === 'Active' 
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
      </div>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-heading font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              ✏️ Sửa thông tin tài khoản
            </h3>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tên người dùng</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phân vai trò</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value="User">User (Nhân viên)</option>
                  <option value="Operator">Operator (Vận hành AMR)</option>
                  <option value="Admin">Admin (Quản trị viên)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-505 transition-colors"
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
    </div>
  );
}
