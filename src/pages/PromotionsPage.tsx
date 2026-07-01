import { useState, useEffect, useCallback, useRef } from 'react';
import { promotionService } from '../services/promotion';
import { productService } from '../services/productService';
import type {
  PromotionDto,
  CreatePromotionRequest,
  CreateFlashSaleRequest,
  FlashSaleProductItem,
} from '../types/promotion';
import type { Product } from '@/types/stock';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';
import { CustomSelect } from '@/components/CustomSelect';

// ─── helpers ──────────────────────────────────────────────────────────────────

const statusToNumber = (status?: string): number | undefined => {
  switch (status) {
    case 'active': return 1;
    case 'inactive': return 2;
    case 'expired': return 3;
    case 'upcoming': return 4;
    default: return undefined;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Hoạt động';
    case 'inactive': return 'Tắt';
    case 'expired': return 'Hết hạn';
    case 'upcoming': return 'Sắp diễn ra';
    default: return 'Không xác định';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'inactive': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'expired': return 'bg-red-50 text-red-600 border-red-200';
    case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const handleApiError = (err: unknown, action: string) => {
  const axiosErr = err as { response?: { data?: { message?: string; Message?: string; Errors?: Record<string, string[]> } }; message?: string };
  const validation = axiosErr.response?.data?.Errors;
  let msg = '';
  if (validation && typeof validation === 'object') {
    msg = Object.entries(validation).map(([f, ms]) => `${f}: ${ms.join(', ')}`).join(' | ');
  } else {
    msg = axiosErr.response?.data?.Message || axiosErr.response?.data?.message || axiosErr.message || 'Lỗi không xác định';
  }
  toast.error(`Lỗi khi ${action}: ${msg}`);
};

// ─── DatePicker ───────────────────────────────────────────────────────────────

interface DatePickerProps { label: string; value: string; onChange: (v: string) => void; required?: boolean; }

function DatePicker({ label, value, onChange, required }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(() => selDate || new Date());

  useEffect(() => { if (selDate) setViewDate(selDate); }, [value]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  let startDay = new Date(year, month, 1).getDay(); startDay = startDay === 0 ? 6 : startDay - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();
  const days: { date: Date; cur: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) days.push({ date: new Date(year, month - 1, prevTotalDays - i), cur: false });
  for (let i = 1; i <= totalDays; i++) days.push({ date: new Date(year, month, i), cur: true });
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++) days.push({ date: new Date(year, month + 1, i), cur: false });

  const fmtDisp = (s: string) => { if (!s) return 'Chọn ngày...'; const d = new Date(s); if (isNaN(d.getTime())) return 'Chọn ngày...'; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
  const isSel = (d: Date) => selDate && d.getDate()===selDate.getDate() && d.getMonth()===selDate.getMonth() && d.getFullYear()===selDate.getFullYear();
  const isToday = (d: Date) => { const t = new Date(); return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear(); };
  const pick = (d: Date) => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'); onChange(`${y}-${m}-${dd}`); setIsOpen(false); };

  return (
    <div className="relative space-y-1.5" ref={ref}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        {label}
      </label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer">
        <span className={value ? 'text-slate-800' : 'text-slate-400 font-medium'}>{fmtDisp(value)}</span>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 min-w-[260px]">
          <div className="flex justify-between items-center">
            <button type="button" onClick={() => setViewDate(new Date(year, month-1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer border-0 bg-transparent"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
            <span className="text-sm font-extrabold text-slate-800">Tháng {month+1}, {year}</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month+1, 1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer border-0 bg-transparent"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['T2','T3','T4','T5','T6','T7','CN'].map(d => <span key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((cd, i) => (
              <button key={i} type="button" onClick={() => pick(cd.date)}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none active:scale-90 border-0 bg-transparent ${cd.cur ? 'text-slate-800' : 'text-slate-300'} ${isSel(cd.date) ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm' : ''} ${isToday(cd.date) && !isSel(cd.date) ? 'border border-brand-500 text-brand-600' : ''} ${!isSel(cd.date) && !isToday(cd.date) ? 'hover:bg-slate-100' : ''}`}>
                {cd.date.getDate()}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center border-t border-slate-100 pt-2">
            <button type="button" onClick={() => pick(new Date())} className="text-[11px] font-bold text-brand-600 hover:text-brand-500 cursor-pointer border-0 bg-transparent">Hôm nay</button>
            {!required && <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent">Xóa</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function FlashSaleCountdown({ endDate, status }: { endDate: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (status === 'expired') { setTimeLeft('Đã kết thúc'); return; }
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Đã kết thúc'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}n ${h}g ${m}p` : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [endDate, status]);
  return <span>{timeLeft}</span>;
}

// ─── Flash Sale Card ──────────────────────────────────────────────────────────

function FlashSaleCard({
  promo, products, onDelete, onEdit
}: { promo: PromotionDto; products: Product[]; onDelete: (id: string) => void; onEdit: (promo: PromotionDto) => void }) {
  const isActive = promo.status === 'active';
  const isUpcoming = promo.status === 'upcoming';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${isActive ? 'border-amber-200' : 'border-slate-200'}`}>
      {/* Card header */}
      <div className={`px-5 py-4 flex items-start justify-between ${isActive ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-slate-50'}`}>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getStatusColor(promo.status)}`}>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {getStatusLabel(promo.status)}
            </span>
            <code className={`text-xs font-black tracking-wider px-2 py-0.5 rounded-lg ${isActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {promo.code}
            </code>
          </div>
          <p className="text-sm font-bold text-slate-800 truncate">{promo.description}</p>
        </div>
        <div className="shrink-0 ml-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <Icons.Bolt className={`w-5 h-5 ${isActive ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          </div>
        </div>
      </div>

      {/* Time info */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            {fmtDate(promo.startDate)} → {fmtDate(promo.endDate)}
          </span>
          {(isActive || isUpcoming) && (
            <span className={`font-black tabular-nums ${isActive ? 'text-amber-600' : 'text-blue-600'}`}>
              <FlashSaleCountdown endDate={promo.endDate} status={promo.status} />
            </span>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="px-5 py-3 space-y-2.5 max-h-52 overflow-y-auto">
        {promo.flashSaleProducts.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-3">Không có sản phẩm</p>
        ) : promo.flashSaleProducts.map(fp => {
          const prod = products.find(p => p.id === fp.productId);
          const pct = prod ? Math.round(((prod.price - fp.flashSalePrice) / prod.price) * 100) : 0;
          const progress = fp.stockLimit > 0 ? Math.min(100, Math.round((fp.soldCount / fp.stockLimit) * 100)) : 0;
          return (
            <div key={fp.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{prod?.name || fp.productId}</p>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="text-slate-400 line-through">{prod?.price.toLocaleString()}đ</span>
                    <span className="text-amber-600 font-black">{fp.flashSalePrice.toLocaleString()}đ</span>
                    {pct > 0 && <span className="bg-red-100 text-red-700 px-1.5 rounded font-black">-{pct}%</span>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[10px] text-slate-500 font-bold">
                    {fp.soldCount}/{fp.stockLimit > 0 ? fp.stockLimit : '∞'}
                  </p>
                </div>
              </div>
              {fp.stockLimit > 0 && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progress >= 90 ? 'bg-red-500' : progress >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onEdit(promo)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-brand-600 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Sửa
        </button>
        <button
          onClick={() => onDelete(promo.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200/60 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Xóa
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<'promotions' | 'flashsales'>('promotions');
  const [allPromotions, setAllPromotions] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Promo modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null);
  const defaultPromoForm = (): CreatePromotionRequest & { status?: string } => ({
    code: '', description: '', type: 'percentage', value: 0,
    startDate: '', endDate: '', usageLimit: 0,
    minOrderAmount: undefined, maxDiscount: undefined, status: undefined,
  });
  const [promoForm, setPromoForm] = useState(defaultPromoForm);

  // Flash sale modal
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<PromotionDto | null>(null);
  const defaultFlashForm = (): CreateFlashSaleRequest => ({ code: '', description: '', startDate: '', endDate: '', flashSaleProducts: [] });
  const [flashForm, setFlashForm] = useState(defaultFlashForm);

  // Product picker for flash sale modal
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selProductId, setSelProductId] = useState('');
  const [selFlashPrice, setSelFlashPrice] = useState(0);
  const [selStockLimit, setSelStockLimit] = useState(0);

  // Delete dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derived lists
  const promotions = allPromotions.filter(p => p.type !== 'flashSale');
  const flashSales = allPromotions.filter(p => p.type === 'flashSale');
  const filteredPromos = statusFilter ? promotions.filter(p => p.status === statusFilter) : promotions;
  const filteredFlash = statusFilter ? flashSales.filter(p => p.status === statusFilter) : flashSales;

  // Stats
  const activeFlash = flashSales.filter(p => p.status === 'active').length;
  const upcomingFlash = flashSales.filter(p => p.status === 'upcoming').length;
  const activePromos = promotions.filter(p => p.status === 'active').length;

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAllPromotions(await promotionService.listPromotions()); }
    catch { setError('Không thể tải danh sách khuyến mãi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { productService.getProducts().then(setAvailableProducts).catch(console.error); }, []);
  useEffect(() => {
    const h = () => loadAll();
    window.addEventListener('smartwarehouse-notification', h);
    return () => window.removeEventListener('smartwarehouse-notification', h);
  }, [loadAll]);

  // ── Promotion handlers ──
  const openCreatePromo = () => { setEditingPromotion(null); setPromoForm(defaultPromoForm()); setShowPromoModal(true); };
  const openEditPromo = (p: PromotionDto) => {
    setEditingPromotion(p);
    setPromoForm({ code: p.code, description: p.description, type: p.type as 'percentage'|'fixed', value: p.value, startDate: p.startDate, endDate: p.endDate, usageLimit: p.usageLimit, minOrderAmount: p.minOrderAmount, maxDiscount: p.maxDiscount, status: p.status });
    setShowPromoModal(true);
  };

  const handleSubmitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await promotionService.updatePromotion(editingPromotion.id, {
          id: editingPromotion.id,
          description: promoForm.description,
          type: promoForm.type,
          value: promoForm.value,
          startDate: promoForm.startDate,
          endDate: promoForm.endDate,
          minOrderAmount: promoForm.minOrderAmount,
          maxDiscount: promoForm.maxDiscount,
          usageLimit: promoForm.usageLimit,
          status: statusToNumber(promoForm.status),
        });
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await promotionService.createPromotion(promoForm);
        toast.success('Thêm khuyến mãi mới thành công!');
      }
      setShowPromoModal(false); setEditingPromotion(null); setPromoForm(defaultPromoForm()); loadAll();
    } catch (err) { handleApiError(err, 'lưu khuyến mãi'); }
  };

  // ── Flash Sale handlers ──
  const openCreateFlash = () => { setEditingFlashSale(null); setFlashForm(defaultFlashForm()); setSelProductId(''); setSelFlashPrice(0); setSelStockLimit(0); setShowFlashModal(true); };
  const openEditFlash = (p: PromotionDto) => {
    setEditingFlashSale(p);
    setFlashForm({
      code: p.code,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
      flashSaleProducts: p.flashSaleProducts.map(fp => ({ productId: fp.productId, flashSalePrice: fp.flashSalePrice, stockLimit: fp.stockLimit })),
    });
    setSelProductId(''); setSelFlashPrice(0); setSelStockLimit(0);
    setShowFlashModal(true);
  };

  const handleAddFlashProduct = () => {
    if (!selProductId) { toast.warning('Vui lòng chọn sản phẩm.'); return; }
    if (selFlashPrice <= 0) { toast.warning('Giá Flash Sale phải lớn hơn 0.'); return; }
    setFlashForm(prev => ({ ...prev, flashSaleProducts: [...(prev.flashSaleProducts||[]), { productId: selProductId, flashSalePrice: selFlashPrice, stockLimit: selStockLimit }] }));
    setSelProductId(''); setSelFlashPrice(0); setSelStockLimit(0);
  };

  const handleRemoveFlashProduct = (pid: string) => {
    setFlashForm(prev => ({ ...prev, flashSaleProducts: (prev.flashSaleProducts||[]).filter(fp => fp.productId !== pid) }));
  };

  const handleSubmitFlash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashForm.flashSaleProducts || flashForm.flashSaleProducts.length === 0) {
      toast.warning('Vui lòng thêm ít nhất 1 sản phẩm vào Flash Sale.'); return;
    }
    try {
      if (editingFlashSale) {
        await promotionService.updatePromotion(editingFlashSale.id, {
          id: editingFlashSale.id,
          description: flashForm.description,
          startDate: flashForm.startDate,
          endDate: flashForm.endDate,
        });
        toast.success('Cập nhật Flash Sale thành công!');
      } else {
        await promotionService.createFlashSale(flashForm);
        toast.success('Tạo Flash Sale thành công!');
      }
      setShowFlashModal(false); setEditingFlashSale(null); setFlashForm(defaultFlashForm()); loadAll();
    } catch (err) { handleApiError(err, editingFlashSale ? 'cập nhật Flash Sale' : 'tạo Flash Sale'); }
  };

  // ── Delete ──
  const confirmDelete = async (id: string) => {
    try { await promotionService.deletePromotion(id); toast.success('Xóa thành công!'); setDeletingId(null); loadAll(); }
    catch { toast.error('Lỗi khi xóa.'); setDeletingId(null); }
  };

  // ── Status filter chips ──
  const statusChips = [
    { key: '', label: 'Tất cả' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'upcoming', label: 'Sắp diễn ra' },
    { key: 'inactive', label: 'Tắt' },
    { key: 'expired', label: 'Hết hạn' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="space-y-6 p-6 xl:p-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-4xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <Icons.TagDiscount className="w-10 h-10 text-brand-600" />
              Khuyến mãi & Flash Sales
            </h1>
            <p className="text-base text-slate-500 font-medium">
              Quản lý mã giảm giá, khuyến mãi cố định và chương trình Flash Sale
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {activeTab === 'promotions' ? (
              <button onClick={openCreatePromo}
                className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 active:scale-98 transition-all cursor-pointer">
                <Icons.Plus className="w-5 h-5" />
                Thêm khuyến mãi
              </button>
            ) : (
              <button onClick={openCreateFlash}
                className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/25 active:scale-98 transition-all cursor-pointer">
                <Icons.Bolt className="w-5 h-5 fill-white" />
                Tạo Flash Sale
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs + Filters Row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
            {[
              { key: 'promotions', label: 'Khuyến mãi', count: promotions.length, icon: <Icons.TagDiscount className="w-5 h-5" /> },
              { key: 'flashsales', label: 'Flash Sales', count: flashSales.length, icon: <Icons.Bolt className="w-5 h-5" /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as 'promotions'|'flashsales'); setStatusFilter(''); }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                }`}
              >
                <span className={activeTab === tab.key ? 'text-brand-600' : ''}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`min-w-[22px] h-[22px] flex items-center justify-center text-xs font-black rounded-full ${
                  activeTab === tab.key ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {statusChips.map(chip => (
              <button key={chip.key} onClick={() => setStatusFilter(chip.key)}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all cursor-pointer ${
                  statusFilter === chip.key
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
            <p className="text-slate-550 text-sm font-semibold">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* ══ PROMOTIONS TAB ══ */}
            {activeTab === 'promotions' && (
              <div className="space-y-5">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Tổng khuyến mãi', value: promotions.length, color: 'text-slate-700', bg: 'bg-white border-slate-200', icon: '📊' },
                    { label: 'Đang hoạt động', value: activePromos, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '✅' },
                    { label: 'Sắp diễn ra', value: promotions.filter(p=>p.status==='upcoming').length, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '🕐' },
                    { label: 'Hết hạn', value: promotions.filter(p=>p.status==='expired').length, color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: '⏰' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-2xl px-5 py-4 space-y-2 shadow-sm`}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                          <th className="px-6 py-4">Mã</th>
                          <th className="px-6 py-4">Mô tả</th>
                          <th className="px-6 py-4">Loại</th>
                          <th className="px-6 py-4">Mức giảm</th>
                          <th className="px-6 py-4">Sử dụng</th>
                          <th className="px-6 py-4">Thời gian</th>
                          <th className="px-6 py-4">Trạng thái</th>
                          <th className="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPromos.map(promo => (
                          <tr key={promo.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <code className="bg-slate-100 px-2.5 py-1 rounded-lg text-sm font-black text-slate-700">{promo.code}</code>
                            </td>
                            <td className="px-6 py-4 text-slate-600 max-w-[220px] truncate font-medium text-sm">{promo.description}</td>
                            <td className="px-6 py-4">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg whitespace-nowrap">
                                {promo.type === 'percentage' ? '% Phần trăm' : 'Cố định đ'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black text-slate-900 text-base whitespace-nowrap">
                              {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString()}đ`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-bold text-slate-700">{promo.usedCount}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-sm text-slate-400 font-semibold">{promo.usageLimit === 0 ? '∞' : promo.usageLimit}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 font-semibold whitespace-nowrap">
                              {fmtDate(promo.startDate)} – {fmtDate(promo.endDate)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${getStatusColor(promo.status)}`}>
                                {getStatusLabel(promo.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                              <button onClick={() => openEditPromo(promo)}
                                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-brand-600 text-sm font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer">
                                Sửa
                              </button>
                              <button onClick={() => setDeletingId(promo.id)}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-lg border border-red-200/50 transition-all cursor-pointer">
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredPromos.length === 0 && (
                          <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-semibold">Chưa có khuyến mãi nào</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══ FLASH SALES TAB ══ */}
            {activeTab === 'flashsales' && (
              <div className="space-y-5">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Tổng Flash Sale', value: flashSales.length, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
                    { label: 'Đang diễn ra', value: activeFlash, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'Sắp diễn ra', value: upcomingFlash, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                    { label: 'Đã kết thúc', value: flashSales.filter(p=>p.status==='expired').length, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-2xl px-5 py-4 space-y-2 shadow-sm`}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Card Grid */}
                {filteredFlash.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto border border-amber-200">
                      <Icons.Bolt className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-slate-700 font-bold text-xl">Chưa có Flash Sale nào</p>
                      <p className="text-slate-400 text-base font-medium">Tạo chương trình Flash Sale để kích thích doanh số</p>
                    </div>
                    <button onClick={openCreateFlash}
                      className="inline-flex items-center gap-2.5 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/25">
                      <Icons.Plus className="w-5 h-5" />
                      Tạo Flash Sale đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredFlash.map(fs => (
                      <FlashSaleCard key={fs.id} promo={fs} products={availableProducts} onDelete={setDeletingId} onEdit={openEditFlash} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CREATE/EDIT PROMOTION MODAL ══ */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200/60 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-heading font-black text-slate-900">
                  {editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Áp dụng cho loại giảm giá theo phần trăm hoặc cố định</p>
              </div>
              <button onClick={() => { setShowPromoModal(false); setEditingPromotion(null); }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitPromo} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Code */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã khuyến mãi</label>
                <input type="text" value={promoForm.code}
                  onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                  required disabled={!!editingPromotion}
                  placeholder="VD: GIAMGIA30"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả</label>
                <textarea value={promoForm.description}
                  onChange={e => setPromoForm({...promoForm, description: e.target.value})}
                  required rows={2} placeholder="Nhập mô tả..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-medium resize-none" />
              </div>
              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <CustomSelect
                  label="Loại chiết khấu"
                  value={promoForm.type}
                  onChange={v => setPromoForm({...promoForm, type: v as 'percentage'|'fixed'})}
                  options={[
                    { value: 'percentage', label: 'Phần trăm (%)' },
                    { value: 'fixed', label: 'Cố định (đ)' }
                  ]}
                  placeholder="Chọn loại chiết khấu..."
                  disabled={!!editingPromotion}
                />
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {promoForm.type === 'percentage' ? 'Mức giảm (%)' : 'Số tiền giảm (đ)'}
                  </label>
                  <div className="relative">
                    <input type="number" value={promoForm.value}
                      onChange={e => setPromoForm({...promoForm, value: Number(e.target.value)})}
                      required min={0} max={promoForm.type === 'percentage' ? 100 : undefined}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold pr-8" />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                      {promoForm.type === 'percentage' ? '%' : 'đ'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Ngày bắt đầu" value={promoForm.startDate ? promoForm.startDate.slice(0,10) : ''}
                  onChange={v => setPromoForm({...promoForm, startDate: v ? v+'T00:00:00' : ''})} required />
                <DatePicker label="Ngày kết thúc" value={promoForm.endDate ? promoForm.endDate.slice(0,10) : ''}
                  onChange={v => setPromoForm({...promoForm, endDate: v ? v+'T23:59:59' : ''})} required />
              </div>
              {/* Usage limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giới hạn sử dụng</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                    <input type="checkbox" checked={promoForm.usageLimit === 0}
                      onChange={e => setPromoForm({...promoForm, usageLimit: e.target.checked ? 0 : 100})}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 w-4 h-4 cursor-pointer" />
                    <span>Không giới hạn (∞)</span>
                  </label>
                </div>
                {promoForm.usageLimit > 0 && (
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-w-[180px]">
                    <button type="button" onClick={() => setPromoForm({...promoForm, usageLimit: Math.max(1, promoForm.usageLimit-1)})}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-lg cursor-pointer border-r border-slate-200 bg-transparent">−</button>
                    <input type="number" value={promoForm.usageLimit}
                      onChange={e => setPromoForm({...promoForm, usageLimit: Math.max(1, Number(e.target.value))})}
                      className="w-full text-center bg-transparent border-0 focus:outline-none text-sm font-extrabold text-slate-800 p-0 py-2.5" />
                    <button type="button" onClick={() => setPromoForm({...promoForm, usageLimit: promoForm.usageLimit+1})}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-lg cursor-pointer border-l border-slate-200 bg-transparent">+</button>
                  </div>
                )}
              </div>
              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn hàng tối thiểu (đ)</label>
                  <input type="number" min={0} value={promoForm.minOrderAmount || ''}
                    onChange={e => setPromoForm({...promoForm, minOrderAmount: e.target.value ? Number(e.target.value) : undefined})}
                    placeholder="Tùy chọn"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold" />
                </div>
                {promoForm.type === 'percentage' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giảm tối đa (đ)</label>
                    <input type="number" min={0} value={promoForm.maxDiscount || ''}
                      onChange={e => setPromoForm({...promoForm, maxDiscount: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Tùy chọn"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold" />
                  </div>
                )}
              </div>
              {/* Status (edit only) */}
              {editingPromotion && (
                <CustomSelect
                  label="Trạng thái"
                  value={promoForm.status || ''}
                  onChange={v => setPromoForm({...promoForm, status: v})}
                  options={[
                    { value: 'active', label: 'Hoạt động' },
                    { value: 'inactive', label: 'Tắt' },
                    { value: 'expired', label: 'Hết hạn' },
                    { value: 'upcoming', label: 'Sắp diễn ra' }
                  ]}
                  placeholder="Chọn trạng thái..."
                />
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowPromoModal(false); setEditingPromotion(null); }}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Hủy</button>
                <button type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 cursor-pointer">
                  {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ CREATE FLASH SALE MODAL ══ */}
      {showFlashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200/60 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
                  <Icons.Bolt className="w-5 h-5 text-amber-600 fill-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-black text-slate-900">
                    {editingFlashSale ? 'Sửa Flash Sale' : 'Tạo Flash Sale mới'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {editingFlashSale ? `Chỉnh sửa chương trình: ${editingFlashSale.code}` : 'Chương trình bán hàng với giá đặc biệt có giới hạn thời gian'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowFlashModal(false); setEditingFlashSale(null); }}
                className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitFlash} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã Flash Sale</label>
                  <input type="text" value={flashForm.code}
                    onChange={e => setFlashForm({...flashForm, code: e.target.value.toUpperCase()})}
                    required placeholder="VD: FLASH28"
                    disabled={!!editingFlashSale}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả</label>
                  <input type="text" value={flashForm.description}
                    onChange={e => setFlashForm({...flashForm, description: e.target.value})}
                    required placeholder="Tên chương trình Flash Sale"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Ngày bắt đầu" value={flashForm.startDate ? flashForm.startDate.slice(0,10) : ''}
                  onChange={v => setFlashForm({...flashForm, startDate: v ? v+'T00:00:00' : ''})} required />
                <DatePicker label="Ngày kết thúc" value={flashForm.endDate ? flashForm.endDate.slice(0,10) : ''}
                  onChange={v => setFlashForm({...flashForm, endDate: v ? v+'T23:59:59' : ''})} required />
              </div>

              {/* Flash Sale Products */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Icons.Bolt className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Sản phẩm tham gia Flash Sale
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      {flashForm.flashSaleProducts?.length || 0}
                    </span>
                  </h3>
                  <span className="text-[10px] text-red-600 font-bold">* Bắt buộc phải có ít nhất 1 sản phẩm</span>
                </div>

                {/* Product list */}
                {flashForm.flashSaleProducts && flashForm.flashSaleProducts.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {flashForm.flashSaleProducts.map((fp: FlashSaleProductItem) => {
                      const prod = availableProducts.find(p => p.id === fp.productId);
                      const pct = prod ? Math.round(((prod.price - fp.flashSalePrice) / prod.price) * 100) : 0;
                      return (
                        <div key={fp.productId} className="flex items-center justify-between bg-amber-50/50 border border-amber-200/60 rounded-xl px-4 py-2.5 hover:bg-amber-50 transition-colors">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-bold text-slate-800 truncate">{prod?.name || fp.productId}</p>
                            <div className="flex items-center gap-2 text-[10px] font-semibold">
                              <span className="text-slate-400 line-through">{prod?.price.toLocaleString()}đ</span>
                              <span className="text-amber-600 font-black">{fp.flashSalePrice.toLocaleString()}đ</span>
                              {pct > 0 && <span className="bg-red-100 text-red-700 px-1.5 rounded font-black">-{pct}%</span>}
                              <span className="text-slate-400">· Kho: {fp.stockLimit > 0 ? fp.stockLimit : '∞'}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => handleRemoveFlashProduct(fp.productId)}
                            className="ml-3 w-7 h-7 shrink-0 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer border border-slate-200 hover:border-red-200">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/30 py-6 text-center">
                    <Icons.Bolt className="w-6 h-6 text-amber-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400 italic">Chưa có sản phẩm nào — thêm bên dưới</p>
                  </div>
                )}

                {/* Add product form */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Thêm sản phẩm vào Flash Sale</p>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn sản phẩm</label>
                    <select value={selProductId}
                      onChange={e => { setSelProductId(e.target.value); const p = availableProducts.find(p=>p.id===e.target.value); if(p) setSelFlashPrice(Math.round(p.price*0.8)); }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold cursor-pointer">
                      <option value="">-- Chọn sản phẩm --</option>
                      {availableProducts.filter(p => !(flashForm.flashSaleProducts||[]).some((fp:FlashSaleProductItem)=>fp.productId===p.id)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()}đ</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá Flash Sale (đ)</label>
                      <div className="relative">
                        <input type="number" min={1} value={selFlashPrice || ''}
                          onChange={e => setSelFlashPrice(Number(e.target.value))}
                          placeholder="VD: 50000"
                          className="w-full pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold" />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400 pointer-events-none">đ</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giới hạn kho</label>
                      <div className="relative">
                        <input type="number" min={0} value={selStockLimit || ''}
                          onChange={e => setSelStockLimit(Number(e.target.value))}
                          placeholder="0 = Không giới hạn"
                          className="w-full pl-4 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold" />
                        <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">sản phẩm</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={handleAddFlashProduct}
                    className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98">
                    <Icons.Plus className="w-4 h-4" />
                    Thêm vào danh sách
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowFlashModal(false); setEditingFlashSale(null); }}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Hủy</button>
                <button type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2">
                  <Icons.Bolt className="w-4 h-4 fill-white" />
                  {editingFlashSale ? 'Cập nhật Flash Sale' : 'Kích hoạt Flash Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRMATION ══ */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center">
                <Icons.AlertWarning className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-heading font-extrabold text-slate-900">Xác nhận xóa</h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                  Bạn có chắc muốn xóa chương trình khuyến mãi này? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">Hủy</button>
              <button type="button" onClick={() => confirmDelete(deletingId)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer active:scale-98">
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
