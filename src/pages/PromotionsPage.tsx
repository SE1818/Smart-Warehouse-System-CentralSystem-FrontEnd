import { useState, useEffect, useCallback } from 'react';
import { promotionService } from '../services/promotion';
import type { PromotionDto, CreatePromotionRequest } from '../types/promotion';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePromotionRequest>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await promotionService.updatePromotion(editingPromotion.id, form);
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await promotionService.createPromotion(form);
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
      });
      loadPromotions();
    } catch (err) {
      console.error('Error saving promotion:', err);
      const axiosError = err as { response?: { data?: { message?: string; Message?: string } }; message?: string };
      const serverMsg =
        axiosError.response?.data?.Message ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Lỗi không xác định';
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
      flashSaleProducts: promo.flashSaleProducts,
    });
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
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-6">
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.TagDiscount className="w-8 h-8 text-brand-600" />
            <span>Quản lý Khuyến mãi</span>
          </h1>
          <button
            onClick={() => { setEditingPromotion(null); setForm({
              code: '', description: '', type: 'percentage', value: 0, startDate: '', endDate: '', usageLimit: 0
            }); setShowModal(true); }}
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
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg">
                          {promo.type === 'percentage' ? 'Phần trăm' : 'Cố định'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString()}đ`}
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
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold cursor-pointer"
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed">Giá trị cố định (đ)</option>
                    </select>
                  </div>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={form.startDate.slice(0, 10)}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value + 'T00:00:00' })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={form.endDate.slice(0, 10)}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value + 'T23:59:59' })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giới hạn số lần sử dụng</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                    required
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                  />
                </div>
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

