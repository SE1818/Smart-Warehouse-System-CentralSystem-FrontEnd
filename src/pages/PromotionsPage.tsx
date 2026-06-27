import { useState, useEffect, useCallback, useRef } from 'react';
import { promotionService } from '../services/promotion';
import { productService } from '../services/productService';
import type { PromotionDto, CreatePromotionRequest } from '../types/promotion';
import type { Product } from '@/types/stock';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

const statusToNumber = (status?: string): number | undefined => {
  if (!status) return undefined;
  switch (status) {
    case 'active': return 1;
    case 'inactive': return 2;
    case 'expired': return 3;
    case 'upcoming': return 4;
    default: return undefined;
  }
};

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function DatePicker({ label, value, onChange, required }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevTotalDays - i),
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }

  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return 'Chọn ngày...';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Chọn ngày...';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
        <Icons.HistoryLogs className="w-3.5 h-3.5 text-brand-500" />
        <span>{label}</span>
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer"
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400 font-medium'}>
          {formatDisplay(value)}
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 animate-fade-in max-w-sm mx-auto">
          <div className="flex justify-between items-center select-none">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer border-0 bg-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-extrabold text-slate-850">
              Tháng {month + 1}, {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer border-0 bg-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center select-none">
            {weekDays.map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cd, idx) => {
              const selected = isSelected(cd.date);
              const today = isToday(cd.date);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cd.date)}
                  className={`
                    py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none active:scale-90 border-0 bg-transparent
                    ${cd.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}
                    ${selected ? 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm' : ''}
                    ${today && !selected ? 'border border-brand-500 text-brand-600' : ''}
                    ${!selected && !today ? 'hover:bg-slate-100' : ''}
                  `}
                >
                  {cd.date.getDate()}
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-between items-center border-t border-slate-100 pt-2 select-none">
            <button
              type="button"
              onClick={() => handleSelectDay(new Date())}
              className="text-[11px] font-bold text-brand-650 hover:text-brand-500 cursor-pointer border-0 bg-transparent"
            >
              Hôm nay
            </button>
            {required !== true && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-650 cursor-pointer border-0 bg-transparent"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
  
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [flashSalePrice, setFlashSalePrice] = useState(0);
  const [flashSaleStockLimit, setFlashSaleStockLimit] = useState(0);

  const [form, setForm] = useState<CreatePromotionRequest & { status?: string }>({
    code: '',
    description: '',
    type: 'percentage',
    value: 0,
    startDate: '',
    endDate: '',
    usageLimit: 0,
    minOrderAmount: undefined,
    maxDiscount: undefined,
    flashSaleProducts: [],
    status: undefined,
  });

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await promotionService.listPromotions();
      setPromotions(data);
    } catch (err) {
      console.error('Error loading promotions:', err);
      setError('Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPromotions();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPromotions]);

  useEffect(() => {
    const handleRefresh = () => {
      loadPromotions();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [loadPromotions]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts();
        setAvailableProducts(data);
      } catch (err) {
        console.error('Error loading products:', err);
      }
    };
    loadProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure positive value is sent if it is a flashSale promotion (dummy value >= 1 is required by backend validator)
      const submitValue = form.type === 'flashSale' ? (form.value > 0 ? form.value : 1) : form.value;
      
      if (editingPromotion) {
        await promotionService.updatePromotion(editingPromotion.id, {
          id: editingPromotion.id,
          description: form.description,
          type: form.type,
          value: submitValue,
          startDate: form.startDate,
          endDate: form.endDate,
          minOrderAmount: form.minOrderAmount,
          maxDiscount: form.maxDiscount,
          usageLimit: form.usageLimit,
          status: statusToNumber(form.status),
        });
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await promotionService.createPromotion({
          code: form.code,
          description: form.description,
          type: form.type,
          value: submitValue,
          startDate: form.startDate,
          endDate: form.endDate,
          minOrderAmount: form.minOrderAmount,
          maxDiscount: form.maxDiscount,
          usageLimit: form.usageLimit,
          flashSaleProducts: form.type === 'flashSale' ? form.flashSaleProducts : undefined,
        });
        toast.success('Thêm khuyến mãi mới thành công!');
      }
      setShowModal(false);
      setEditingPromotion(null);
      setForm({
        code: '',
        description: '',
        type: 'percentage',
        value: 0,
        startDate: '',
        endDate: '',
        usageLimit: 0,
        minOrderAmount: undefined,
        maxDiscount: undefined,
        flashSaleProducts: [],
        status: undefined,
      });
      setSelectedProductId('');
      setFlashSalePrice(0);
      setFlashSaleStockLimit(0);
      loadPromotions();
    } catch (err) {
      console.error('Error saving promotion:', err);
      const axiosError = err as { response?: { data?: { message?: string; Message?: string; Errors?: Record<string, string[]> } }; message?: string };
      
      const validationErrors = axiosError.response?.data?.Errors;
      let serverMsg = '';
      if (validationErrors && typeof validationErrors === 'object') {
        serverMsg = Object.entries(validationErrors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join(' | ');
      } else {
        serverMsg =
          axiosError.response?.data?.Message ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          'Lỗi không xác định';
      }
      toast.error('Lỗi khi lưu khuyến mãi: ' + serverMsg);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingPromoId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await promotionService.deletePromotion(id);
      setDeletingPromoId(null);
      toast.success('Xóa khuyến mãi thành công!');
      loadPromotions();
    } catch (err) {
      console.error('Error deleting promotion:', err);
      toast.error('Lỗi khi xóa khuyến mãi');
      setDeletingPromoId(null);
    }
  };

  const handleEdit = (promo: PromotionDto) => {
    setEditingPromotion(promo);
    setForm({
      code: promo.code,
      description: promo.description,
      type: promo.type,
      value: promo.value,
      minOrderAmount: promo.minOrderAmount,
      maxDiscount: promo.maxDiscount,
      startDate: promo.startDate,
      endDate: promo.endDate,
      usageLimit: promo.usageLimit,
      flashSaleProducts: promo.flashSaleProducts || [],
      status: promo.status,
    });
    setSelectedProductId('');
    setFlashSalePrice(0);
    setFlashSaleStockLimit(0);
    setShowModal(true);
  };


  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'inactive':
        return 'Tắt';
      case 'expired':
        return 'Hết hạn';
      case 'upcoming':
        return 'Sắp diễn ra';
      default:
        return 'Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'inactive':
        return 'bg-slate-50 text-slate-500 border-slate-200/60';
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200/60';
      case 'upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <style dangerouslySetInnerHTML={{__html: `
        .custom-datepicker::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
      `}} />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-6">
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.TagDiscount className="w-8 h-8 text-brand-600" />
            <span>Quản lý Khuyến mãi</span>
          </h1>
          <button
            onClick={() => {
              setEditingPromotion(null);
              setForm({
                code: '',
                description: '',
                type: 'percentage',
                value: 0,
                startDate: '',
                endDate: '',
                usageLimit: 0,
                minOrderAmount: undefined,
                maxDiscount: undefined,
                flashSaleProducts: [],
                status: undefined,
              });
              setSelectedProductId('');
              setFlashSalePrice(0);
              setFlashSaleStockLimit(0);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Thêm khuyến mãi</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold flex items-start gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Icons.Spinner className="h-10 w-10 text-brand-600" />
            <p className="text-slate-505 text-xs font-semibold">Đang tải danh sách khuyến mãi...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-4">Mã</th>
                    <th className="p-4">Mô tả</th>
                    <th className="p-4">Loại</th>
                    <th className="p-4">Giá trị</th>
                    <th className="p-4">Thời gian</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{promo.code}</td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">{promo.description}</td>
                      <td className="p-4 text-slate-605">
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                          {promo.type === 'flashSale' && <Icons.Bolt className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          {promo.type === 'percentage' ? 'Phần trăm' : promo.type === 'fixed' ? 'Cố định' : 'Flash Sale'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {promo.type === 'percentage' 
                          ? `${promo.value}%` 
                          : promo.type === 'fixed' 
                          ? `${promo.value.toLocaleString()}đ` 
                          : `Flash Sale (${promo.flashSaleProducts?.length || 0} SP)`}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {new Date(promo.startDate).toLocaleDateString('vi-VN')} - {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(promo.status)}`}>
                          {getStatusLabel(promo.status)}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-brand-600 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100/80 text-red-650 text-xs font-bold rounded-lg border border-red-200/40 transition-all cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {promotions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">Chưa có khuyến mãi nào hoạt động</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200/60">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-lg font-heading font-black text-slate-900">
                  {editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); setEditingPromotion(null); }}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/40"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã khuyến mãi</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="VD: GIAMGIA30"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả chi tiết</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    placeholder="Nhập mô tả khuyến mãi..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại chiết khấu</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      disabled={!!editingPromotion}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed">Giá trị cố định (đ)</option>
                      <option value="flashSale">Flash Sale (Bán chớp nhoáng)</option>
                    </select>
                  </div>
                  {form.type !== 'flashSale' ? (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Mức giảm</label>
                      <input
                        type="number"
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                        required
                        min={0}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">Mức giảm chung</label>
                      <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500">
                        Đặt theo từng sản phẩm bên dưới
                      </div>
                    </div>
                  )}
                </div>

                {editingPromotion && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái khuyến mãi</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold cursor-pointer"
                    >
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Tắt</option>
                      <option value="expired">Hết hạn</option>
                      <option value="upcoming">Sắp diễn ra</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label="Ngày bắt đầu"
                    value={form.startDate ? form.startDate.slice(0, 10) : ''}
                    onChange={(val) => setForm({ ...form, startDate: val ? val + 'T00:00:00' : '' })}
                    required
                  />
                  <DatePicker
                    label="Ngày kết thúc"
                    value={form.endDate ? form.endDate.slice(0, 10) : ''}
                    onChange={(val) => setForm({ ...form, endDate: val ? val + 'T23:59:59' : '' })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Giới hạn số lần sử dụng
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={form.usageLimit === 0}
                        onChange={(e) => setForm({ ...form, usageLimit: e.target.checked ? 0 : 10 })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                      />
                      <span>Không giới hạn (∞)</span>
                    </label>
                  </div>
                  
                  {form.usageLimit > 0 && (
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all max-w-[200px]">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, usageLimit: Math.max(1, form.usageLimit - 1) })}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-all text-lg cursor-pointer select-none active:scale-95 border-r border-slate-200"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={form.usageLimit}
                        onChange={(e) => setForm({ ...form, usageLimit: Math.max(1, Number(e.target.value)) })}
                        required
                        min={1}
                        className="w-full text-center bg-transparent border-0 focus:outline-none focus:ring-0 text-sm font-extrabold text-slate-800 p-0"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, usageLimit: form.usageLimit + 1 })}
                        className="px-3.5 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold transition-all text-lg cursor-pointer select-none active:scale-95 border-l border-slate-200"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {form.type === 'flashSale' && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Icons.Bolt className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Sản phẩm tham gia Flash Sale</span>
                    </h3>

                    {form.flashSaleProducts && form.flashSaleProducts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                        {form.flashSaleProducts.map((fp) => {
                          const prod = availableProducts.find(p => p.id === fp.productId);
                          const discountPercent = prod ? Math.round(((prod.price - fp.flashSalePrice) / prod.price) * 100) : 0;
                          return (
                            <div key={fp.productId} className="flex justify-between items-center bg-slate-50 border border-slate-150 p-3 rounded-xl hover:shadow-sm transition-all">
                              <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Icons.StockBox className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800 truncate" title={prod?.name || fp.productId}>
                                    {prod?.name || 'Sản phẩm không tìm thấy'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold">
                                  <span>Gốc: <span className="line-through">{prod?.price.toLocaleString()}đ</span></span>
                                  <span className="text-amber-600 font-bold">FS: {fp.flashSalePrice.toLocaleString()}đ</span>
                                  {discountPercent > 0 && (
                                    <span className="bg-amber-100 border border-amber-250 text-amber-800 px-1 py-0.2 rounded font-black">
                                      -{discountPercent}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-450 font-bold">
                                  Giới hạn kho: {fp.stockLimit > 0 ? `${fp.stockLimit} sản phẩm` : 'Không giới hạn'}
                                </div>
                              </div>
                              
                              {!editingPromotion && (
                                <button
                                  type="button"
                                  onClick={() => setForm({
                                    ...form,
                                    flashSaleProducts: form.flashSaleProducts?.filter(p => p.productId !== fp.productId) || []
                                  })}
                                  className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-750 flex items-center justify-center transition-all cursor-pointer border border-red-150"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        Chưa chọn sản phẩm nào cho Flash Sale
                      </div>
                    )}

                    {!editingPromotion && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Icons.StockBox className="w-3.5 h-3.5 text-brand-500" />
                            <span>Chọn sản phẩm</span>
                          </label>
                          <select
                            value={selectedProductId}
                            onChange={(e) => {
                              setSelectedProductId(e.target.value);
                              const prod = availableProducts.find(p => p.id === e.target.value);
                              if (prod) {
                                setFlashSalePrice(prod.price * 0.8); // Suggest 20% discount by default
                              }
                            }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold cursor-pointer"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {availableProducts
                              .filter(p => !form.flashSaleProducts?.some(fp => fp.productId === p.id))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.price.toLocaleString()}đ)
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Icons.TagDiscount className="w-3.5 h-3.5 text-brand-500" />
                              <span>Giá Flash Sale</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={flashSalePrice || ''}
                                onChange={(e) => setFlashSalePrice(Number(e.target.value))}
                                min={1}
                                className="w-full pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold"
                                placeholder="VD: 50000"
                              />
                              <span className="absolute inset-y-0 right-3.5 flex items-center text-xs font-bold text-slate-450 pointer-events-none">đ</span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Icons.Warehouse className="w-3.5 h-3.5 text-brand-500" />
                              <span>Giới hạn kho</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={flashSaleStockLimit || ''}
                                onChange={(e) => setFlashSaleStockLimit(Number(e.target.value))}
                                min={0}
                                className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold"
                                placeholder="0 = Không giới hạn"
                              />
                              <span className="absolute inset-y-0 right-3.5 flex items-center text-[10px] font-bold text-slate-400 pointer-events-none">sản phẩm</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProductId) {
                              toast.warning('Vui lòng chọn sản phẩm.');
                              return;
                            }
                            if (flashSalePrice <= 0) {
                              toast.warning('Giá bán Flash Sale phải lớn hơn 0.');
                              return;
                            }
                            setForm({
                              ...form,
                              flashSaleProducts: [
                                ...(form.flashSaleProducts || []),
                                { productId: selectedProductId, flashSalePrice, stockLimit: flashSaleStockLimit }
                              ]
                            });
                            setSelectedProductId('');
                            setFlashSalePrice(0);
                            setFlashSaleStockLimit(0);
                          }}
                          className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 border border-brand-200/40"
                        >
                          <Icons.Plus className="w-4 h-4" />
                          <span>Thêm vào danh sách</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingPromotion(null); }}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-55 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/25 active:scale-98 cursor-pointer"
                  >
                    {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {deletingPromoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-sm shadow-2xl relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                  <Icons.AlertWarning className="w-6 h-6 text-red-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-heading font-extrabold text-slate-900">Xác nhận xóa</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                    Bạn có chắc chắn muốn xóa khuyến mãi này? Hành động này sẽ loại bỏ hoàn toàn mã khuyến mãi khỏi hệ thống và không thể hoàn tác.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingPromoId(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(deletingPromoId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer"
                >
                  Xóa ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

