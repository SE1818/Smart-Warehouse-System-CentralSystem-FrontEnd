import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  description?: string;
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('admin_products');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    const defaultProducts: Product[] = [
      { id: '1', name: 'Đồ uống Coca Cola', category: 'Đồ uống', price: 15000, stockQuantity: 50, description: 'Coca Cola lon 330ml' },
      { id: '2', name: 'Nước suối Aquafina', category: 'Đồ uống', price: 10000, stockQuantity: 100, description: 'Chai 500ml' },
      { id: '3', name: 'Khẩu trang y tế N95', category: 'Vật tư y tế', price: 25000, stockQuantity: 200, description: 'Hộp 10 chiếc' },
      { id: '4', name: 'Cồn sát khuẩn 70 độ', category: 'Vật tư y tế', price: 35000, stockQuantity: 15, description: 'Chai 500ml cồn y tế' },
      { id: '5', name: 'Găng tay cao su y tế', category: 'Vật tư y tế', price: 85000, stockQuantity: 0, description: 'Hộp 100 chiếc' },
      { id: '6', name: 'Băng cá nhân Urgo', category: 'Vật tư y tế', price: 20000, stockQuantity: 150, description: 'Hộp 100 miếng' }
    ];
    localStorage.setItem('admin_products', JSON.stringify(defaultProducts));
    return defaultProducts;
  });
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: 'Đồ uống',
    price: 0,
    stockQuantity: 0,
    description: ''
  });

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem('admin_products', JSON.stringify(updated));
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updated = products.map((p) => (p.id === editingProduct.id ? editingProduct : p));
    saveProducts(updated);
    setEditingProduct(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const added: Product = {
      id: `${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category || 'Đồ uống',
      price: Number(newProduct.price),
      stockQuantity: Number(newProduct.stockQuantity || 0),
      description: newProduct.description
    };

    const updated = [...products, added];
    saveProducts(updated);
    setIsAdding(false);
    setNewProduct({
      name: '',
      category: 'Đồ uống',
      price: 0,
      stockQuantity: 0,
      description: ''
    });
  };

  const deleteProduct = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      const updated = products.filter((p) => p.id !== id);
      saveProducts(updated);
    }
  };

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📦</span> Quản lý sản phẩm
          </h1>
          <p className="mt-1 text-sm text-slate-505">Điều khiển danh mục hàng hóa, giá bán và số lượng tồn kho</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center gap-2 self-start sm:self-auto transition-all duration-150 active:scale-98"
        >
          ➕ Thêm sản phẩm mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-4">Sản phẩm</th>
                <th className="p-4">Phân loại</th>
                <th className="p-4">Giá bán</th>
                <th className="p-4">Tồn kho</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-4">
                    <span className="text-xs font-semibold bg-brand-50 border border-brand-100/50 text-brand-700 px-2.5 py-0.5 rounded-full">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900 font-bold">{p.price.toLocaleString()}đ</td>
                  <td className="p-4">
                    <span className={`font-bold ${p.stockQuantity <= 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                      {p.stockQuantity} chiếc {p.stockQuantity <= 0 && ' (Hết hàng)'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-55 rounded-lg text-xs font-semibold transition-colors"
                    >
                      🗑️ Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">Không tìm thấy sản phẩm nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-heading font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              ✏️ Chỉnh sửa sản phẩm
            </h3>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tên sản phẩm</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giá bán (đ)</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Số lượng tồn</label>
                  <input
                    type="number"
                    value={editingProduct.stockQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phân loại</label>
                <select
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value="Đồ uống">Đồ uống</option>
                  <option value="Vật tư y tế">Vật tư y tế</option>
                  <option value="Linh kiện">Linh kiện</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all"
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
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-heading font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              ➕ Thêm sản phẩm mới
            </h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tên sản phẩm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nước uống đóng chai"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giá bán (đ)</label>
                  <input
                    type="number"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Số lượng tồn</label>
                  <input
                    type="number"
                    value={newProduct.stockQuantity || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phân loại</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value="Đồ uống">Đồ uống</option>
                  <option value="Vật tư y tế">Vật tư y tế</option>
                  <option value="Linh kiện">Linh kiện</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mô tả ngắn</label>
                <textarea
                  placeholder="Mô tả công dụng..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-800 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-650 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all"
                >
                  Tạo sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
