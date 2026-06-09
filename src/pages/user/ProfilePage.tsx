import { useState } from 'react';

export function ProfilePage() {
  const userStr = localStorage.getItem('user');
  const initialUser = userStr ? JSON.parse(userStr) : { name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'User' };
  
  const [name, setName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [phone, setPhone] = useState(initialUser.phone || '0987654321');
  const [station, setStation] = useState(initialUser.defaultStation || 'ST01');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedUser = {
      ...initialUser,
      name,
      email,
      phone,
      defaultStation: station
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Trigger window event to notify sidebar avatar to reload
    window.dispatchEvent(new Event('cart-updated'));

    setSaveStatus('Cập nhật tài khoản thành công!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const stations = [
    { id: 'ST01', name: 'Trạm A - Khu Vực Lắp Ráp' },
    { id: 'ST02', name: 'Trạm B - Đóng Gói' },
    { id: 'ST03', name: 'Trạm C - Cửa Xuất Hàng' },
    { id: 'ST04', name: 'Trạm D - Kỹ Thuật' },
    { id: 'ST05', name: 'Trạm E - Kho Lưu Trữ' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>👤</span> Tài khoản của tôi
        </h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý hồ sơ cá nhân và trạm giao hàng mặc định của bạn</p>
      </div>

      {saveStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm shadow-sm animate-pulse">
          ✅ {saveStatus}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 bg-brand-50 text-brand-700 border border-brand-200/60 rounded-2xl flex items-center justify-center font-heading font-bold text-2xl shadow-inner select-none shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-900">{name}</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Vai trò: <span className="text-brand-650 font-bold">{initialUser.role}</span></p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên hiển thị</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa chỉ Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạm giao mặc định</label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-700 font-medium"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20"
            >
              💾 Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
