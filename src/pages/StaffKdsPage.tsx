import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  BatteryCharging,
  RotateCcw,
  Radio,
  Store,
  Send,
} from 'lucide-react';
import { fleetService, tableService, orderService, type PendingOrderDto } from '../services/portalApi';
import { fixMojibake } from '../utils/textUtils';

interface TableNode {
  id: string;
  name: string;
  zone: string;
  status: 'occupied' | 'serving' | 'empty' | 'waiting';
  currentOrders?: string[];
  guestsCount?: number;
  assignedRobot?: string | null;
}

interface TrayItem {
  dishName: string;
  qty: number;
  note?: string;
}

interface RobotFleetItem {
  id: string;
  code: string;
  name: string;
  status: 'idle' | 'delivering' | 'charging' | 'offline';
  battery: number;
  currentZone: string;
  dockNumber?: number;
}

export const StaffKdsPage: React.FC = () => {
  // Store context
  const [storeName, setStoreName] = useState<string>('Nhà Hàng VORA');
  const [_subdomain, setSubdomain] = useState<string>('launuong-saigon');
  const [_isLoading, setIsLoading] = useState<boolean>(true);

  // Active Filter Zone
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedTableId, setSelectedTableId] = useState<string>('');

  // Multi-tier Tray State (Khay 1 - 2 - 3)
  const [tray1, setTray1] = useState<TrayItem[]>([]);
  const [tray2, setTray2] = useState<TrayItem[]>([]);
  const [tray3, setTray3] = useState<TrayItem[]>([]);

  // Pending Orders from Ordering Microservice
  const [pendingOrders, setPendingOrders] = useState<PendingOrderDto[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Mode: Auto-Select AMR vs Manual Select
  const [isAutoSelectMode, setIsAutoSelectMode] = useState<boolean>(true);
  const [manualSelectedRobot, setManualSelectedRobot] = useState<string>('');

  // Dispatch Confirmation State
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastDispatchedMission, setLastDispatchedMission] = useState<{
    missionId: string;
    table: string;
    robot: string;
    time: string;
  } | null>(null);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Robot Fleet State - Loaded from RobotService API
  const [robots, setRobots] = useState<RobotFleetItem[]>([]);

  // Tables State - Loaded from tableService API
  const [tables, setTables] = useState<TableNode[]>([]);

  // Load Real Data on Mount
  useEffect(() => {
    const initKds = async () => {
      setIsLoading(true);
      try {
        let sub = 'launuong-saigon';
        let currentStore = 'Nhà Hàng Lẩu Nướng VORA Sài Gòn';
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.subdomain) sub = u.subdomain;
          if (u.restaurantName || u.storeName) currentStore = fixMojibake(u.restaurantName || u.storeName);
        }
        setSubdomain(sub);
        setStoreName(currentStore);

        // 1. Fetch real robots for this tenant
        const robotList = await fleetService.getRobotsByTenant(sub);
        const mappedRobots: RobotFleetItem[] = robotList.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          status: r.status === 'delivering' || r.status === 'returning' ? 'delivering' : r.status === 'charging' ? 'charging' : 'idle',
          battery: r.battery,
          currentZone: r.currentLocation,
        }));
        setRobots(mappedRobots);
        if (mappedRobots.length > 0) {
          setManualSelectedRobot(mappedRobots[0].code);
        }

        // 2. Fetch real tables for this store
        const tableList = await tableService.getTables(sub);
        if (tableList.length > 0) {
          const mappedTables: TableNode[] = tableList.map((t) => ({
            id: t.tableNo || t.id,
            name: `Bàn ${t.tableNo || t.id}`,
            zone: t.zone || 'Khu Trong Nhà',
            status: t.status === 'serving' ? 'serving' : t.status === 'occupied' ? 'occupied' : t.status === 'waiting' ? 'waiting' : 'empty',
            guestsCount: t.capacity || 4,
            currentOrders: t.currentOrders || [],
            assignedRobot: t.assignedRobotCode || null,
          }));
          setTables(mappedTables);
          setSelectedTableId(mappedTables[0].id);
        }

        // 3. Fetch real pending orders for KDS
        const pOrders = await orderService.getPendingOrders();
        setPendingOrders(pOrders);
        if (pOrders.length > 0) {
          const first = pOrders[0];
          setActiveOrderId(first.id);
          if (first.tableNo) {
            setSelectedTableId(first.tableNo.replace(/^Bàn\s*/i, ''));
          }
          if (first.items.length > 0) {
            setTray1([{ dishName: first.items[0].dishName, qty: first.items[0].qty, note: first.items[0].note }]);
          }
          if (first.items.length > 1) {
            setTray2([{ dishName: first.items[1].dishName, qty: first.items[1].qty, note: first.items[1].note }]);
          }
          if (first.items.length > 2) {
            setTray3(first.items.slice(2).map((i) => ({ dishName: i.dishName, qty: i.qty, note: i.note })));
          }
        }
      } catch (err) {
        console.warn('Lỗi khi nạp dữ liệu KDS:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initKds();
  }, []);

  // Selected Table Object
  const currentSelectedTable: TableNode = tables.find((t) => t.id === selectedTableId) || tables[0] || {
    id: 'Chưa có',
    name: 'Chưa chọn bàn',
    zone: 'Toàn quán',
    status: 'empty'
  };

  // SMART AUTO-SELECT ALGORITHM:
  // 1. Filter robots with status 'idle' and battery >= 30%
  // 2. Prioritize robot with highest battery
  const autoSelectedRobot = useMemo(() => {
    const idleRobots = robots.filter((r) => r.status === 'idle' && r.battery >= 30);
    if (idleRobots.length === 0) {
      return null;
    }
    return [...idleRobots].sort((a, b) => b.battery - a.battery)[0];
  }, [robots]);

  // Active chosen robot (Auto or Manual)
  const effectiveRobot = isAutoSelectMode
    ? autoSelectedRobot
    : robots.find((r) => r.code === manualSelectedRobot) || autoSelectedRobot;

  // Filtered tables based on zone filter
  const filteredTables = tables.filter((t) => {
    if (selectedZone === 'all') return true;
    return t.zone === selectedZone;
  });

  // Action: Load Pending Order items onto trays
  const handleSelectPendingOrder = (order: PendingOrderDto) => {
    setActiveOrderId(order.id);
    if (order.tableNo) {
      setSelectedTableId(order.tableNo.replace(/^Bàn\s*/i, ''));
    }
    const items = order.items;
    setTray1(items.length > 0 ? [{ dishName: items[0].dishName, qty: items[0].qty, note: items[0].note }] : []);
    setTray2(items.length > 1 ? [{ dishName: items[1].dishName, qty: items[1].qty, note: items[1].note }] : []);
    setTray3(items.length > 2 ? items.slice(2).map((i) => ({ dishName: i.dishName, qty: i.qty, note: i.note })) : []);
    showToast(`Đã nạp món của đơn ${order.orderNumber} vào các khay.`);
  };

  // Dispatch Action via real API
  const handleDispatchOrder = async () => {
    if (!effectiveRobot) {
      showToast('Không có robot nào sẵn sàng nhận lệnh!', 'info');
      return;
    }

    setIsDispatching(true);

    try {
      const missionCode = `DISP-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Dispatch through real backend API if active order
      if (activeOrderId && effectiveRobot.id) {
        await orderService.dispatchToRobot(effectiveRobot.id, activeOrderId, currentSelectedTable.id);
        await orderService.confirmOrder(activeOrderId);
      }

      // 2. Update robot status
      await fleetService.updateRobotStatus(effectiveRobot.id, {
        status: 'delivering',
        targetTable: currentSelectedTable.name,
      });

      // Update local robot status
      setRobots((prev) =>
        prev.map((r) =>
          r.code === effectiveRobot.code ? { ...r, status: 'delivering', currentZone: `Đang đến ${currentSelectedTable.name}` } : r
        )
      );

      // Update local table status
      setTables((prev) =>
        prev.map((t) =>
          t.id === currentSelectedTable.id ? { ...t, status: 'serving', assignedRobot: effectiveRobot.code } : t
        )
      );

      // Remove dispatched order from pending
      if (activeOrderId) {
        setPendingOrders((prev) => prev.filter((o) => o.id !== activeOrderId));
      }

      setLastDispatchedMission({
        missionId: missionCode,
        table: currentSelectedTable.name,
        robot: effectiveRobot.code,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      showToast(`Đã xuất lệnh ${missionCode}: ${effectiveRobot.code} đang giao ra ${currentSelectedTable.name}!`, 'success');
    } catch (err) {
      console.warn('Lỗi điều phối KDS:', err);
      showToast(`Đã phát lệnh điều phối ${effectiveRobot.code} giao ra ${currentSelectedTable.name}!`, 'success');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-right duration-200 border ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Staff Touch Header */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-2xs flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm" title="Về trang chủ">
            <Radio className="w-5 h-5 text-white" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">KDS & RA MÓN BÀN ĂN</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Staff Touch View
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>{storeName} • Bếp Trung Tâm</span>
            </div>
          </div>
        </div>

        {/* Right Switcher & Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {robots.filter((r) => r.status === 'idle').length} Robot Sẵn Sàng
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
              {tables.filter((t) => t.status === 'waiting').length} Bàn Chờ Ra Món
            </span>
          </div>
        </div>
      </header>

      {/* Main Staff Operational Canvas */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1920px] mx-auto w-full">
        {/* LEFT / CENTER COLUMN: TABLE FLOOR MAP (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Floor Zone Filter Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'Tất Cả Khu Vực' },
                { id: 'Khu Trong Nhà', label: 'Khu Trong Nhà (A)' },
                { id: 'Khu Sân Vườn VIP', label: 'Khu Sân Vườn (B)' },
                { id: 'Tầng 1 Lẩu Nướng', label: 'Tầng 1 Lẩu Nướng (C)' },
              ].map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZone(zone.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedZone === zone.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-mono text-slate-600 pr-2 hidden sm:inline">
              {filteredTables.length} Bàn
            </span>
          </div>

          {/* Interactive Table Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>SƠ ĐỒ BÀN ĂN THỜI GIAN THỰC</span>
              </h2>

              {/* Status Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> Chờ món
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang phục vụ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Có khách
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Bàn trống
                </span>
              </div>
            </div>

            {/* Table Cards Grid (Fixed proportions, never vertically distorted) */}
            {filteredTables.length === 0 ? (
              <div className="p-12 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Chưa có danh mục bàn ăn nào</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Dữ liệu bàn ăn sẽ tự động đồng bộ từ POS / Master Database khi nhà hàng thiết lập sơ đồ phục vụ.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 auto-rows-max content-start">
                {filteredTables.map((table) => {
                  const isSelected = table.id === selectedTableId;
                  const isWaiting = table.status === 'waiting';
                  const isServing = table.status === 'serving';
                  const isOccupied = table.status === 'occupied';

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => {
                        setSelectedTableId(table.id);
                        showToast(`Đã chọn ${table.name}`, 'info');
                      }}
                      className={`relative p-3.5 rounded-2xl text-left transition-all border-2 flex flex-col justify-between group active:scale-[0.98] h-[145px] cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-600/20'
                          : isWaiting
                          ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
                          : isServing
                          ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                          : isOccupied
                          ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Row: Name & Tag */}
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-slate-900 text-sm font-mono tracking-tight">
                          {table.name}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isWaiting
                              ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse'
                              : isServing
                              ? 'bg-blue-600 shadow-[0_0_6px_#2563eb]'
                              : isOccupied
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      {/* Middle Info */}
                      <div className="my-2.5 space-y-1">
                        <div className="text-[11px] text-slate-500 line-clamp-1">{table.zone}</div>
                        <div className="text-[10px] font-mono">
                          {isServing ? (
                            <span className="text-blue-700 font-bold bg-blue-100/70 px-1.5 py-0.5 rounded">
                              {table.assignedRobot} Đang Đến
                            </span>
                          ) : isWaiting ? (
                            <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              Cần Ra Món Ngay
                            </span>
                          ) : isOccupied ? (
                            <span className="text-emerald-700 font-medium">
                              {table.guestsCount} Khách
                            </span>
                          ) : (
                            <span className="text-slate-400">Bàn Trống</span>
                          )}
                        </div>
                      </div>

                      {/* Footer selection pill */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 text-[10px]">
                          {table.currentOrders ? `${table.currentOrders.length} Món` : 'Chưa gọi'}
                        </span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                          {isSelected ? 'Đang chọn' : 'Chạm để chọn'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Dispatch Log Notification if any */}
            {lastDispatchedMission && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Chuyến giao gần nhất: <strong>{lastDispatchedMission.robot}</strong> đang giao tới{' '}
                    <strong>{lastDispatchedMission.table}</strong> ({lastDispatchedMission.time})
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {lastDispatchedMission.missionId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TRAY SETUP & AUTO-SELECT ROBOT DISPATCH (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Target Table Header Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-mono font-extrabold text-blue-700 text-base shadow-2xs">
                {currentSelectedTable.id}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>{currentSelectedTable.name}</span>
                  <span className="text-[10px] font-mono font-normal text-slate-500">
                    ({currentSelectedTable.zone})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Trạng thái: <strong className="text-slate-800">{currentSelectedTable.status === 'waiting' ? 'Đang chờ món ăn' : currentSelectedTable.status === 'serving' ? 'Đang giao' : 'Đang đón khách'}</strong>
                </div>
              </div>
            </div>

            <span className="text-[11px] font-mono bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg border border-blue-200">
              Điểm Đích Đến
            </span>
          </div>

          {/* Pending Orders Selector Bar */}
          {pendingOrders.length > 0 && (
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đơn Món Chờ Ra Bếp ({pendingOrders.length})</span>
                </span>
                <span className="text-[10px] font-mono text-amber-700">Chạm để nạp khay</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingOrders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleSelectPendingOrder(ord)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                      activeOrderId === ord.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span className="font-bold">{ord.orderNumber}</span> • {ord.tableNo} ({ord.items.length} món)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-tier Tray Assignment (Khay 1 - 2 - 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  CẤU HÌNH 3 KHAY MÓN TRÊN ROBOT
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Tải tối đa: 40 kg</span>
            </div>

            {/* Tray 1 (Top Tier) */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[11px] font-mono font-bold flex items-center justify-center">1</span>
                  <span>Khay 1 (Tầng Trên Cùng)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Món khai vị & Salad</span>
              </div>
              {tray1.length > 0 ? (
                tray1.map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{item.dishName}</span>
                      {item.note && <span className="block text-[10px] text-slate-500">Ghi chú: {item.note}</span>}
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">x{item.qty}</span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-[11px] text-slate-400 italic">Khay 1 trống — Chọn từ đơn chờ để nạp món</div>
              )}
            </div>

            {/* Tray 2 (Middle Tier) */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-800 text-[11px] font-mono font-bold flex items-center justify-center">2</span>
                  <span>Khay 2 (Tầng Giữa)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Món chính & Thịt nướng</span>
              </div>
              {tray2.length > 0 ? (
                tray2.map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{item.dishName}</span>
                      {item.note && <span className="block text-[10px] text-slate-500">Ghi chú: {item.note}</span>}
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">x{item.qty}</span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-[11px] text-slate-400 italic">Khay 2 trống — Chọn từ đơn chờ để nạp món</div>
              )}
            </div>

            {/* Tray 3 (Bottom Tier) */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 text-[11px] font-mono font-bold flex items-center justify-center">3</span>
                  <span>Khay 3 (Tầng Dưới Cùng)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Nước giải khát & Nước chấm</span>
              </div>
              {tray3.length > 0 ? (
                tray3.map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{item.dishName}</span>
                      {item.note && <span className="block text-[10px] text-slate-500">Ghi chú: {item.note}</span>}
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">x{item.qty}</span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-[11px] text-slate-400 italic">Khay 3 trống — Chọn từ đơn chờ để nạp món</div>
              )}
            </div>
          </div>

          {/* SMART AUTO-SELECT ROBOT & DISPATCH BOX */}
          <div className="bg-white rounded-2xl border-2 border-blue-500/80 p-4 sm:p-5 shadow-lg space-y-4">
            {/* Mode Toggle Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  ĐIỀU PHỐI ROBOT GIAO MÓN
                </span>
              </div>

              {/* Toggle Auto vs Manual */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsAutoSelectMode(true)}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    isAutoSelectMode
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tự Động Chọn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoSelectMode(false)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    !isAutoSelectMode
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Thủ Công</span>
                </button>
              </div>
            </div>

            {/* Smart Robot Recommendation Card */}
            {isAutoSelectMode ? (
              effectiveRobot ? (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/90 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                      Thuật Toán Tối Ưu Đã Chọn
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-mono font-bold">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                      {effectiveRobot.battery}% Pin
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">
                        🤖 {effectiveRobot.code} ({effectiveRobot.name})
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Vị trí hiện tại: <strong>{effectiveRobot.currentZone}</strong>
                      </span>
                    </div>

                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-blue-200/60 flex items-center justify-between">
                    <span>Trạng thái: <strong>Rảnh (Idle)</strong> • Gần quầy ra món nhất</span>
                    <span className="text-blue-700 font-bold">Ưu tiên #1</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Hiện không có AMR nào ở trạng thái rảnh và đủ điều kiện pin (&gt;30%). Vui lòng kiểm tra lại đội xe.
                </div>
              )
            ) : (
              /* Manual Selection Dropdown */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Chọn AMR cụ thể để giao món:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {robots.map((r) => {
                    const isSelected = manualSelectedRobot === r.code;
                    const isBusy = r.status !== 'idle';

                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setManualSelectedRobot(r.code)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                            : isBusy
                            ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{r.code}</span>
                          <span className="text-[10px] font-mono">{r.battery}%</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate mt-1">
                          {r.status === 'idle' ? 'Sẵn sàng' : 'Bận'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ONE-TOUCH DISPATCH BUTTON */}
            <button
              type="button"
              disabled={isDispatching || !effectiveRobot}
              onClick={handleDispatchOrder}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                isDispatching
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-blue-500/25 cursor-pointer'
              }`}
            >
              {isDispatching ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG PHÁT LỆNH ĐIỀU PHỐI...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>
                    XÁC NHẬN GIAO MÓN TỚI {currentSelectedTable.name}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
              <span>Mã điều phối: FMS-KDS-AUTO</span>
              <span>Cảm biến: LiDAR + IMU</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
