import { Link } from 'react-router-dom';

export function HomePage() {
  // Retrieve user info for personalization
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Người dùng' };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-brand-700 via-brand-600 to-slate-900 p-8 md:p-12 text-white shadow-xl shadow-brand-700/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-100 text-xs font-semibold uppercase tracking-wider border border-white/20">
            <span>✨</span> Hệ thống phân phối tự động AMR
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-extrabold leading-tight tracking-tight text-white">
            Chào mừng trở lại, <span className="bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">{user.name}</span>!
          </h1>
          <p className="text-slate-200 text-base md:text-lg leading-relaxed">
            Đặt đồ uống hoặc vật tư y tế/thiết bị trực tuyến ngay hôm nay. Robot tự hành AMR của chúng tôi sẽ giao hàng trực tiếp đến bàn của bạn!
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Link
              to="/products"
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-brand-700 font-bold shadow-lg transition-all duration-150 hover:-translate-y-0.5"
            >
              🛍️ Đặt hàng ngay
            </Link>
            <Link
              to="/orders"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all duration-150 hover:-translate-y-0.5"
            >
              📋 Lịch sử đơn hàng
            </Link>
          </div>
        </div>
        
        {/* Background Decorative Grid */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden lg:block">
          <div className="w-full h-full border-l border-t border-slate-700 rounded-tl-3xl grid-bg"></div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-slate-900">Dịch vụ của chúng tôi</h2>
          <p className="text-slate-500 text-sm mt-1">Trải nghiệm vận chuyển kho vận thông minh thế hệ mới</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🚀',
              title: 'Giao hàng Siêu tốc AMR',
              desc: 'Robot tự động điều phối và chuyển đồ từ quầy đến trạm giao nhận của bạn mà không cần trung gian.',
              color: 'from-orange-50/50 to-orange-100/10 text-orange-700 border-orange-200'
            },
            {
              icon: '🛡️',
              title: 'Thanh toán An toàn',
              desc: 'Tích hợp cổng VNPAY an toàn bảo mật, giao dịch được xác nhận tức thì trên hệ thống.',
              color: 'from-emerald-50/50 to-emerald-100/10 text-emerald-700 border-emerald-200'
            },
            {
              icon: '📍',
              title: 'Theo dõi thời gian thực',
              desc: 'Định vị và giám sát lộ trình của Robot chuyển hàng trên bản đồ kho trực tuyến 24/7.',
              color: 'from-blue-50/50 to-blue-100/10 text-blue-700 border-blue-200'
            }
          ].map((item, i) => (
            <div key={i} className={`bg-gradient-to-br ${item.color} bg-white p-6 rounded-2xl border flex flex-col justify-between shadow-sm`}>
              <div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-550 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Guide Steps */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        <h3 className="text-xl font-heading font-bold text-slate-900 mb-6 text-center">
          Quy trình đặt hàng & Nhận hàng tự động
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            { step: '01', title: 'Chọn sản phẩm', desc: 'Duyệt qua danh mục vật tư hoặc đồ uống chất lượng' },
            { step: '02', title: 'Chọn trạm giao', desc: 'Chọn vị trí bàn/trạm mà bạn đang làm việc' },
            { step: '03', title: 'Thanh toán', desc: 'Thanh toán đơn hàng qua cổng trực tuyến VNPAY' },
            { step: '04', title: 'Nhận hàng', desc: 'Robot AMR sẽ đi tới trạm của bạn và thông báo nhận đồ!' }
          ].map((s, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center p-4">
              <span className="text-4xl font-heading font-black text-brand-100 mb-2">{s.step}</span>
              <h4 className="font-bold text-slate-800 mb-1">{s.title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
