import { useState, useEffect } from 'react';
import type { Product } from '@/types';
import { productService } from '@/services';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';
import { CustomSelect } from '@/components/CustomSelect';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    sku: '',
    name: '',
    category: 'Đồ uống',
    price: 0,
    stockQuantity: 0,
    unit: 'chiếc',
    description: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const productsData = await productService.getProducts();

      const mapped = productsData.map((p) => {
        return {
          ...p,
          stockQuantity: p.stockQuantity ?? 0,
          category: p.category || 'Đồ uống',
          unit: p.unit || 'chiếc'
        };
      });
      setProducts(mapped);
    } catch (err) {
      console.error('Error fetching products from API', err);
      setError('Không thể tải danh sách sản phẩm từ máy chủ. Vui lòng kiểm tra lại dịch vụ.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when modal is open to prevent background scrolling and layout shift
  useEffect(() => {
    if (isAdding || editingProduct || deletingProductId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAdding, editingProduct, deletingProductId]);

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await productService.updateProduct(editingProduct.id, {
        sku: editingProduct.sku || '',
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: Number(editingProduct.price),
        stockQuantity: Number(editingProduct.stockQuantity),
        category: editingProduct.category,
        unit: editingProduct.unit,
        imageUrl: editingProduct.imageUrl || ''
      });
      setEditingProduct(null);
      toast.success('Cập nhật sản phẩm thành công!');
      fetchProducts();
    } catch (err) {
      console.error('Error updating product', err);
      toast.error('Không thể cập nhật sản phẩm. Vui lòng kiểm tra lại.');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.sku) return;

    try {
      await productService.createProduct({
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description || '',
        price: Number(newProduct.price),
        stockQuantity: Number(newProduct.stockQuantity || 0),
        category: newProduct.category || 'Đồ uống',
        unit: newProduct.unit || 'chiếc',
        imageUrl: newProduct.imageUrl || ''
      });
      setIsAdding(false);
      setNewProduct({
        sku: '',
        name: '',
        category: 'Đồ uống',
        price: 0,
        stockQuantity: 0,
        unit: 'chiếc',
        description: '',
        imageUrl: ''
      });
      toast.success('Thêm sản phẩm mới thành công!');
      fetchProducts();
    } catch (err) {
      console.error('Error creating product', err);
      toast.error('Không thể tạo sản phẩm mới. Vui lòng kiểm tra lại.');
    }
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
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold">
                  <th className="p-4 pl-6">Sản phẩm</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4">Giá bán</th>
                  <th className="p-4">Tồn kho</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900">
                      <div>{p.name}</div>
                      {p.sku && <div className="text-[10px] text-slate-400 font-mono tracking-wider">{p.sku}</div>}
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
                    <td className="p-4 pr-6 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer"
                      >
                        Sửa
                      </button>
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
                    <td colSpan={5} className="p-16 text-center text-slate-400 italic">Không tìm thấy sản phẩm nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-semibold">
                Hiển thị <span className="font-bold text-slate-800">{startIndex + 1}</span> -{" "}
                <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filtered.length)}</span>{" "}
                trong <span className="font-bold text-slate-800">{filtered.length}</span> sản phẩm
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
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                      currentPage === page
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
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative">
            <h3 className="text-lg font-heading font-extrabold text-slate-900 mb-5 border-b border-slate-100 pb-3 flex items-center gap-2 shrink-0">
              <Icons.Product className="w-5 h-5 text-brand-600" />
              <span>Chỉnh sửa sản phẩm</span>
            </h3>

            <form onSubmit={handleEditSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 pb-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên sản phẩm</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá bán (đ)</label>
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng tồn</label>
                    <input
                      type="number"
                      value={editingProduct.stockQuantity}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link ảnh sản phẩm</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.png"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Phân loại"
                    value={editingProduct.category || ''}
                    onChange={v => setEditingProduct(prev => prev ? { ...prev, category: v } : null)}
                    options={[
                      { value: 'Đồ uống', label: 'Đồ uống' },
                      { value: 'Vật tư y tế', label: 'Vật tư y tế' },
                      { value: 'Linh kiện', label: 'Linh kiện' },
                      { value: 'Khác', label: 'Khác' }
                    ]}
                    placeholder="Chọn phân loại..."
                  />

                  <CustomSelect
                    label="Đơn vị"
                    value={editingProduct.unit || ''}
                    onChange={v => setEditingProduct(prev => prev ? { ...prev, unit: v } : null)}
                    options={[
                      { value: 'chiếc', label: 'chiếc' },
                      { value: 'hộp', label: 'hộp' },
                      { value: 'thùng', label: 'thùng' },
                      { value: 'lít', label: 'lít' },
                      { value: 'kg', label: 'kg' }
                    ]}
                    placeholder="Chọn đơn vị..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative">
            <h3 className="text-lg font-heading font-extrabold text-slate-900 mb-5 border-b border-slate-100 pb-3 flex items-center gap-2 shrink-0">
              <Icons.Plus className="w-5 h-5 text-brand-600" />
              <span>Thêm sản phẩm mới</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 pb-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên sản phẩm</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nước uống đóng chai"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã SKU</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: SKU-WATER-01"
                    value={newProduct.sku || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá bán (đ)</label>
                    <input
                      type="number"
                      value={newProduct.price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng tồn</label>
                    <input
                      type="number"
                      value={newProduct.stockQuantity || 0}
                      onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link ảnh sản phẩm</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.png"
                    value={newProduct.imageUrl || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="Phân loại"
                    value={newProduct.category || ''}
                    onChange={v => setNewProduct({ ...newProduct, category: v })}
                    options={[
                      { value: 'Đồ uống', label: 'Đồ uống' },
                      { value: 'Vật tư y tế', label: 'Vật tư y tế' },
                      { value: 'Linh kiện', label: 'Linh kiện' },
                      { value: 'Khác', label: 'Khác' }
                    ]}
                    placeholder="Chọn phân loại..."
                  />

                  <CustomSelect
                    label="Đơn vị"
                    value={newProduct.unit || ''}
                    onChange={v => setNewProduct({ ...newProduct, unit: v })}
                    options={[
                      { value: 'chiếc', label: 'chiếc' },
                      { value: 'hộp', label: 'hộp' },
                      { value: 'thùng', label: 'thùng' },
                      { value: 'lít', label: 'lít' },
                      { value: 'kg', label: 'kg' }
                    ]}
                    placeholder="Chọn đơn vị..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả ngắn</label>
                  <textarea
                    placeholder="Mô tả công dụng..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
                >
                  Tạo sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
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
