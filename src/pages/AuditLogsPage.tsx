import { useState, useEffect } from 'react';
import { transferService } from '@/services';
import type {
  TransferRequest,
  TransferStatus,
  TransferCommand,
  TransferResponse,
  LogTransfer,
  TransferCommandStatus,
  LogTransferCommand,
} from '@/services/transferService';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

type LogTabType = 'status_history' | 'commands' | 'responses' | 'transfer_log';

export function AuditLogsPage() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TransferRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);

  // Detail data for selected request
  const [statusHistory, setStatusHistory] = useState<TransferStatus[]>([]);
  const [commands, setCommands] = useState<TransferCommand[]>([]);
  const [responses, setResponses] = useState<TransferResponse[]>([]);
  const [transferLog, setTransferLog] = useState<LogTransfer | null>(null);

  // Command-specific logs (t_transfer_command_status, t_log_transfer_commands)
  const [expandedCommandId, setExpandedCommandId] = useState<string | null>(null);
  const [commandStatuses, setCommandStatuses] = useState<Record<string, TransferCommandStatus[]>>({});
  const [commandLogs, setCommandLogs] = useState<Record<string, LogTransferCommand | null>>({});
  const [loadingCommandDetails, setLoadingCommandDetails] = useState<Record<string, boolean>>({});

  // Loading states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchId, setSearchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<LogTabType>('status_history');

  // Copy helper
  const handleCopyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label} vào bộ nhớ tạm.`);
  };

  // GUID Formatters
  const formatId = (id: string, prefix = 'REQ') => {
    if (!id) return '';
    const parts = id.split('-');
    return `${prefix}-${parts[0].toUpperCase()}`;
  };

  const formatStationId = (id: string) => {
    if (!id) return '';
    if (id.length <= 8) return id.toUpperCase();
    return `ST-${id.substring(0, 8).toUpperCase()}`;
  };

  // Fetch transfer requests (t_transfer_requests)
  const fetchTransferRequests = async () => {
    setLoadingList(true);
    try {
      const data = await transferService.listTransfers();
      setRequests(data);
      setFilteredRequests(data);
      if (data.length > 0) {
        setSelectedRequest(data[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách lệnh vận chuyển.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void fetchTransferRequests();
  }, []);

  // Filter requests
  useEffect(() => {
    let result = requests;

    if (statusFilter !== 'all') {
      result = result.filter(
        (r) => r.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchId.trim()) {
      const q = searchId.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.fromStationId.toLowerCase().includes(q) ||
          r.toStationId.toLowerCase().includes(q)
      );
    }

    setFilteredRequests(result);
    if (result.length > 0) {
      const exists = result.some((r) => r.id === selectedRequest?.id);
      if (!exists) {
        setSelectedRequest(result[0]);
      }
    } else {
      setSelectedRequest(null);
    }
  }, [statusFilter, searchId, requests]);

  // Load nested logs (t_transfer_status, t_transfer_commands, t_transfer_responses, t_log_transfers)
  const fetchRequestDetails = async () => {
    if (!selectedRequest) return;
    setLoadingDetails(true);
    setExpandedCommandId(null);
    setCommandStatuses({});
    setCommandLogs({});

    try {
      const auditData = await transferService.getTransferHistory(selectedRequest.id);
      setStatusHistory(auditData.statusHistory || []);
      setCommands(auditData.commands || []);
      setResponses(auditData.responses || []);
      setTransferLog(auditData.transferLog);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi tải nhật ký chi tiết.');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedRequest) {
      void fetchRequestDetails();
    } else {
      setStatusHistory([]);
      setCommands([]);
      setResponses([]);
      setTransferLog(null);
    }
  }, [selectedRequest]);

  // Load command-level details (t_transfer_command_status, t_log_transfer_commands)
  const handleToggleCommand = async (commandId: string) => {
    if (expandedCommandId === commandId) {
      setExpandedCommandId(null);
      return;
    }

    setExpandedCommandId(commandId);

    if (commandStatuses[commandId] !== undefined) return;

    setLoadingCommandDetails((prev) => ({ ...prev, [commandId]: true }));
    try {
      const [history, log] = await Promise.all([
        transferService.getCommandStatusHistory(commandId).catch(() => [] as TransferCommandStatus[]),
        transferService.getCommandLog(commandId).catch(() => null),
      ]);

      setCommandStatuses((prev) => ({ ...prev, [commandId]: history }));
      setCommandLogs((prev) => ({ ...prev, [commandId]: log }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCommandDetails((prev) => ({ ...prev, [commandId]: false }));
    }
  };

  const getStatusColorScale = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'success') return 'emerald';
    if (s === 'failed' || s === 'error') return 'rose';
    if (s === 'cancelled' || s === 'canceled') return 'slate';
    if (s === 'processing' || s === 'executing') return 'blue';
    return 'amber';
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColorScale(status);
    if (color === 'emerald') return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    if (color === 'rose') return 'bg-rose-50 border-rose-200 text-rose-600';
    if (color === 'slate') return 'bg-slate-100 border-slate-200 text-slate-500';
    if (color === 'blue') return 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse';
    return 'bg-amber-50 border-amber-200 text-amber-600';
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return 'Hoàn thành';
    if (s === 'failed') return 'Thất bại';
    if (s === 'cancelled') return 'Đã hủy';
    if (s === 'processing') return 'Đang xử lý';
    if (s === 'pending') return 'Chờ nhận';
    return status;
  };

  const formatJson = (jsonStr: string | null) => {
    if (!jsonStr) return '---';
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  };

  // Helper to render Visual Flow Tracker
  const renderFlowTracker = (status: string) => {
    const s = status.toLowerCase();
    let currentStep = 0; // 0: Pending, 1: Processing, 2: Final
    let isFailed = false;

    if (s === 'processing') {
      currentStep = 1;
    } else if (s === 'completed') {
      currentStep = 2;
    } else if (s === 'failed' || s === 'cancelled') {
      currentStep = 2;
      isFailed = true;
    }

    const steps = [
      { label: 'Đã tiếp nhận', desc: 'Chờ phân phối robot', key: 'pending' },
      { label: 'Đang vận chuyển', desc: 'Robot đang di chuyển', key: 'processing' },
      { 
        label: isFailed ? (s === 'cancelled' ? 'Đã hủy bỏ' : 'Gặp lỗi/Thất bại') : 'Hoàn thành', 
        desc: isFailed ? (s === 'cancelled' ? 'Hủy bởi Admin' : 'Kiểm tra log lỗi') : 'Robot trả hàng thành công', 
        key: 'final' 
      },
    ];

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
          {/* Connecting Line background */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 hidden md:block z-0" />

          {/* Connected Line active progress */}
          <div 
            className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 hidden md:block z-0 transition-all duration-500 ${
              isFailed ? 'bg-rose-450' : 'bg-brand-500'
            }`}
            style={{ width: `${currentStep === 0 ? '0%' : currentStep === 1 ? '50%' : '100%'}` }}
          />

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            let stepBg = 'bg-slate-100 border-slate-200 text-slate-400';
            let circleRing = 'border-transparent';

            if (isActive) {
              circleRing = isFailed ? 'ring-4 ring-rose-100 border-rose-400 animate-pulse' : 'ring-4 ring-brand-50 border-brand-500 animate-pulse';
              stepBg = isFailed ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-brand-50 border-brand-500 text-brand-600';
            } else if (isCompleted) {
              stepBg = isFailed && idx === 1 ? 'bg-rose-500 border-rose-500 text-white' : 'bg-brand-600 border-brand-600 text-white';
            }

            return (
              <div key={step.key} className="flex flex-col items-center text-center relative z-10 flex-1">
                {/* Step Circle */}
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${stepBg} ${circleRing} transition-all duration-300 shadow-sm`}>
                  {idx === 0 && <span className="text-base">📥</span>}
                  {idx === 1 && <span className="text-base">⚡</span>}
                  {idx === 2 && (
                    <span className="text-base">
                      {isFailed ? (s === 'cancelled' ? '🚫' : '⚠️') : '🏁'}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <span className={`text-xs font-extrabold mt-2.5 ${isActive ? 'text-slate-900' : isCompleted ? 'text-slate-700' : 'text-slate-450'}`}>
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-[150px] leading-tight">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Icons.HistoryLogs className="w-4.5 h-4.5" />
            </div>
            <span>Nhật ký vận chuyển AMR</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            Giám sát, phân tích và tra cứu chi tiết nhật ký vận chuyển qua 7 bảng nghiệp vụ của hệ thống Robot
          </p>
        </div>
        <button
          onClick={fetchTransferRequests}
          disabled={loadingList}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Icons.Refresh className={`w-3.5 h-3.5 text-slate-500 ${loadingList ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div className="col-span-12 sm:col-span-8 space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tìm kiếm</label>
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo ID, Trạm gửi, Trạm nhận..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-xs text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="col-span-12 sm:col-span-4 space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-xs text-slate-800"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ nhận (Pending)</option>
            <option value="processing">Đang xử lý (Processing)</option>
            <option value="completed">Hoàn thành (Completed)</option>
            <option value="failed">Thất bại (Failed)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* ── Main Split View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transfer Requests List (t_transfer_requests) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Yêu cầu vận chuyển</h3>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
              {filteredRequests.length} Yêu cầu
            </span>
          </div>

          {loadingList ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Icons.Spinner className="w-7 h-7 text-brand-600" />
              <span className="text-xs text-slate-400 font-semibold">Đang tải danh sách...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Icons.Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold">Không tìm thấy yêu cầu vận chuyển nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {filteredRequests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-2 cursor-pointer border-l-4 ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-50 to-brand-100/10 border-l-brand-600 pl-3'
                        : 'hover:bg-slate-50/30 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-[10px] font-black text-slate-400">
                        {formatId(req.id)}
                      </span>
                      <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-full ${getStatusBadge(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>

                    {/* Routing display in card */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Lộ trình</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 truncate">
                            {formatStationId(req.fromStationId)}
                          </span>
                          <span className="text-slate-400 text-[10px]">➔</span>
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 truncate">
                            {formatStationId(req.toStationId)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-450 pt-2 border-t border-slate-50 w-full mt-1">
                      <span>Độ ưu tiên: <strong className="text-slate-700 font-bold">{req.priority}</strong></span>
                      <span className="font-medium text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')} {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed nested logs (6 related tables) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRequest ? (
            <>
              {/* Detail Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-brand-100 text-brand-800 text-[10px] font-black rounded-md">YÊU CẦU</span>
                      <span className="font-mono text-slate-700">{formatId(selectedRequest.id)}</span>
                      <button
                        onClick={() => handleCopyToClipboard(selectedRequest.id, 'ID Yêu cầu')}
                        className="text-slate-400 hover:text-slate-650 cursor-pointer"
                        title="Sao chép ID đầy đủ"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                        </svg>
                      </button>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tuyến đường:</span>
                      <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {formatStationId(selectedRequest.fromStationId)}
                      </span>
                      <span className="text-slate-300 text-xs">➔</span>
                      <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {formatStationId(selectedRequest.toStationId)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 border text-xs font-bold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                    {getStatusLabel(selectedRequest.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider block">ID đầy đủ</span>
                    <span className="font-mono text-slate-600 block bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[10px] break-all select-all">
                      {selectedRequest.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider block">Thời điểm tạo yêu cầu</span>
                    <span className="font-bold text-slate-800 block mt-1">
                      {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Step Progress Indicator ── */}
              {renderFlowTracker(selectedRequest.status)}

              {/* ── Sub Navigation Tabs ── */}
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/20">
                  <TabBtn active={activeTab === 'status_history'} onClick={() => setActiveTab('status_history')} label="Lịch sử Trạng thái (t_transfer_status)" />
                  <TabBtn active={activeTab === 'commands'} onClick={() => setActiveTab('commands')} label="Lệnh Robot (t_transfer_commands)" />
                  <TabBtn active={activeTab === 'responses'} onClick={() => setActiveTab('responses')} label="Phản hồi Robot (t_transfer_responses)" />
                  <TabBtn active={activeTab === 'transfer_log'} onClick={() => setActiveTab('transfer_log')} label="Báo cáo kết quả (t_log_transfers)" />
                </div>

                <div className="p-6">
                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Icons.Spinner className="w-8 h-8 text-brand-600 animate-spin" />
                      <span className="text-xs text-slate-400 font-semibold">Đang tải nhật ký liên quan...</span>
                    </div>
                  ) : (
                    <>
                      {/* Tab 1: Status History (t_transfer_status) */}
                      {activeTab === 'status_history' && (
                        <div className="space-y-6">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Dòng lịch sử trạng thái của yêu cầu
                          </h4>
                          {statusHistory.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                              Không có dữ liệu lịch sử trạng thái.
                            </div>
                          ) : (
                            <div className="relative border-l border-slate-200 pl-5 ml-2.5 space-y-6">
                              {statusHistory.map((history, idx) => (
                                <div key={history.id || idx} className="relative">
                                  <span className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-brand-500 shadow-sm flex items-center justify-center" />
                                  
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold rounded-md">
                                        {history.previousStatus ? getStatusLabel(history.previousStatus) : 'Bắt đầu'}
                                      </span>
                                      <span className="text-slate-400">→</span>
                                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-md ${getStatusBadge(history.newStatus)}`}>
                                        {getStatusLabel(history.newStatus)}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-normal ml-auto">
                                        {new Date(history.createdAt).toLocaleString('vi-VN')}
                                      </span>
                                    </div>
                                    {history.notes && (
                                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1.5 font-medium leading-relaxed">
                                        {history.notes}
                                      </p>
                                    )}
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      Người thực hiện: <strong className="text-slate-500 font-bold">{history.createdBy || 'Hệ thống (System)'}</strong>
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 2: Commands Sent (t_transfer_commands) */}
                      {activeTab === 'commands' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Danh sách lệnh điều hướng gửi tới Robot
                          </h4>

                          {commands.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                              Chưa có lệnh nào được tạo cho yêu cầu này.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {commands.map((cmd) => {
                                const isExpanded = expandedCommandId === cmd.id;
                                const loadingCmd = loadingCommandDetails[cmd.id];
                                const history = commandStatuses[cmd.id] || [];
                                const log = commandLogs[cmd.id];

                                return (
                                  <div key={cmd.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                    <button
                                      onClick={() => void handleToggleCommand(cmd.id)}
                                      className="w-full text-left p-4 bg-slate-50/30 hover:bg-slate-50/70 transition-all flex items-center justify-between gap-4 cursor-pointer"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] font-black text-slate-400">
                                            {formatId(cmd.id, 'CMD')}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopyToClipboard(cmd.id, 'ID Lệnh');
                                            }}
                                            className="text-slate-350 hover:text-slate-500 cursor-pointer"
                                            title="Sao chép ID Lệnh đầy đủ"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                                            </svg>
                                          </button>
                                        </div>
                                        <span className="text-xs font-black text-slate-800 mt-0.5 block">
                                          🤖 Robot ID: <span className="font-mono text-brand-700">{formatId(cmd.robotId, 'ROB')}</span>
                                        </span>
                                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                                          Loại: {cmd.commandType}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${getStatusBadge(cmd.status)}`}>
                                          {getStatusLabel(cmd.status)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          {new Date(cmd.createdAt).toLocaleTimeString('vi-VN')}
                                        </span>
                                        <span className="text-slate-400 text-xs">
                                          {isExpanded ? '▲' : '▼'}
                                        </span>
                                      </div>
                                    </button>

                                    {/* Expanded command logs (t_transfer_command_status, t_log_transfer_commands) */}
                                    {isExpanded && (
                                      <div className="p-4 border-t border-slate-100 bg-white space-y-4 text-xs">
                                        {loadingCmd ? (
                                          <div className="flex items-center justify-center gap-2 py-4">
                                            <Icons.Spinner className="w-4 h-4 text-brand-600" />
                                            <span className="text-slate-450 font-semibold text-xs">Đang tải nhật ký lệnh...</span>
                                          </div>
                                        ) : (
                                          <>
                                            {cmd.parametersJson && (
                                              <div className="space-y-1">
                                                <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">
                                                  Tham số lệnh (Parameters)
                                                </span>
                                                <pre className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl font-mono text-[10px] text-slate-650 overflow-x-auto">
                                                  {formatJson(cmd.parametersJson)}
                                                </pre>
                                              </div>
                                            )}

                                            {/* Command Status History (t_transfer_command_status) */}
                                            <div className="space-y-2">
                                              <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">
                                                Lịch sử trạng thái lệnh (t_transfer_command_status)
                                              </span>
                                              {history.length === 0 ? (
                                                <p className="text-slate-400 italic text-[11px]">Không có dữ liệu trạng thái.</p>
                                              ) : (
                                                <div className="space-y-2 border-l border-slate-150 pl-4 ml-1">
                                                  {history.map((hist, idx) => (
                                                    <div key={hist.id || idx} className="text-[11px] space-y-0.5">
                                                      <div className="flex items-center gap-1.5">
                                                        <span className={`font-bold ${getStatusBadge(hist.newStatus)} px-1.5 py-0.5 rounded-sm text-[9px]`}>
                                                          {getStatusLabel(hist.newStatus)}
                                                        </span>
                                                        <span className="text-slate-400">| {new Date(hist.createdAt).toLocaleString('vi-VN')}</span>
                                                      </div>
                                                      {hist.notes && <p className="text-slate-500 italic mt-0.5 font-semibold">{hist.notes}</p>}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {/* Command Execution Log (t_log_transfer_commands) */}
                                            <div className="space-y-2 pt-2 border-t border-slate-50">
                                              <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">
                                                Nhật ký kết quả thực thi lệnh (t_log_transfer_commands)
                                              </span>
                                              {log ? (
                                                <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    <div>
                                                      <span className="text-slate-400 font-semibold">Kết quả:</span>
                                                      <span className={`ml-1 font-bold ${log.executionResult.toLowerCase() === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {log.executionResult}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-slate-400 font-semibold">Thời gian xử lý:</span>
                                                      <span className="ml-1 font-bold text-slate-700">
                                                        {log.executionTimeMs !== null ? `${log.executionTimeMs} ms` : '---'}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  {log.responseDataJson && (
                                                    <div className="space-y-1">
                                                      <span className="text-[10px] text-slate-450 block font-bold">Phản hồi thô (Raw Response Data):</span>
                                                      <pre className="p-2 bg-white border border-slate-100 rounded-lg font-mono text-[9px] text-slate-500 overflow-x-auto">
                                                        {formatJson(log.responseDataJson)}
                                                      </pre>
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <p className="text-slate-400 italic text-[11px]">Chưa có bản ghi kết quả thực thi.</p>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 3: Robot Responses (t_transfer_responses) */}
                      {activeTab === 'responses' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Phản hồi tọa độ & trạng thái gửi về từ Robot
                          </h4>

                          {responses.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 font-semibold bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                              Chưa có phản hồi nào được nhận cho yêu cầu này.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <th className="p-3">Robot ID</th>
                                    <th className="p-3 text-center">Tọa độ (X, Y)</th>
                                    <th className="p-3 text-center">Dung lượng Pin</th>
                                    <th className="p-3">Thời gian nhận</th>
                                    <th className="p-3 text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                  {responses.map((res) => (
                                    <tr key={res.id} className="hover:bg-slate-50/30">
                                      <td className="p-3 font-mono text-[10px] text-slate-500">{formatId(res.robotId, 'ROB')}</td>
                                      <td className="p-3 text-center font-mono font-black text-slate-800">
                                        {res.currentX !== null && res.currentY !== null ? `(${res.currentX}, ${res.currentY})` : '---'}
                                      </td>
                                      <td className="p-3 text-center font-extrabold">
                                        {res.batteryAtResponse !== null ? (
                                          <span className={`inline-flex items-center gap-1.5 ${
                                            res.batteryAtResponse > 50 ? 'text-emerald-600' :
                                            res.batteryAtResponse > 20 ? 'text-amber-500' : 'text-rose-600'
                                          }`}>
                                            🔋 {res.batteryAtResponse}%
                                          </span>
                                        ) : '---'}
                                      </td>
                                      <td className="p-3 text-slate-400 font-medium">
                                        {new Date(res.createdAt).toLocaleString('vi-VN')}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${getStatusBadge(res.status)}`}>
                                          {getStatusLabel(res.status)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 4: Final Transfer Log (t_log_transfers) */}
                      {activeTab === 'transfer_log' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Báo cáo kết quả vận chuyển cuối cùng
                          </h4>

                          {transferLog ? (
                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-inner">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Robot ID thực hiện</span>
                                  <span className="font-mono text-brand-700 text-sm mt-0.5 block">{formatId(transferLog.robotId, 'ROB')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Kết quả vận chuyển</span>
                                  <span className={`font-black text-sm mt-0.5 block ${transferLog.statusResult.toLowerCase() === 'completed' || transferLog.statusResult.toLowerCase() === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {getStatusLabel(transferLog.statusResult)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Quãng đường di chuyển</span>
                                  <span className="text-slate-800 text-sm mt-0.5 block">
                                    {transferLog.distanceTravelled !== null ? `${transferLog.distanceTravelled} m` : '---'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Ngày ghi nhận</span>
                                  <span className="text-slate-800 font-medium text-sm mt-0.5 block">
                                    {new Date(transferLog.createdAt).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Thời điểm bắt đầu</span>
                                  <span className="text-slate-800 font-medium text-sm mt-0.5 block">
                                    {new Date(transferLog.startedAt).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Thời điểm kết thúc</span>
                                  <span className="text-slate-800 font-medium text-sm mt-0.5 block">
                                    {transferLog.finishedAt ? new Date(transferLog.finishedAt).toLocaleString('vi-VN') : '---'}
                                  </span>
                                </div>
                              </div>

                              {transferLog.errorNotes && (
                                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
                                  <span className="font-bold block mb-1">⚠️ Nhật ký lỗi:</span>
                                  <p className="font-semibold">{transferLog.errorNotes}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-xs text-slate-450 font-bold bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 text-base">ℹ️</div>
                              <p className="max-w-md leading-relaxed text-slate-500">
                                Yêu cầu vận chuyển này chưa kết thúc (đang ở trạng thái {getStatusLabel(selectedRequest.status).toLowerCase()}) nên chưa có báo cáo kết quả cuối cùng.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-455 space-y-3">
              <Icons.Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-sm">Vui lòng chọn một yêu cầu vận chuyển ở cột bên trái để xem chi tiết log.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub Tab button helper component
function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3.5 text-[11px] font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
        active
          ? 'border-brand-600 text-brand-700 bg-brand-50/5'
          : 'border-transparent text-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}