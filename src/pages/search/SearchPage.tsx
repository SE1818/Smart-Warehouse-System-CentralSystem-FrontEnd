import { useState } from 'react';
import type { ProductIndex, AskResponse } from '@/types/search';
import { searchService } from '@/services/search';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductIndex[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchService.searchProducts(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Không thể tìm kiếm sản phẩm. Vui lòng thử lại.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setAskLoading(true);
    setAskError(null);
    setAskResponse(null);
    try {
      const response = await searchService.askWarehouseAssistant(question);
      setAskResponse(response);
    } catch (err) {
      console.error('Ask error:', err);
      setAskError('Không thể xử lý câu hỏi. Vui lòng thử lại.');
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🔍</span> Tìm kiếm & Trợ lý AI
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tìm kiếm sản phẩm và hỏi đáp với trợ lý kho thông minh
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Product Search */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>📦</span> Tìm kiếm sản phẩm
            </h2>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập từ khóa, tên sản phẩm, SKU..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
              </div>
              <button
                type="submit"
                disabled={searchLoading || !query.trim()}
                className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>

            {searchError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
                ⚠️ {searchError}
              </div>
            )}

            {searchLoading && (
              <div className="mt-6 text-center py-8 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                Đang tìm kiếm...
              </div>
            )}

            {!searchLoading && searchResults.length === 0 && query && (
              <div className="mt-6 text-center py-8 text-slate-400 italic">
                Không tìm thấy sản phẩm nào
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Tìm thấy {searchResults.length} sản phẩm
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
                        <span className="text-xs font-mono text-slate-500">{product.sku}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-600">
                          {(product.price / 1000).toFixed(0)}K VND
                        </span>
                        <span className={`font-semibold ${product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Tồn: {product.stockQuantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Assistant */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>🤖</span> Trợ lý AI kho hàng
            </h2>

            <form onSubmit={handleAsk} className="space-y-4">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={askLoading || !question.trim()}
                className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {askLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang suy nghĩ...
                  </>
                ) : (
                  'Hỏi trợ lý'
                )}
              </button>
            </form>

            {askError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
                ⚠️ {askError}
              </div>
            )}

            {askLoading && (
              <div className="mt-6 text-center py-8 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                Trợ lý đang phân tích...
              </div>
            )}

            {askResponse && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                  <h3 className="font-bold text-emerald-900 mb-2 text-sm flex items-center gap-2">
                    <span>💬</span> Trả lời:
                  </h3>
                  <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">
                    {askResponse.answer}
                  </p>
                </div>

                {askResponse.contextProducts.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-widest">
                      Sản phẩm tham khảo
                    </h3>
                    <div className="space-y-2">
                      {askResponse.contextProducts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-800">{p.name}</span>
                            <span className="text-slate-500 ml-2 text-[10px]">({p.sku})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-brand-600 font-semibold">{(p.price / 1000).toFixed(0)}K</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stockQuantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {p.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200/60 p-6">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
              <span>💡</span> Cách sử dụng
            </h3>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• Nhập từ khóa để tìm kiếm sản phẩm theo tên, mô tả, hoặc SKU</li>
              <li>• Hỏi trợ lý AI về gợi ý mua hàng, so sánh sản phẩm</li>
              <li>• Trợ lý sẽ tìm sản phẩm phù hợp và trả lời dựa trên kho dữ liệu</li>
              <li>• Kết quả tìm kiếm hiển thị số lượng tồn kho thực tế</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
