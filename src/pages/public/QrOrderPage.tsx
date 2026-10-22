import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function QrOrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeId = searchParams.get('storeId') || '';
  const tableNo = searchParams.get('tableNo') || searchParams.get('tableId') || 'Bàn 01';

  const [orderCode, setOrderCode] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('delivery');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string>('');
  const [trackingToken, setTrackingToken] = useState<string>('');

  const serviceOptions = [
    {
      id: 'delivery',
      title: 'Giao món từ Bếp / Bar',
      desc: 'Robot AMR vận chuyển khay món đã gọi từ quầy ra bàn của bạn',
      icon: '🍲'
    },
    {
      id: 'refill',
      title: 'Tiếp nước / Đá / Gia vị',
      desc: 'Robot mang thêm nước uống, khăn ướt hoặc đồ dùng bàn ăn',
      icon: '🥤'
    },
    {
      id: 'cleanup',
      title: 'Thu dọn khay / Chén dĩa',
      desc: 'Robot AMR ghé bàn để thu gom đồ dùng và khay trống',
      icon: '🧹'
    },
    {
      id: 'staff_call',
      title: 'Gọi nhân viên phục vụ',
      desc: 'Hỗ trợ đổi bàn, kiểm tra món hoặc thanh toán',
      icon: '🛎️'
    }
  ];

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedCode = orderCode.trim() || `REQ-${Date.now().toString().slice(-6)}`;
    const fullNotes = `[${serviceOptions.find(s => s.id === serviceType)?.title}] ${notes ? `- ${notes}` : ''} (Mã đối soát: ${generatedCode})`;

    const payload = {
      storeId: storeId || undefined,
      tableNo: tableNo,
      orderCode: generatedCode,
      customerName: customerName || `Khách tại ${tableNo}`,
      customerPhone: customerPhone || '0900000000',
      paymentMethod: 'POST_PAID',
      platform: 'WebQR',
      deliveryNodeId: tableNo.replace(/\s+/g, '_').toUpperCase(),
      shippingAddress: `Vị trí: ${tableNo} (${fullNotes})`,
      items: []
    };

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedOrderCode(data.orderCode || generatedCode);
        setTrackingToken(data.trackingToken || data.orderId || '');
        setOrderSuccess(true);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message || 'Gửi yêu cầu thất bại, vui lòng liên hệ nhân viên.');
      }
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu gọi robot', err);
      alert('Không thể kết nối đến hệ thống máy chủ VORA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30 animate-pulse">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full mb-3">
          ĐÃ ĐIỀU PHỐI ROBOT AMR
        </span>

        <h1 className="text-2xl font-bold mb-2">Đã Tiếp Nhận Yêu Cầu!</h1>
        <p className="text-slate-400 text-sm mb-6 max-w-sm">
          Robot AMR đang chuẩn bị lộ trình di chuyển tới <span className="text-white font-bold">{tableNo}</span>.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 max-w-sm w-full text-left space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
            <span className="text-slate-400">Vị trí bàn:</span>
            <span className="font-bold text-white text-base">📍 {tableNo}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
            <span className="text-slate-400">Mã ghi chú / Đơn:</span>
            <span className="font-mono font-bold text-indigo-400">{createdOrderCode}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Trạng thái:</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Đang xếp hàng điều phối
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {trackingToken && (
            <button
              onClick={() => navigate(`/track/${trackingToken}`)}
              className="w-full bg-[#0062FF] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>Xem Bản Đồ Robot Di Chuyển</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}

          <button
            onClick={() => setOrderSuccess(false)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-6 rounded-xl border border-slate-800 transition"
          >
            Gửi Yêu Cầu Mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0062FF]/15 border border-[#0062FF]/30 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-tight">VORA AMR Service</h1>
            <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
              📍 {tableNo}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-bold">
          ONLINE
        </span>
      </header>

      {/* Main Form */}
      <main className="p-4 max-w-lg mx-auto mt-2">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5 shadow-sm">
          <h2 className="text-lg font-bold text-white mb-1">Gọi Robot Phục Vụ</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống không quản lý thực đơn hay tính tiền. Bạn chỉ cần chọn yêu cầu và ghi chú mã hóa đơn (nếu có) để Robot AMR mang khay tới đúng vị trí bàn của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {/* Service selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Loại Yêu Cầu Phục Vụ
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {serviceOptions.map((opt) => {
                const selected = serviceType === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setServiceType(opt.id)}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                      selected
                        ? 'bg-blue-950/40 border-[#0062FF] text-white shadow-sm shadow-blue-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{opt.title}</span>
                        {selected && (
                          <span className="w-2 h-2 rounded-full bg-[#0062FF]" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-normal">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Order Code Note */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Mã Đơn / Số Hóa Đơn (Tùy chọn)
              </label>
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="VD: #1042 hoặc Mã in trên phiếu gọi món"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0062FF]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mã này dùng để nhân viên bếp dán ghi chú lên khay và robot hiển thị khi tới bàn.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Ghi Chú Thêm Cho Bếp / Phục Vụ
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="VD: Đồ uống ít đá, thêm 2 đôi đũa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0062FF]"
              />
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Thông Tin Liên Hệ (Tùy Chọn)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên khách"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0062FF]"
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#0062FF]"
                />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0062FF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi yêu cầu...
              </span>
            ) : (
              <span>🚀 Xác Nhận Gọi Robot Phục Vụ</span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
export default QrOrderPage;
