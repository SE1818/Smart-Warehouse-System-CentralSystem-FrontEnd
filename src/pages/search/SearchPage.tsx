import { useState } from 'react';
import type { ProductIndex, AskResponse } from '@/types/search';
import { searchService } from '@/services/search';
import { Icons } from '@/components/Icons';

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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Soft Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Icons.Search className="w-8 h-8 text-brand-600 glow-blue" />
          <span>Tìm kiếm & Trợ lý AI</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tìm kiếm sản phẩm và hỏi đáp với trợ lý kho thông minh
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Product Search */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-slate-300 transition-all duration-300">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-5 flex items-center gap-2.5">
              <Icons.StockBox className="w-5 h-5 text-brand-600" />
              <span>Tìm kiếm sản phẩm</span>
            </h2>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập từ khóa, tên sản phẩm, SKU..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium placeholder-slate-400"
                />
                <Icons.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !query.trim()}
                className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {searchLoading ? (
                  <>
                    <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <span>Tìm kiếm</span>
                )}
              </button>
            </form>

            {searchError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
                <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {searchLoading && (
              <div className="mt-6 text-center py-12 text-slate-505 flex flex-col items-center justify-center">
                <Icons.Spinner className="h-8 w-8 text-brand-600 mb-3" />
                <span className="text-sm font-semibold">Đang tìm kiếm sản phẩm...</span>
              </div>
            )}

            {!searchLoading && searchResults.length === 0 && query && (
              <div className="mt-6 text-center py-12 text-slate-400 italic border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                Không tìm thấy sản phẩm nào
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                  <span>Tìm thấy {searchResults.length} sản phẩm</span>
                </p>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 bg-slate-50/55 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-white transition-all duration-200 group shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">{product.name}</h3>
                        <span className="text-xs font-mono text-slate-550 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{product.sku}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{product.description}</p>
                      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                        <span className="font-extrabold text-brand-600 text-sm">
                          {(product.price / 1000).toFixed(0)}K VND
                        </span>
                        <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${product.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:border-slate-300 transition-all duration-300">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-5 flex items-center gap-2.5">
              <Icons.Robot className="w-5 h-5 text-brand-600" />
              <span>Trợ lý AI kho hàng</span>
            </h2>

            <form onSubmit={handleAsk} className="space-y-4">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Hỏi về sản phẩm, tư vấn mua hàng, tìm kiếm..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 resize-none placeholder-slate-450 leading-relaxed font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={askLoading || !question.trim()}
                className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {askLoading ? (
                  <>
                    <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                    <span>Trợ lý đang suy nghĩ...</span>
                  </>
                ) : (
                  <span>Hỏi trợ lý</span>
                )}
              </button>
            </form>

            {askError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
                <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0" />
                <span>{askError}</span>
              </div>
            )}

            {askLoading && (
              <div className="mt-6 text-center py-12 text-slate-505 flex flex-col items-center justify-center">
                <Icons.Spinner className="h-8 w-8 text-brand-600 mb-3" />
                <span className="text-sm font-semibold">Trợ lý đang phân tích câu hỏi của bạn...</span>
              </div>
            )}

            {askResponse && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-xl shadow-xs">
                  <h3 className="font-heading font-bold text-emerald-800 mb-2.5 text-sm flex items-center gap-2">
                    <Icons.Info className="w-5 h-5 text-emerald-600" />
                    <span>Trả lời:</span>
                  </h3>
                  <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {askResponse.answer}
                  </p>
                </div>

                {askResponse.contextProducts.length > 0 && (
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                    <h3 className="font-heading font-bold text-slate-500 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Sản phẩm tham khảo</span>
                    </h3>
                    <div className="space-y-2">
                      {askResponse.contextProducts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs p-3 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all shadow-xs">
                          <div>
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-slate-400 ml-2 font-mono text-[10px]">({p.sku})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-brand-600 font-extrabold">{(p.price / 1000).toFixed(0)}K</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${p.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
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
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-bold text-brand-700 mb-3 flex items-center gap-2 text-sm">
              <Icons.LightBulb className="w-5 h-5 text-brand-600" />
              <span>Cách sử dụng</span>
            </h3>
            <ul className="space-y-2 text-xs text-brand-800 leading-relaxed font-semibold">
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 mt-0.5">•</span>
                <span>Nhập từ khóa để tìm kiếm sản phẩm theo tên, mô tả, hoặc SKU</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 mt-0.5">•</span>
                <span>Hỏi trợ lý AI về gợi ý mua hàng, so sánh sản phẩm</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 mt-0.5">•</span>
                <span>Trợ lý sẽ tìm sản phẩm phù hợp và trả lời dựa trên kho dữ liệu</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-500 mt-0.5">•</span>
                <span>Kết quả tìm kiếm hiển thị số lượng tồn kho thực tế</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
