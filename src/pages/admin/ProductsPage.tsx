import { useState, useEffect } from 'react';
import type { Product } from '@/types';
import { productService, storeService } from '@/services';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';
import { ProductFormModal } from '@/components/ProductFormModal';

// Resolve a potentially-relative image URL against the API base.
// File-Service returns relative paths (e.g. "/api/files/static/products/...")
// but the browser resolves those against the frontend origin (5173), not the
// API gateway (5000), so every image 404s unless we absolutise them here.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const BASE_ORIGIN = API_BASE.includes('://')
  ? API_BASE.substring(0, API_BASE.lastIndexOf('/'))
  : window.location.origin;

const resolveImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

const resolveStoreName = (p: Product, nameMap: Record<string, string>): string => {
  if (p.storeName) return p.storeName;
  if (p.storeId && nameMap[p.storeId]) return nameMap[p.storeId];
  return '—';
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [storeNameMap, setStoreNameMap] = useState<Record<string, string>>({});

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const productsData = await productService.getProducts();
      const mapped = productsData.map((p) => ({
        ...p,
        stockQuantity: p.stockQuantity ?? 0,
        category: p.category || 'Đồ uống',
        unit: p.unit || 'chiếc'
      }));
      setProducts(mapped);
    } catch (err) {
      console.error('Error fetching products from API', err);
      setError('Không thể tải danh sách sản phẩm từ máy chủ. Vui lòng kiểm tra lại dịch vụ.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const stores = await storeService.getAllStores();
      const map: Record<string, string> = {};
      for (const s of stores) {
        map[s.id] = s.name;
      }
      setStoreNameMap(map);
    } catch {
      // Stores list is optional — leave map empty on failure
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      fetchStores();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ---- Edit modal submit ----
  const handleEditSave = async (fd: FormData) => {
    if (!editingProduct) return;
    try {
      await productService.updateProduct(editingProduct.id, {
        sku: (fd.get('sku') as string) || '',
        name: fd.get('name') as string,
        description: (fd.get('description') as string) || '',
        price: Number(fd.get('price')),
        stockQuantity: Number(fd.get('stockQuantity')),
        category: (fd.get('category') as string) || 'Đồ uống',
        unit: (fd.get('unit') as string) || 'chiếc',
        imageUrl: editingProduct.imageUrl
      });
      setEditingProduct(null);
      setEditImagePreview(null);
      toast.success('Cập nhật sản phẩm thành công!');
      fetchProducts();
    } catch (err) {
      console.error('Error updating product', err);
      toast.error('Không thể cập nhật sản phẩm. Vui lòng kiểm tra lại.');
    }
  };

  // ---- Add modal submit ----
  const handleAddSubmit = async (fd: FormData) => {
    const name = fd.get('name') as string;
    const price = fd.get('price') as string;
    const sku = fd.get('sku') as string;
    if (!name || !price || !sku) return;

    try {
      const created = await productService.createProduct({
        sku,
        name,
        description: (fd.get('description') as string) || '',
        price: Number(price),
        stockQuantity: Number(fd.get('stockQuantity') || 0),
        category: (fd.get('category') as string) || 'Đồ uống',
        unit: (fd.get('unit') as string) || 'chiếc'
      });

      const pendingImage = fd.get('image') as File | null;
      if (pendingImage && pendingImage.size > 0) {
        try {
          const uploadResult = await productService.uploadImage(created.id, pendingImage);
          await productService.updateProduct(created.id, { imageUrl: uploadResult.url });
        } catch {
          toast.error('Đã tạo sản phẩm nhưng không thể tải ảnh lên.');
        }
      }

      setIsAdding(false);
      setAddImagePreview(null);
      toast.success('Thêm sản phẩm mới thành công!');
      fetchProducts();
    } catch (err) {
      console.error('Error creating product', err);
      toast.error('Không thể tạo sản phẩm mới. Vui lòng kiểm tra lại.');
    }
  };

  // ---- Image handling for edit modal ----
  const handleEditImageUpload = async (file: File) => {
    if (!file || !editingProduct) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const result = await productService.uploadImage(editingProduct.id, file);
      setEditingProduct({ ...editingProduct, imageUrl: result.url });
      setEditImagePreview(result.url);
      toast.success('Đã tải ảnh lên thành công!');
    } catch {
      toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
    }
  };

  // ---- Image handling for add modal ----
  const handleAddImageSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAddImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const deleteProduct = (id: string) => {
    setDeletingProductId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setDeletingProductId(null);
      toast.success('Xóa sản phẩm thành công!');
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product', err);
      toast.error('Không thể xóa sản phẩm. Vui lòng kiểm tra lại.');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Product className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Quản lý sản phẩm</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Điều khiển danh mục hàng hóa, giá bán và số lượng tồn kho</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <Icons.Refresh className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4 text-white" />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên sản phẩm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-semibold"
          />
          <Icons.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải danh sách sản phẩm...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold">
                  <th className="p-4 pl-6">Sản phẩm</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4">Giá bán</th>
                  <th className="p-4">Tồn kho</th>
                  <th className="p-4">Cửa hàng</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && !imageErrors[p.id] ? (
                          <img
                            src={resolveImageUrl(p.imageUrl)}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            loading="lazy"
                            onError={() => setImageErrors(prev => ({ ...prev, [p.id]: true }))}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-slate-400">{p.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          {p.sku && <div className="text-[10px] text-slate-400 font-mono tracking-wider">{p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold bg-brand-50 border border-brand-100/50 text-brand-700 px-3 py-1 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-900 font-extrabold">{p.price.toLocaleString()}đ</td>
                    <td className="p-4">
                      <span className={`font-bold ${p.stockQuantity <= 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                        {p.stockQuantity} chiếc {p.stockQuantity <= 0 && ' (Hết hàng)'}
                      </span>
                    </td>
                    <td className="p-4">
                      {p.storeId ? (
                        <span className="text-xs font-bold bg-amber-50 border border-amber-100/50 text-amber-700 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          {resolveStoreName(p, storeNameMap)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Chung</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-3 whitespace-nowrap">
                      {!p.storeId && (
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer"
                        >
                          Sửa
                        </button>
                      )}
                      {p.storeId && (
                        <span className="text-[10px] text-slate-400 italic">Đã gán cửa hàng</span>
                      )}
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="px-3.5 py-1.5 border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 italic">Không tìm thấy sản phẩm nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-semibold">
                Hiển thị <span className="font-bold text-slate-800">{startIndex + 1}</span> -{' '}
                <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> trong{' '}
                <span className="font-bold text-slate-800">{filtered.length}</span> sản phẩm
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-550 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
                >
                  <Icons.ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${currentPage === page
                        ? "border-brand-500 bg-brand-600 text-white shadow-md shadow-brand-500/10"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-550 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
                >
                  <Icons.ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <ProductFormModal
        open={!!editingProduct}
        title="Chỉnh sửa sản phẩm"
        initialData={editingProduct}
        onClose={() => { setEditingProduct(null); setEditImagePreview(null); }}
        onSubmit={handleEditSave}
        onFileSelected={handleEditImageUpload}
        imagePreviewUrl={editImagePreview || editingProduct?.imageUrl || null}
        submitLabel="Lưu thay đổi"
      />

      {/* Add Modal */}
      <ProductFormModal
        open={isAdding}
        title="Thêm sản phẩm mới"
        initialData={null}
        onClose={() => { setIsAdding(false); setAddImagePreview(null); }}
        onSubmit={handleAddSubmit}
        onFileSelected={handleAddImageSelected}
        imagePreviewUrl={addImagePreview}
        submitLabel="Tạo sản phẩm"
      />

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-sm shadow-2xl relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                <Icons.AlertWarning className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-heading font-extrabold text-slate-900">Xác nhận xóa</h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                  Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này sẽ loại bỏ hoàn toàn sản phẩm khỏi hệ thống và không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingProductId(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deletingProductId)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 transition-all cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
