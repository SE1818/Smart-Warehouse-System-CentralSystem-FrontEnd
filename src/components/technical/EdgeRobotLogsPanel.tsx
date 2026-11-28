import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Battery,
  Bot,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  GitCommitHorizontal,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  edgeRobotLogsService,
  type EdgeRobotLogsPayload,
} from '@/services/edgeRobotLogsService';
import { useRobotStore } from '@/stores/robotStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/common/Pagination';
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal';
import type { FleetAMR } from '@/services/portalApi';

type LogTabKey =
  | 'transfer'
  | 'command'
  | 'tableTransfer'
  | 'statusHistory'
  | 'deviceResponse'
  | 'liveStream';

interface EdgeRobotLogsPanelProps {
  robots: FleetAMR[];
  tenantSlug?: string;
}

interface DetailModalState {
  title: string;
  fields: Array<{ label: string; value: string }>;
  rawNote?: string | null;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString('vi-VN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
};

const getBadgeClass = (value?: string | null): string => {
  const norm = (value || '').toLowerCase();
  if (
    norm.includes('fail') ||
    norm.includes('error') ||
    norm.includes('cancel') ||
    norm.includes('abort') ||
    norm.includes('timeout')
  ) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (
    norm.includes('warn') ||
    norm.includes('pause') ||
    norm.includes('pending') ||
    norm.includes('retry') ||
    norm.includes('reroute')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (
    norm.includes('complete') ||
    norm.includes('success') ||
    norm.includes('ack') ||
    norm.includes('arrived') ||
    norm.includes('deliver')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

export const EdgeRobotLogsPanel: React.FC<EdgeRobotLogsPanelProps> = ({
  robots,
  tenantSlug,
}) => {
  const { logs: liveLogs, clearLogs } = useRobotStore();

  const [activeCategory, setActiveCategory] = useState<LogTabKey>('transfer');
  const [selectedRobotId, setSelectedRobotId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [recordLimit, setRecordLimit] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  const [payload, setPayload] = useState<EdgeRobotLogsPayload>({
    transferLogs: [],
    commandLogs: [],
    tableTransferLogs: [],
    statusHistoryLogs: [],
    deviceResponseLogs: [],
  });

  const loadEdgeLogs = useCallback(async () => {
    if (activeCategory === 'liveStream') {
      setLoading(false);
      return;
    }

    const categoryMap: Record<Exclude<LogTabKey, 'liveStream'>, 'Transfer' | 'Command' | 'TableTransfer' | 'StatusHistory' | 'DeviceResponse'> = {
      transfer: 'Transfer',
      command: 'Command',
      tableTransfer: 'TableTransfer',
      statusHistory: 'StatusHistory',
      deviceResponse: 'DeviceResponse',
    };

    setLoading(true);
    setFetchError(null);
    try {
      const result = await edgeRobotLogsService.getEdgeRobotLogs({
        category: categoryMap[activeCategory],
        robotId: selectedRobotId !== 'all' ? selectedRobotId : undefined,
        limit: recordLimit,
      });
      setPayload((prev) => ({
        ...prev,
        ...(activeCategory === 'transfer' ? { transferLogs: result.data.transferLogs } : {}),
        ...(activeCategory === 'command' ? { commandLogs: result.data.commandLogs } : {}),
        ...(activeCategory === 'tableTransfer' ? { tableTransferLogs: result.data.tableTransferLogs } : {}),
        ...(activeCategory === 'statusHistory' ? { statusHistoryLogs: result.data.statusHistoryLogs } : {}),
        ...(activeCategory === 'deviceResponse' ? { deviceResponseLogs: result.data.deviceResponseLogs } : {}),
      }));
      if (result.error) {
        setFetchError(result.error);
      }
    } catch {
      setFetchError('Không thể tải nhật ký robot tại trạm lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, selectedRobotId, recordLimit]);

  useEffect(() => {
    void loadEdgeLogs();
  }, [loadEdgeLogs]);

  // Reset status filter when switching log category
  useEffect(() => {
    setStatusFilter('ALL');
  }, [activeCategory]);

  const categoryTabs: Array<{
    key: LogTabKey;
    label: string;
    description: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = useMemo(
    () => [
      {
        key: 'transfer',
        label: 'Chuyến Giao Hàng',
        description: 'Nhật ký thực thi chuyến giao từ bếp đến bàn ăn',
        count: payload.transferLogs.length,
        icon: Navigation,
      },
      {
        key: 'command',
        label: 'Lệnh Điều Khiển',
        description: 'Nhật ký gửi và thực thi lệnh điều khiển robot',
        count: payload.commandLogs.length,
        icon: Terminal,
      },
      {
        key: 'tableTransfer',
        label: 'Bàn Giao & Chuyển Bàn',
        description: 'Nhật ký chuyển bàn và xác nhận bàn giao món',
        count: payload.tableTransferLogs.length,
        icon: ArrowRightLeft,
      },
      {
        key: 'statusHistory',
        label: 'Lịch Sử Trạng Thái',
        description: 'Lịch sử chuyển đổi trạng thái từng nhiệm vụ',
        count: payload.statusHistoryLogs.length,
        icon: GitCommitHorizontal,
      },
      {
        key: 'deviceResponse',
        label: 'Phản Hồi Thiết Bị',
        description: 'Phản hồi tọa độ, mức pin và trạng thái từ robot',
        count: payload.deviceResponseLogs.length,
        icon: Radio,
      },
      {
        key: 'liveStream',
        label: 'Sự Kiện Phiên Trực Tiếp',
        description: 'Các sự kiện vận hành ghi nhận trong phiên hiện tại',
        count: liveLogs.length,
        icon: Activity,
      },
    ],
    [payload, liveLogs.length]
  );

  // Distinct status options for active tab
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    if (activeCategory === 'transfer') {
      payload.transferLogs.forEach((l) => l.statusResult && set.add(l.statusResult));
    } else if (activeCategory === 'command') {
      payload.commandLogs.forEach((l) => l.executionResult && set.add(l.executionResult));
    } else if (activeCategory === 'tableTransfer') {
      payload.tableTransferLogs.forEach((l) => l.reason && set.add(l.reason));
    } else if (activeCategory === 'statusHistory') {
      payload.statusHistoryLogs.forEach((l) => l.newStatus && set.add(l.newStatus));
    } else if (activeCategory === 'deviceResponse') {
      payload.deviceResponseLogs.forEach((l) => l.status && set.add(l.status));
    } else if (activeCategory === 'liveStream') {
      set.add('info');
      set.add('success');
      set.add('warning');
      set.add('error');
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeCategory, payload]);

  // Filtered records for current tab
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesStatus = (val?: string | null) =>
      statusFilter === 'ALL' || (val || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = (...fields: Array<string | null | undefined>) =>
      !q || fields.some((f) => (f || '').toLowerCase().includes(q));

    switch (activeCategory) {
      case 'transfer':
        return payload.transferLogs.filter(
          (l) =>
            matchesStatus(l.statusResult) &&
            matchesSearch(l.robotName, l.robotId, l.destinationTableNo, l.statusResult, l.errorNotes, l.createdBy)
        );
      case 'command':
        return payload.commandLogs.filter(
          (l) =>
            matchesStatus(l.executionResult) &&
            matchesSearch(l.robotName, l.commandType, l.executionResult, l.parametersJson, l.responseDataJson, l.createdBy)
        );
      case 'tableTransfer':
        return payload.tableTransferLogs.filter(
          (l) =>
            matchesStatus(l.reason) &&
            matchesSearch(l.fromTableNo, l.toTableNo, l.reason, l.notes, l.createdBy)
        );
      case 'statusHistory':
        return payload.statusHistoryLogs.filter(
          (l) =>
            matchesStatus(l.newStatus) &&
            matchesSearch(l.destinationTableNo, l.previousStatus, l.newStatus, l.notes, l.createdBy)
        );
      case 'deviceResponse':
        return payload.deviceResponseLogs.filter(
          (l) =>
            matchesStatus(l.status) &&
            matchesSearch(l.robotName, l.robotId, l.status, l.responseDataJson, l.createdBy)
        );
      case 'liveStream':
        return liveLogs
          .map((item, idx) => ({ ...item, _idx: idx }))
          .reverse()
          .filter((l) => matchesStatus(l.type) && matchesSearch(l.message, l.timestamp, l.type));
      default:
        return [];
    }
  }, [activeCategory, payload, liveLogs, search, statusFilter]);

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination<any>(filteredRows, 10);

  const activeCategoryMeta = categoryTabs.find((t) => t.key === activeCategory) || categoryTabs[0];

  return (
    <div className="lg:h-[calc(100vh-88px)] min-h-[520px] flex flex-col gap-3 font-sans text-slate-800">
      {/* Header */}
      <div className="shrink-0 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Nhật Ký Robot Tại Trạm Quán
            </h1>
            {tenantSlug && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {tenantSlug}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Tra cứu chi tiết từng loại nhật ký vận hành của robot được ghi nhận trực tiếp tại trạm quán.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeCategory === 'liveStream' && liveLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Phiên</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadEdgeLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Category Switcher Cards (Per Robot Log Type) */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isActive
                  ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
              title={tab.description}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xs font-extrabold truncate ${
                    isActive ? 'text-blue-900' : 'text-slate-800'
                  }`}
                >
                  {tab.label}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200 px-3 py-2 shadow-xs flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Tìm trong ${activeCategoryMeta.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Robot Filter (for robot-scoped log types) */}
        {activeCategory !== 'tableTransfer' && activeCategory !== 'liveStream' && (
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedRobotId}
              onChange={(e) => setSelectedRobotId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả robot ({robots.length})</option>
              {robots.map((robot) => (
                <option key={robot.id} value={robot.id}>
                  {robot.name || robot.code}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status / Result Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Bandwidth-friendly record limit selector */}
        {activeCategory !== 'liveStream' && (
          <select
            value={recordLimit}
            onChange={(e) => setRecordLimit(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono font-medium py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
            title="Giới hạn số bản ghi tải mỗi lần"
          >
            {[20, 30, 50, 100].map((opt) => (
              <option key={opt} value={opt}>
                {opt} bản ghi mới nhất
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error Banner */}
      {fetchError && activeCategory !== 'liveStream' && (
        <div className="shrink-0 px-3.5 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadEdgeLogs()}
            className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading && activeCategory !== 'liveStream' ? (
            <div className="h-full min-h-[220px] flex items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Đang tải nhật ký robot tại trạm...</span>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-1.5 text-center p-6">
              <CheckCircle2 className="w-7 h-7 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">
                Chưa có bản ghi nào trong mục {activeCategoryMeta.label}.
              </p>
              <p className="text-[11px] text-slate-400">
                Dữ liệu sẽ tự động hiển thị khi robot thực hiện nhiệm vụ tại trạm quán.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {activeCategory === 'transfer' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Gian</th>
                    <th className="px-3.5 py-2.5">Robot</th>
                    <th className="px-3.5 py-2.5">Bàn Đích</th>
                    <th className="px-3.5 py-2.5">Kết Quả</th>
                    <th className="px-3.5 py-2.5">Ghi Chú</th>
                    <th className="px-3.5 py-2.5 text-right">Chi Tiết</th>
                  </tr>
                )}
                {activeCategory === 'command' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Gian</th>
                    <th className="px-3.5 py-2.5">Robot</th>
                    <th className="px-3.5 py-2.5">Loại Lệnh</th>
                    <th className="px-3.5 py-2.5">Kết Quả</th>
                    <th className="px-3.5 py-2.5">Thời Gian Xử Lý</th>
                    <th className="px-3.5 py-2.5">Người Gửi</th>
                    <th className="px-3.5 py-2.5 text-right">Chi Tiết</th>
                  </tr>
                )}
                {activeCategory === 'tableTransfer' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Gian</th>
                    <th className="px-3.5 py-2.5">Từ Bàn</th>
                    <th className="px-3.5 py-2.5">Đến Bàn</th>
                    <th className="px-3.5 py-2.5">Lý Do</th>
                    <th className="px-3.5 py-2.5">Ghi Chú</th>
                    <th className="px-3.5 py-2.5">Người Thực Hiện</th>
                    <th className="px-3.5 py-2.5 text-right">Chi Tiết</th>
                  </tr>
                )}
                {activeCategory === 'statusHistory' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Gian</th>
                    <th className="px-3.5 py-2.5">Bàn Đích</th>
                    <th className="px-3.5 py-2.5">Trạng Thái Trước</th>
                    <th className="px-3.5 py-2.5">Trạng Thái Mới</th>
                    <th className="px-3.5 py-2.5">Ghi Chú</th>
                    <th className="px-3.5 py-2.5">Nguồn Cập Nhật</th>
                    <th className="px-3.5 py-2.5 text-right">Chi Tiết</th>
                  </tr>
                )}
                {activeCategory === 'deviceResponse' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Gian</th>
                    <th className="px-3.5 py-2.5">Robot</th>
                    <th className="px-3.5 py-2.5">Trạng Thái</th>
                    <th className="px-3.5 py-2.5">Tọa Độ</th>
                    <th className="px-3.5 py-2.5">Mức Pin</th>
                    <th className="px-3.5 py-2.5">Nguồn</th>
                    <th className="px-3.5 py-2.5 text-right">Chi Tiết</th>
                  </tr>
                )}
                {activeCategory === 'liveStream' && (
                  <tr>
                    <th className="px-3.5 py-2.5">Thời Điểm</th>
                    <th className="px-3.5 py-2.5">Mức Độ</th>
                    <th className="px-3.5 py-2.5">Nội Dung Sự Kiện</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {activeCategory === 'transfer' &&
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatDateTime(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {item.robotName || item.robotId.slice(0, 8)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold">
                        {item.destinationTableNo ? `Bàn ${item.destinationTableNo}` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(item.statusResult)}`}>
                          {item.statusResult}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[260px]">
                        <p className="truncate text-slate-600" title={item.errorNotes || ''}>
                          {item.errorNotes || '—'}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              title: 'Chi Tiết Nhật Ký Chuyến Giao',
                              fields: [
                                { label: 'Robot', value: item.robotName || item.robotId },
                                { label: 'Bàn Đích', value: item.destinationTableNo ? `Bàn ${item.destinationTableNo}` : '—' },
                                { label: 'Kết Quả', value: item.statusResult },
                                { label: 'Bắt Đầu', value: formatDateTime(item.startedAt) },
                                { label: 'Kết Thúc', value: formatDateTime(item.finishedAt) },
                                { label: 'Người Tạo', value: item.createdBy || 'Hệ thống' },
                              ],
                              rawNote: item.errorNotes,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                {activeCategory === 'command' &&
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {item.robotName || (item.robotId ? item.robotId.slice(0, 8) : '—')}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                          {item.commandType}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(item.executionResult)}`}>
                          {item.executionResult}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                        {item.executionTimeMs != null ? `${item.executionTimeMs} ms` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {item.createdBy || 'Hệ thống'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              title: 'Chi Tiết Nhật Ký Lệnh Điều Khiển',
                              fields: [
                                { label: 'Robot', value: item.robotName || item.robotId || '—' },
                                { label: 'Loại Lệnh', value: item.commandType },
                                { label: 'Kết Quả', value: item.executionResult },
                                { label: 'Thời Gian Xử Lý', value: item.executionTimeMs != null ? `${item.executionTimeMs} ms` : '—' },
                                { label: 'Người Gửi', value: item.createdBy || 'Hệ thống' },
                                { label: 'Thời Điểm', value: formatDateTime(item.createdAt) },
                              ],
                              rawNote: item.responseDataJson || item.parametersJson,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                {activeCategory === 'tableTransfer' &&
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {item.fromTableNo || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-blue-700 whitespace-nowrap">
                        {item.toTableNo || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(item.reason)}`}>
                          {item.reason}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[260px]">
                        <p className="truncate text-slate-600" title={item.notes || ''}>
                          {item.notes || '—'}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {item.createdBy || 'Nhân viên'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              title: 'Chi Tiết Nhật Ký Bàn Giao & Chuyển Bàn',
                              fields: [
                                { label: 'Từ Bàn', value: item.fromTableNo || '—' },
                                { label: 'Đến Bàn', value: item.toTableNo || '—' },
                                { label: 'Lý Do', value: item.reason },
                                { label: 'Người Thực Hiện', value: item.createdBy || 'Nhân viên' },
                                { label: 'Thời Điểm', value: formatDateTime(item.createdAt) },
                              ],
                              rawNote: item.notes,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                {activeCategory === 'statusHistory' &&
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                        {item.destinationTableNo ? `Bàn ${item.destinationTableNo}` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {item.previousStatus || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(item.newStatus)}`}>
                          {item.newStatus}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[260px]">
                        <p className="truncate text-slate-600" title={item.notes || ''}>
                          {item.notes || '—'}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {item.createdBy || 'Hệ thống'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              title: 'Chi Tiết Lịch Sử Trạng Thái',
                              fields: [
                                { label: 'Bàn Đích', value: item.destinationTableNo ? `Bàn ${item.destinationTableNo}` : '—' },
                                { label: 'Trạng Thái Trước', value: item.previousStatus || '—' },
                                { label: 'Trạng Thái Mới', value: item.newStatus },
                                { label: 'Nguồn Cập Nhật', value: item.createdBy || 'Hệ thống' },
                                { label: 'Thời Điểm', value: formatDateTime(item.createdAt) },
                              ],
                              rawNote: item.notes,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                {activeCategory === 'deviceResponse' &&
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {item.robotName || item.robotId.slice(0, 8)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono whitespace-nowrap text-slate-700">
                        {item.currentX != null && item.currentY != null
                          ? `X: ${item.currentX}, Y: ${item.currentY}`
                          : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {item.batteryAtResponse != null ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                            <Battery className="w-3.5 h-3.5 text-slate-400" />
                            {Number(item.batteryAtResponse).toFixed(0)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {item.createdBy || 'Thiết bị'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setDetailModal({
                              title: 'Chi Tiết Phản Hồi Thiết Bị',
                              fields: [
                                { label: 'Robot', value: item.robotName || item.robotId },
                                { label: 'Trạng Thái', value: item.status },
                                {
                                  label: 'Tọa Độ',
                                  value:
                                    item.currentX != null && item.currentY != null
                                      ? `X: ${item.currentX}, Y: ${item.currentY}`
                                      : '—',
                                },
                                {
                                  label: 'Mức Pin',
                                  value: item.batteryAtResponse != null ? `${Number(item.batteryAtResponse).toFixed(0)}%` : '—',
                                },
                                { label: 'Thời Điểm', value: formatDateTime(item.createdAt) },
                              ],
                              rawNote: item.responseDataJson,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                {activeCategory === 'liveStream' &&
                  paginatedItems.map((item) => (
                    <tr key={`${item.timestamp}-${item._idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getBadgeClass(item.type)}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-800 font-medium">
                        {item.message}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="bản ghi"
        />
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-extrabold text-slate-900">{detailModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                {detailModal.fields.map((field) => (
                  <div key={field.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {field.label}
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block break-words">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>

              {detailModal.rawNote && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Thông Tin Bổ Sung
                  </span>
                  <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {detailModal.rawNote}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        theme="light"
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          clearLogs();
          setIsClearConfirmOpen(false);
        }}
        title="Xác Nhận Xóa Nhật Ký Phiên"
        subtitle="Sự Kiện Phiên Trực Tiếp (Live Stream)"
        description={
          <>
            Bạn có chắc chắn muốn xóa toàn bộ{' '}
            <strong className="text-slate-900 font-extrabold">
              {liveLogs.length} sự kiện
            </strong>{' '}
            đang hiển thị trong phiên trực tiếp hiện tại?
          </>
        }
        warningNote="Hành động này chỉ làm sạch danh sách theo dõi tạm thời trên trình duyệt và không ảnh hưởng tới dữ liệu đã lưu tại trạm."
        chips={[
          { label: `${liveLogs.length} bản ghi phiên`, accent: true },
          ...(tenantSlug ? [{ label: tenantSlug }] : []),
        ]}
        confirmLabel="Xóa Phiên"
      />
    </div>
  );
};
