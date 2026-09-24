import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Send,
  Phone,
  Search,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { zaloSupportService, type ZaloConversation, type ZaloMessage } from '../../services/portalApi';

export const ZaloSupportDesk: React.FC = () => {
  const [conversations, setConversations] = useState<ZaloConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'BOT_HANDLING' | 'HUMAN_TAKEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [currentStaffName] = useState('Kỹ Sư Nguyễn Văn Trọng');
  const [currentStaffId] = useState('agent-01');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const data = await zaloSupportService.getConversations();
    setConversations(data);
    if (data.length > 0 && !activeConvId) {
      setActiveConvId(data[0].id);
      loadMessages(data[0].id);
    }
  };

  const loadMessages = async (convId: string) => {
    const msgs = await zaloSupportService.getMessages(convId);
    setMessages(msgs);
  };

  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    loadMessages(convId);
    setActionNotice(null);
  };

  const handleAssignToMe = async () => {
    if (!activeConvId) return;
    const updated = await zaloSupportService.assignToMe(activeConvId, currentStaffId, currentStaffName);
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? updated : c)));
    setActionNotice('Đã tiếp quản thành công! Bot AI đã tạm ngừng trả lời tự động cho khách hàng này.');
  };

  const handleHandoffToBot = async () => {
    if (!activeConvId) return;
    const updated = await zaloSupportService.handoffToBot(activeConvId);
    setConversations((prev) => prev.map((c) => (c.id === activeConvId ? updated : c)));
    setActionNotice('Đã hoàn tất hỗ trợ! Hội thoại đã được chuyển về cho Bot AI trực 24/7.');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const content = inputText.trim();
    setInputText('');

    const currentConv = conversations.find((c) => c.id === activeConvId);
    if (currentConv && currentConv.status === 'BOT_HANDLING') {
      await handleAssignToMe();
    }

    const newMsg = await zaloSupportService.sendStaffMessage(activeConvId, content, currentStaffName);
    setMessages((prev) => [...prev, newMsg]);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, lastMessage: content, lastMessageAt: newMsg.createdAt, status: 'HUMAN_TAKEN' }
          : c
      )
    );
  };

  const quickCannedReplies = [
    'Dạ em Tuấn kỹ sư VORA đây ạ. Em đã nhận yêu cầu của anh/chị!',
    'Em xin phép gọi điện qua số Hotline để tư vấn chi tiết mặt bằng nhé.',
    'Báo giá chi tiết đã được gửi, anh/chị kiểm tra giúp em nhé!',
  ];

  const filteredConversations = conversations.filter((c) => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        (c.customerPhone && c.customerPhone.includes(q)) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="space-y-6">
      {/* Top Status & Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng Phiên Zalo</p>
            <h4 className="text-xl font-extrabold text-slate-900">{conversations.length}</h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Bot AI Đang Trực</p>
            <h4 className="text-xl font-extrabold text-emerald-600">
              {conversations.filter((c) => c.status === 'BOT_HANDLING').length}
            </h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Nhân Viên Tiếp Quản</p>
            <h4 className="text-xl font-extrabold text-amber-600">
              {conversations.filter((c) => c.status === 'HUMAN_TAKEN').length}
            </h4>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">PostgreSQL pgvector</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">Sẵn Sàng RAG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Support Desk Workspace */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]">
        {/* Left Side: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Hộp Thư Zalo OA</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-extrabold">
                  {filteredConversations.length}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Live Sync</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, tin nhắn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  filter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất Cả
              </button>
              <button
                type="button"
                onClick={() => setFilter('BOT_HANDLING')}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  filter === 'BOT_HANDLING' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bot Trực
              </button>
              <button
                type="button"
                onClick={() => setFilter('HUMAN_TAKEN')}
                className={`flex-1 py-1 rounded-lg transition-all ${
                  filter === 'HUMAN_TAKEN' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Nhân Viên
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              const isBot = conv.status === 'BOT_HANDLING';

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConv(conv.id)}
                  className={`w-full text-left p-4 transition-all flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-l-4 border-blue-600'
                      : 'hover:bg-slate-100/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={conv.customerName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isBot ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate pr-2">
                        {conv.customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {conv.lastMessageAt}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate mb-1.5">
                      {conv.lastMessage}
                    </p>

                    <div className="flex items-center gap-1.5">
                      {isBot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          <Bot className="w-3 h-3" />
                          <span>Bot RAG Tự Động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                          <UserCheck className="w-3 h-3" />
                          <span>{conv.assignedAgentName || 'Nhân Viên'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Conversation Timeline & Actions */}
        {activeConv ? (
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={activeConv.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={activeConv.customerName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      activeConv.status === 'BOT_HANDLING' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{activeConv.customerName}</span>
                    <span className="text-xs text-slate-400 font-mono font-normal">
                      ID: {activeConv.zaloUserId}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {activeConv.customerPhone && (
                      <span className="flex items-center gap-1 font-mono text-blue-600 font-semibold">
                        <Phone className="w-3 h-3" />
                        {activeConv.customerPhone}
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      Trạng thái:{' '}
                      <strong
                        className={
                          activeConv.status === 'BOT_HANDLING'
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {activeConv.status === 'BOT_HANDLING'
                          ? 'BOT_HANDLING (AI Đang Trực)'
                          : `HUMAN_TAKEN (${activeConv.assignedAgentName || 'Nhân viên'})`}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {activeConv.status === 'BOT_HANDLING' ? (
                  <button
                    type="button"
                    onClick={handleAssignToMe}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Nhận Hỗ Trợ (Assign to me)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleHandoffToBot}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Kết Thúc / Chuyển Lại Bot</span>
                  </button>
                )}
              </div>
            </div>

            {actionNotice && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-800 text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>{actionNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionNotice(null)}
                  className="text-blue-500 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
              {messages.map((msg) => {
                const isCustomer = msg.senderType === 'CUSTOMER';
                const isBot = msg.senderType === 'BOT';
                const isStaff = msg.senderType === 'STAFF';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isStaff ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                      {isBot && <Bot className="w-3.5 h-3.5 text-emerald-600" />}
                      {isStaff && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({msg.createdAt})</span>
                    </div>

                    <div
                      className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                          : isBot
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-950 border border-emerald-200 shadow-sm rounded-tl-none'
                          : 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/20 rounded-tr-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">
                Mẫu câu nhanh:
              </span>
              {quickCannedReplies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(reply)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg whitespace-nowrap transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeConv.status === 'BOT_HANDLING'
                    ? 'Nhập phản hồi (gửi tin sẽ tự động tiếp quản hội thoại từ Bot)...'
                    : 'Nhập tin nhắn gửi trực tiếp tới Zalo khách hàng...'
                }
                className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
              >
                <span>Gửi Zalo</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">Chọn một cuộc hội thoại Zalo để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
};
