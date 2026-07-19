import { useState, useEffect, useRef } from 'react';
import type { ProductIndex, AskResponse, ChatMessageDto, ChatConversationDto } from '@/types/search';
import { searchService } from '@/services/search';
import { Icons } from '@/components/Icons';

function renderTableHtml(rows: string[]): string {
  if (rows.length === 0) return '';
  
  let html = '<div class="overflow-x-auto my-3 border border-slate-200/60 rounded-xl shadow-xs"><table class="min-w-full divide-y divide-slate-200/60 text-xs">';
  
  const parseRow = (rowStr: string) => {
    return rowStr.split('|').map(s => s.trim()).filter((_, index, arr) => index > 0 && index < arr.length - 1);
  };

  const headers = parseRow(rows[0]);
  
  let startIndex = 1;
  if (rows.length > 1 && rows[1].includes('---')) {
    startIndex = 2;
    html += `<thead class="bg-slate-50/80"><tr>${headers.map(h => `<th class="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200/60">${h}</th>`).join('')}</tr></thead>`;
  } else {
    startIndex = 0;
  }

  html += '<tbody class="divide-y divide-slate-100 bg-white/50">';
  for (let i = startIndex; i < rows.length; i++) {
    const cells = parseRow(rows[i]);
    html += `<tr class="hover:bg-slate-50/50 transition-colors">${cells.map(c => `<td class="px-4 py-2.5 text-slate-650 font-medium">${c}</td>`).join('')}</tr>`;
  }
  html += '</tbody></table></div>';
  
  return html;
}

function parseMarkdown(text: string) {
  if (!text) return '';
  
  // Escape HTML tags to prevent XSS (but allow safe formatting we inject)
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Replace bold
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  
  // Replace italic
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');
  
  // Replace inline code
  escaped = escaped.replace(/`/g, '`').replace(/`(.*?)`/g, '<code class="bg-slate-200/60 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs font-bold">$1</code>');
  
  const lines = escaped.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  const closeListIfOpen = () => {
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Table parsing
    if (line.startsWith('|') && line.endsWith('|')) {
      closeListIfOpen();
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else {
      if (inTable) {
        processedLines.push(renderTableHtml(tableRows));
        inTable = false;
      }
    }

    // 2. Header parsing
    if (line.startsWith('### ')) {
      closeListIfOpen();
      processedLines.push(`<h4 class="text-sm font-bold text-slate-900 mt-4 mb-2 flex items-center gap-1.5"><span class="w-1 h-3.5 bg-brand-500 rounded-full"></span>${line.substring(4)}</h4>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeListIfOpen();
      processedLines.push(`<h3 class="text-base font-bold text-slate-900 mt-5 mb-2.5 flex items-center gap-2">${line.substring(3)}</h3>`);
      continue;
    }

    // 3. List parsing
    const ulMatch = line.match(/^[\*\-]\s+(.*)/);
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeListIfOpen();
        processedLines.push('<ul class="list-disc pl-5 my-2 space-y-1.5 text-slate-700">');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li class="leading-relaxed">${ulMatch[1]}</li>`);
      continue;
    } else if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeListIfOpen();
        processedLines.push('<ol class="list-decimal pl-5 my-2 space-y-1.5 text-slate-700">');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li class="leading-relaxed">${olMatch[2]}</li>`);
      continue;
    } else {
      closeListIfOpen();
    }

    // 4. Default paragraph or blank line
    if (line === '') {
      processedLines.push('<div class="h-2"></div>');
    } else {
      processedLines.push(`<p class="mb-1 leading-relaxed text-slate-700">${line}</p>`);
    }
  }

  closeListIfOpen();
  if (inTable) {
    processedLines.push(renderTableHtml(tableRows));
  }

  return processedLines.join('\n');
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductIndex[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Chat state
  const [question, setQuestion] = useState('');
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessageDto[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // Web Speech API
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      recognitionRef.current = new SR();
      recognitionRef.current.lang = 'vi-VN';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (e: any) => {
        setQuestion(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const loadConversations = async () => {
    try { setConversations(await searchService.getConversations(1, 20)); } catch { /* silent */ }
  };

  // --- Search ---
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try { setSuggestions(await searchService.suggestProducts(query, 10)); } catch { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!query.trim()) return;
    setSearchLoading(true); setSearchError(null); setSearchResults([]); setShowSuggestions(false);
    try { setSearchResults(await searchService.searchProducts(query)); }
    catch { setSearchError('Không thể tìm kiếm sản phẩm.'); }
    finally { setSearchLoading(false); }
  };

  const handleSearchDirect = async (term: string) => {
    setQuery(term); setShowSuggestions(false);
    setSearchLoading(true); setSearchError(null); setSearchResults([]);
    try { setSearchResults(await searchService.searchProducts(term)); }
    catch { setSearchError('Không thể tìm kiếm.'); }
    finally { setSearchLoading(false); }
  };

  // --- Chat ---
  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (!question.trim()) return;
    setAskLoading(true); setAskError(null);
    try {
      const res = await searchService.sendMessage({ content: question.trim(), conversationId: activeConversationId ?? undefined });
      setAskResponse({ answer: res.assistantReply.content, contextProducts: res.contextProducts });
      setChatHistory(prev => [...prev, res.userMessage, res.assistantReply]);
      setActiveConversationId(res.userMessage.id);
      await loadConversations();
      setQuestion('');
    } catch { setAskError('Không thể xử lý câu hỏi.'); }
    finally { setAskLoading(false); }
  };

  const loadConversation = async (id: string) => {
    setActiveConversationId(id); setShowHistory(false); setAskError(null);
    try {
      const detail = await searchService.getConversationDetail(id);
      setChatHistory(detail.messages);
      const last = detail.messages[detail.messages.length - 1];
      if (last?.role === 'assistant') setAskResponse({ answer: last.content, contextProducts: [] });
      else setAskResponse(null);
    } catch { setAskError('Không thể tải cuộc trò chuyện.'); }
  };

  const startNewChat = () => {
    setActiveConversationId(null); setChatHistory([]); setAskResponse(null); setAskError(null); setQuestion('');
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) { setAskError('Trình duyệt không hỗ trợ giọng nói.'); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); return; }
    try { recognitionRef.current.start(); setIsListening(true); } catch { setIsListening(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="border-b border-slate-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Search className="w-8 h-8 text-brand-600 glow-blue" /><span>Tìm kiếm & Trợ lý AI</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Tìm kiếm sản phẩm và hỏi đáp với trợ lý kho thông minh</p>
        </div>
        <button onClick={startNewChat} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer">
          <Icons.Plus className="w-4 h-4" /><span className="hidden sm:inline">Trò chuyện mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Search */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-heading font-bold text-slate-900 mb-5 flex items-center gap-2.5">
              <Icons.StockBox className="w-5 h-5 text-brand-600" /><span>Tìm kiếm sản phẩm</span>
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input type="text" value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Nhập từ khóa, tên sản phẩm, SKU..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium placeholder-slate-400" />
                <Icons.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button key={i} type="button" onClick={() => handleSearchDirect(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors border-b border-slate-100 last:border-0">{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={searchLoading || !query.trim()}
                className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer">
                {searchLoading ? <><Icons.Spinner className="w-4 h-4 animate-spin" /><span>Đang tìm...</span></> : <span>Tìm kiếm</span>}
              </button>
            </form>

            {searchError && <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5"><Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" /><span>{searchError}</span></div>}
            {searchLoading && <div className="mt-6 text-center py-12 flex flex-col items-center"><Icons.Spinner className="h-8 w-8 text-brand-600 mb-3 animate-spin" /><span className="text-sm font-semibold">Đang tìm kiếm...</span></div>}
            {!searchLoading && searchResults.length === 0 && query && <div className="mt-6 text-center py-12 text-slate-400 italic border border-dashed border-slate-200 rounded-xl bg-slate-50/50">Không tìm thấy sản phẩm nào</div>}
            {!searchLoading && searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>Tìm thấy {searchResults.length} sản phẩm
                </p>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {searchResults.map(p => (
                    <div key={p.id} className="p-4 bg-slate-50/55 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-white transition-all duration-200 group shadow-xs">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">{p.name}</h3>
                        <span className="text-xs font-mono text-slate-550 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{p.sku}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{p.description}</p>
                      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-brand-600 text-sm">{(p.price / 1000).toFixed(0)}K VND</span>
                          {p.storeName && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-[10px] font-semibold">{p.storeName}</span>}
                        </div>
                        <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${p.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>Tồn: {p.stockQuantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: AI Chat */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2.5">
                <Icons.Robot className="w-5 h-5 text-brand-600" /><span>Trợ lý AI kho hàng</span>
              </h2>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button onClick={() => setShowHistory(!showHistory)}
                    className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${showHistory ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <Icons.History className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lịch sử</span>
                    <span className="bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{conversations.length}</span>
                  </button>
                )}
              </div>
            </div>

            {/* History Panel */}
            {showHistory && conversations.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-44 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cuộc trò chuyện gần đây</p>
                <div className="space-y-1">
                  {conversations.map(c => (
                    <button key={c.id} onClick={() => loadConversation(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between ${activeConversationId === c.id ? 'bg-brand-100 text-brand-800' : 'hover:bg-slate-200 text-slate-700'}`}>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold truncate block">{c.title || 'Cuộc trò chuyện'}</span>
                        <span className="text-[10px] text-slate-400">{c.messageCount} tin nhắn · {c.userRole}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(c.updatedAt).toLocaleDateString('vi-VN')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {chatHistory.length > 0 && (
              <div className="mb-4 space-y-4 max-h-[460px] min-h-[300px] overflow-y-auto pr-1.5 p-3.5 bg-slate-50/40 border border-slate-200/60 rounded-xl">
                {chatHistory.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-tr-xs shadow-md shadow-brand-500/10' 
                        : 'bg-white text-slate-800 rounded-tl-xs border border-slate-250/60'
                    }`}>
                      {m.role === 'user' ? (
                        <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                      ) : (
                        <div 
                          className="prose prose-slate max-w-none text-slate-800 text-sm font-medium space-y-2"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }}
                        />
                      )}
                      {m.responseTimeMs != null && m.role === 'assistant' && (
                        <span className="block text-[9px] mt-1.5 opacity-50 font-mono text-right">
                          {m.responseTimeMs}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* AI Answer (no history) */}
            {askResponse && chatHistory.length === 0 && (
              <div className="mb-4 p-4 bg-emerald-50/75 border border-emerald-200/50 rounded-xl shadow-xs">
                <h3 className="font-heading font-bold text-emerald-800 mb-2.5 text-sm flex items-center gap-2">
                  <Icons.Info className="w-5 h-5 text-emerald-600" /><span>Trả lời:</span>
                </h3>
                <div 
                  className="prose prose-emerald max-w-none text-emerald-800 text-sm font-semibold leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(askResponse.answer) }}
                />
              </div>
            )}

            {askError && <div className="mt-4 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5"><Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0" /><span>{askError}</span></div>}
            {askLoading && <div className="mt-4 text-center py-6 flex flex-col items-center"><Icons.Spinner className="h-6 w-6 text-brand-600 mb-2 animate-spin" /><span className="text-xs font-semibold text-slate-500">Trợ lý đang suy nghĩ...</span></div>}

            <form onSubmit={handleAsk} className="space-y-3">
              <div className="relative">
                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="Hỏi về sản phẩm, tư vấn mua hàng..."
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 resize-none placeholder-slate-400 leading-relaxed font-semibold" />
                <button type="button" onClick={toggleVoice}
                  className={`absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 shadow-xs'
                  }`}
                  title={isListening ? 'Đang nghe...' : 'Nhập bằng giọng nói'}>
                  {isListening ? <Icons.Spinner className="w-4 h-4 animate-spin text-white" /> : <Icons.Mic className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Enter để gửi • 🎤 giọng nói • Shift+Enter xuống dòng</span>
              </div>
              <button type="submit" disabled={askLoading || !question.trim()}
                className="w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer">
                {askLoading ? <><Icons.Spinner className="w-4 h-4 animate-spin" /><span>Đang xử lý...</span></> : <span>Gửi câu hỏi</span>}
              </button>
            </form>

            {askResponse && askResponse.contextProducts.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                <h3 className="font-heading font-bold text-slate-500 mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Sản phẩm tham khảo
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {askResponse.contextProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-slate-200">
                      <div><span className="font-bold text-slate-800">{p.name}</span><span className="text-slate-400 ml-2 font-mono text-[10px]">({p.sku})</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-brand-600 font-extrabold">{(p.price / 1000).toFixed(0)}K</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{p.stockQuantity > 0 ? 'Còn hàng' : 'Hết'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-bold text-brand-700 mb-3 flex items-center gap-2 text-sm">
              <Icons.LightBulb className="w-5 h-5 text-brand-600" /><span>Cách sử dụng</span>
            </h3>
            <ul className="space-y-2 text-xs text-brand-800 leading-relaxed font-semibold">
              <li className="flex items-start gap-1.5"><span className="text-brand-500 mt-0.5">•</span><span>Nhập từ khóa để tìm kiếm sản phẩm theo tên, mô tả, hoặc SKU</span></li>
              <li className="flex items-start gap-1.5"><span className="text-brand-500 mt-0.5">•</span><span>Hỏi trợ lý AI bằng văn bản hoặc giọng nói (🎤) về gợi ý mua hàng</span></li>
              <li className="flex items-start gap-1.5"><span className="text-brand-500 mt-0.5">•</span><span>Trợ lý sẽ tìm sản phẩm phù hợp và trả lời dựa trên kho dữ liệu</span></li>
              <li className="flex items-start gap-1.5"><span className="text-brand-500 mt-0.5">•</span><span>Xem lịch sử trò chuyện — klik "Lịch sử" để quay lại câu hỏi cũ</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
