import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';

const CATEGORIES = [
  { value: 'Đồ uống', label: 'Đồ uống' },
  { value: 'Vật tư y tế', label: 'Vật tư y tế' },
  { value: 'Linh kiện', label: 'Linh kiện' },
  { value: 'Khác', label: 'Khác' },
];

const UNITS = [
  { value: 'chiếc', label: 'chiếc' },
  { value: 'hộp', label: 'hộp' },
  { value: 'thùng', label: 'thùng' },
  { value: 'lít', label: 'lít' },
  { value: 'kg', label: 'kg' },
];

const EMPTY_FORM: Partial<Product> & { _pendingImage?: File } = {
  sku: '',
  name: '',
  category: 'Đồ uống',
  price: 0,
  stockQuantity: 0,
  unit: 'chiếc',
  description: '',
};

export interface ProductFormModalProps {
  open: boolean;
  title: string;
  initialData: Partial<Product> | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  onFileSelected: (file: File) => void;
  imagePreviewUrl: string | null;
  submitLabel: string;
}

export function ProductFormModal({
  open,
  title,
  initialData,
  onClose,
  onSubmit,
  onFileSelected,
  imagePreviewUrl,
  submitLabel,
}: ProductFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Product> & { _pendingImage?: File }>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          id: initialData.id,
          sku: initialData.sku || '',
          name: initialData.name,
          description: initialData.description || '',
          price: initialData.price ?? 0,
          stockQuantity: initialData.stockQuantity ?? 0,
          category: initialData.category || 'Đồ uống',
          unit: initialData.unit || 'chiếc',
          imageUrl: initialData.imageUrl,
          createdAt: initialData.createdAt,
          updatedAt: initialData.updatedAt,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('sku', form.sku || '');
    fd.set('name', form.name || '');
    fd.set('description', form.description || '');
    fd.set('price', String(form.price ?? 0));
    fd.set('stockQuantity', String(form.stockQuantity ?? 0));
    fd.set('category', form.category || 'Đồ uống');
    fd.set('unit', form.unit || 'chiếc');
    if (form._pendingImage) {
      fd.set('image', form._pendingImage);
    }
    await onSubmit(fd);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    setForm((prev) => ({ ...prev, _pendingImage: file }));
    e.target.value = '';
  };

  const resolvePreview = () => {
    if (!imagePreviewUrl) return null;
    if (imagePreviewUrl.startsWith('http') || imagePreviewUrl.startsWith('/')) {
      return imagePreviewUrl;
    }
    return imagePreviewUrl; // data URL from FileReader
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative">
        <h3 className="text-lg font-heading font-extrabold text-slate-900 mb-5 border-b border-slate-100 pb-3 flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-2">
            {title === 'Thêm sản phẩm mới' ? (
              <Icons.Plus className="w-5 h-5 text-brand-600" />
            ) : (
              <Icons.Product className="w-5 h-5 text-brand-600" />
            )}
            {title}
          </span>
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 pb-1">
            {/* Tên sản phẩm */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên sản phẩm</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
              />
            </div>

            {/* Mã SKU */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã SKU</label>
              <input
                type="text"
                value={form.sku || ''}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 font-mono"
              />
            </div>

            {/* Giá bán + Số lượng tồn */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá bán (đ)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng tồn</label>
                <input
                  type="number"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Ảnh sản phẩm */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ảnh sản phẩm</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {resolvePreview() && (
                <div className="mb-2">
                  <img
                    src={resolvePreview()!}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-brand-300 rounded-xl text-xs font-bold text-slate-600 hover:text-brand-600 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  Tải ảnh lên
                </button>
              </div>
            </div>

            {/* Phân loại + Đơn vị */}
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Phân loại"
                value={form.category || ''}
                onChange={(v) => setForm({ ...form, category: v })}
                options={CATEGORIES}
                placeholder="Chọn phân loại..."
              />
              <CustomSelect
                label="Đơn vị"
                value={form.unit || ''}
                onChange={(v) => setForm({ ...form, unit: v })}
                options={UNITS}
                placeholder="Chọn đơn vị..."
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả ngắn</label>
              <textarea
                placeholder="Mô tả công dụng..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 h-20 resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
