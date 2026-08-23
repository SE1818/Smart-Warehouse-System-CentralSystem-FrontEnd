import React, { useState } from 'react';

interface WhiteLabelForm {
  displayName: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  supportHotline: string;
  customDomain: string;
}

export const WhiteLabelSettingsPage: React.FC = () => {
  const [form, setForm] = useState<WhiteLabelForm>({
    displayName: 'The Coffee House Campus',
    logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=128&auto=format&fit=crop&q=60',
    bannerUrl: '',
    primaryColorHex: '#FF6B00',
    secondaryColorHex: '#1F2937',
    supportHotline: '1800 6936',
    customDomain: 'tracking.thecoffeehouse.vn'
  });

  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tùy biến Thương hiệu (White-labeling)</h1>
          <p className="text-sm text-slate-500">
            Cấu hình nhận diện thương hiệu hiển thị trực tiếp trên trang Web Tracking của khách hàng (Module 02).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tên Hiển Thị Thương Hiệu
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Đường dẫn Ảnh Logo (URL)
              </label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Màu Chủ Đạo (Primary Hex)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={form.primaryColorHex}
                    onChange={e => setForm({ ...form, primaryColorHex: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={form.primaryColorHex}
                    onChange={e => setForm({ ...form, primaryColorHex: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Màu Phụ (Secondary Hex)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={form.secondaryColorHex}
                    onChange={e => setForm({ ...form, secondaryColorHex: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={form.secondaryColorHex}
                    onChange={e => setForm({ ...form, secondaryColorHex: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hotline Hỗ Trợ
                </label>
                <input
                  type="text"
                  value={form.supportHotline}
                  onChange={e => setForm({ ...form, supportHotline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="1900 xxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên Miền Tùy Chỉnh (Custom Domain)
                </label>
                <input
                  type="text"
                  value={form.customDomain}
                  onChange={e => setForm({ ...form, customDomain: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="tracking.yourdomain.com"
                />
              </div>
            </div>

            {saved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
                <span>✓</span>
                <span>Đã lưu cấu hình White-labeling thành công!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              Lưu Cấu Hình Thương Hiệu
            </button>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden p-4 space-y-4 text-slate-100">
            <div className="text-[10px] text-slate-500 font-mono text-center uppercase tracking-widest">
              📱 Xem trước giao diện khách hàng
            </div>

            {/* Simulated Header */}
            <div
              className="p-3 rounded-2xl flex items-center justify-between border border-slate-800 shadow-md"
              style={{ background: `linear-gradient(135deg, ${form.primaryColorHex}33 0%, #0f172a 100%)` }}
            >
              <div className="flex items-center space-x-2.5">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-xs">
                    🤖
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-xs text-white">{form.displayName}</h4>
                  <p className="text-[10px] text-slate-400">AMR Realtime Tracking</p>
                </div>
              </div>

              {form.supportHotline && (
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded-lg">
                  📞 {form.supportHotline}
                </span>
              )}
            </div>

            {/* Simulated Map */}
            <div className="w-full h-32 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="text-xs text-slate-500 font-medium">Bản đồ di chuyển AMR</div>
              <div
                className="absolute w-8 h-8 rounded-xl flex items-center justify-center text-sm text-white shadow-lg animate-bounce"
                style={{ backgroundColor: form.primaryColorHex }}
              >
                🤖
              </div>
            </div>

            {/* Simulated Unlock Button */}
            <button
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1"
              style={{ backgroundColor: form.primaryColorHex }}
            >
              <span>🔓 Mở Cốp Nhận Hàng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
