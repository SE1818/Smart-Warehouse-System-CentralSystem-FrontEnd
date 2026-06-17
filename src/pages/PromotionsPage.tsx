import { useState, useEffect } from 'react';
import { promotionService } from '../services/promotion';
import type { PromotionDto, CreatePromotionRequest } from '../types/promotion';

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null);
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

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await promotionService.updatePromotion(editingPromotion.id, form);
      } else {
        await promotionService.createPromotion(form);
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
    } catch (err: any) {
      console.error('Error saving promotion:', err);
      alert('Lỗi khi lưu khuyến mãi: ' + (err.response?.data?.message || err.message));
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

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa khuyến mãi này?')) return;
    try {
      await promotionService.deletePromotion(id);
      loadPromotions();
    } catch (err) {
      console.error('Error deleting promotion:', err);
      alert('Lỗi khi xóa khuyến mãi');
    }
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
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Quản lý Khuyến mãi</h1>
          <button
            onClick={() => { setEditingPromotion(null); setForm({
              code: '', description: '', type: 'percentage', value: 0, startDate: '', endDate: '', usageLimit: 0
            }); setShowModal(true); }}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500"
          >
            ➕ Thêm khuyến mãi
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mã</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mô tả</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Loại</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Giá trị</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Thời gian</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trạng thái</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {promotions.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{promo.code}</td>
                    <td className="px-6 py-4 text-slate-600">{promo.description}</td>
                    <td className="px-6 py-4 text-slate-600">{promo.type}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString()}đ`}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(promo.startDate).toLocaleDateString('vi-VN')} - {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(promo.status)}`}>
                        {getStatusLabel(promo.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(promo)} className="text-brand-600 hover:text-brand-800">Sửa</button>
                      <button onClick={() => handleDelete(promo.id)} className="text-red-600 hover:text-red-800">Xóa</button>
                    </td>
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Chưa có khuyến mãi nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">{editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã khuyến mãi</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed">Giá trị cố định (đ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị</label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                      required
                      min={0}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={form.startDate.slice(0, 10)}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value + 'T00:00:00' })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={form.endDate.slice(0, 10)}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value + 'T23:59:59' })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giới hạn sử dụng</label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })}
                    required
                    min={1}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingPromotion(null); }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500"
                  >
                    {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
