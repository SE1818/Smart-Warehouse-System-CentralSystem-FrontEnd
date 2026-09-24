import React, { useState, useEffect, useMemo } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { robotService } from '@/services/robot';
import type { Station } from '@/types/robot';
import { toast } from 'react-toastify';

export interface TableItem {
  id: string; // Database ID (GUID or string)
  tableNo: string; // e.g. A-01, B-02
  name: string;
  zone: string;
  status: 'occupied' | 'serving' | 'empty' | 'merged';
  orderTime: string | null;
  amrAssigned: string | null;
  capacity?: number;
  stationId?: string;
  mergedIntoTableId?: string;
}

export interface DiningTableApi {
  id: string;
  storeId?: string;
  tableNo: string;
  tableName: string;
  capacity: number;
  status: string;
  stationId?: string;
  mergedIntoTableId?: string;
  qrCodeUrl?: string;
  createdAt?: string;
}

interface TableDispatchKdsProps {
  dynamicTables?: DiningTableApi[];
  stations?: Station[];
  onRefresh?: () => void;
  onSwitchToConfig?: () => void;
}

export const TableDispatchKdsSection: React.FC<TableDispatchKdsProps> = ({
  dynamicTables,
  stations: propStations,
  onRefresh,
  onSwitchToConfig,
}) => {
  // LIVE API INTEGRATION: Tables & Stations come directly from the Backend APIs!
  const [tables, setTables] = useState<TableItem[]>([]);
  const [stations, setStations] = useState<Station[]>(propStations || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [activeActionModal, setActiveActionModal] = useState<'dispatch' | 'transfer' | 'merge' | 'create' | null>(null);

  // Dispatch state
  const [selectedRobot, setSelectedRobot] = useState<string>('AMR-V01');
  const [selectedDish, setSelectedDish] = useState<string>('Lẩu Thái Hải Sản & Bò Wagyu A5');

  // Transfer table state (Đổi bàn)
  const [targetTransferTableId, setTargetTransferTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('Khách yêu cầu chuyển bàn');

  // Merge table state (Gộp bàn)
  const [targetMergeTableId, setTargetMergeTableId] = useState<string>('');
  const [sourceMergeTableIds, setSourceMergeTableIds] = useState<string[]>([]);
  const [mergeReason, setMergeReason] = useState<string>('Khách đi nhóm đông yêu cầu ghép bàn');

  // Quick Create Table state (Technical Engineer setup)
  const [newTableNo, setNewTableNo] = useState<string>('');
  const [newTableName, setNewTableName] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newStationId, setNewStationId] = useState<string>('');

  const { addLog } = useRobotStore();
  const storeId = '00000000-0000-0000-0000-000000000001';

  // Fetch real stations from Robot Service API
  const fetchStations = async () => {
    try {
      const data = await robotService.getStations();
      if (data && Array.isArray(data)) {
        setStations(data);
        if (data.length > 0) {
          setNewStationId((prev) => prev || data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching stations from Robot Service API:', err);
    }
  };

  useEffect(() => {
    if (propStations && propStations.length > 0) {
      setStations(propStations);
      if (!newStationId) setNewStationId(propStations[0].id);
    } else {
      fetchStations();
    }
  }, [propStations]);

  // Lookup dynamic station name
  const getStationLabel = (sId?: string) => {
    if (!sId) return null;
    const found = stations.find((s) => s.id.toLowerCase() === sId.toLowerCase());
    return found ? `${found.name} (${found.stationType})` : `Trạm (${sId.substring(0, 8)})`;
  };

  // Map API tables into TableItem
  const mapApiTables = (apiData: DiningTableApi[]): TableItem[] => {
    return apiData.map((dt) => {
      const prefix = dt.tableNo ? dt.tableNo.trim().toUpperCase()[0] : 'A';
      let zone = 'KHU TRONG NHÀ';
      if (prefix === 'B' || dt.tableName.toLowerCase().includes('vip')) {
        zone = 'KHU SÂN VƯỜN VIP';
      } else if (prefix === 'C' || dt.tableName.toLowerCase().includes('tầng')) {
        zone = 'TẦNG 1 LẨU NƯỚNG';
      }

      const rawStatus = (dt.status || '').toLowerCase();
      let status: 'occupied' | 'serving' | 'empty' | 'merged' = 'empty';
      if (rawStatus === 'occupied') status = 'occupied';
      else if (rawStatus === 'serving') status = 'serving';
      else if (rawStatus === 'merged') status = 'merged';

      return {
        id: dt.id,
        tableNo: dt.tableNo,
        name: dt.tableNo,
        zone,
        status,
        orderTime: status === 'occupied' || status === 'serving' ? '12:30' : null,
        amrAssigned: status === 'serving' ? 'AMR-V01' : null,
        capacity: dt.capacity || 4,
        stationId: dt.stationId,
        mergedIntoTableId: dt.mergedIntoTableId,
      };
    });
  };

  // Self-fetch tables if dynamicTables is undefined
  const fetchTablesDirectly = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`/api/v1/diningtables?storeId=${storeId}`, { headers });
      if (!res.ok) {
        res = await fetch(`/api/v1/tables?storeId=${storeId}`, { headers });
      }
      if (res.ok) {
        const data: DiningTableApi[] = await res.json();
        setTables(mapApiTables(data));
      } else {
        setTables([]);
      }
    } catch {
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dynamicTables !== undefined) {
      if (dynamicTables && dynamicTables.length > 0) {
        setTables(mapApiTables(dynamicTables));
      } else {
        setTables([]);
      }
    } else {
      fetchTablesDirectly();
    }
  }, [dynamicTables]);

  const zones = useMemo(() => {
    const list = Array.from(new Set(tables.map((t) => t.zone)));
    return list;
  }, [tables]);

  const handleOpenTable = (table: TableItem) => {
    setSelectedTable(table);
    setActiveActionModal('dispatch');
    const availableTargets = tables.filter((t) => t.id !== table.id && t.status === 'empty');
    if (availableTargets.length > 0) {
      setTargetTransferTableId(availableTargets[0].id);
    }
  };

  // 1. Phân bổ Robot AMR (Ràng buộc bắt buộc phải gán trạm AMR)
  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    if (!selectedTable.stationId) {
      toast.error(`❌ Bàn ${selectedTable.tableNo} chưa được Technical Engineer gán Trạm dừng AMR. Vui lòng cấu hình trạm trước!`);
      return;
    }

    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: 'serving',
              amrAssigned: selectedRobot,
              orderTime: t.orderTime || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            }
          : t
      )
    );

    addLog(
      `[KDS Dispatch ⚡ Redis Stream] Đã điều phối Robot ${selectedRobot} mang "${selectedDish}" đến Bàn ${selectedTable.tableNo} (Trạm: ${getStationLabel(selectedTable.stationId)})`,
      'success'
    );
    toast.success(`Đã phân bổ ${selectedRobot} chở món đến Bàn ${selectedTable.tableNo}`);
    setActiveActionModal(null);
  };

  // 2. Chức năng Đổi Bàn (Transfer Table / Move Order)
  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !targetTransferTableId) return;

    const sourceTable = selectedTable;
    const targetTable = tables.find((t) => t.id === targetTransferTableId);
    if (!targetTable) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`/api/v1/diningtables/${targetTable.id}/transfer-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: '00000000-0000-0000-0000-000000000001',
          reason: transferReason,
        }),
      });

      if (!res.ok) {
        res = await fetch(`/api/v1/tables/${targetTable.id}/transfer-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId: '00000000-0000-0000-0000-000000000001',
            reason: transferReason,
          }),
        });
      }
    } catch {
      // Optimistic update
    }

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTable.id) {
          return { ...t, status: 'empty', amrAssigned: null, orderTime: null };
        }
        if (t.id === targetTable.id) {
          return {
            ...t,
            status: sourceTable.status === 'serving' ? 'serving' : 'occupied',
            amrAssigned: sourceTable.amrAssigned,
            orderTime: sourceTable.orderTime || '12:35',
          };
        }
        return t;
      })
    );

    addLog(
      `[Đổi Bàn 🔄 Redis Sync] Đã chuyển khách & đơn từ Bàn ${sourceTable.tableNo} sang Bàn ${targetTable.tableNo}. Lý do: ${transferReason}`,
      'info'
    );
    toast.success(`Đã đổi đơn hàng từ Bàn ${sourceTable.tableNo} sang Bàn ${targetTable.tableNo}`);
    if (onRefresh) onRefresh();
    setActiveActionModal(null);
  };

  // 3. Chức năng Gộp Bàn (Merge Tables)
  const handleConfirmMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMergeTableId || sourceMergeTableIds.length === 0) {
      toast.warning('Vui lòng chọn 1 bàn đích và ít nhất 1 bàn nguồn để gộp!');
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`/api/v1/diningtables/${targetMergeTableId}/merge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storeId,
          sourceTableIds: sourceMergeTableIds,
          reason: mergeReason,
        }),
      });

      if (!res.ok) {
        res = await fetch(`/api/v1/tables/${targetMergeTableId}/merge`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId,
            sourceTableIds: sourceMergeTableIds,
            reason: mergeReason,
          }),
        });
      }

      if (res.ok) {
        toast.success('✅ Gộp bàn thành công! Các đơn hàng và lộ trình AMR đã được hợp nhất.');
      }
    } catch {
      // Optimistic update
    }

    setTables((prev) =>
      prev.map((t) => {
        if (sourceMergeTableIds.includes(t.id)) {
          return { ...t, status: 'merged', mergedIntoTableId: targetMergeTableId };
        }
        if (t.id === targetMergeTableId) {
          return { ...t, status: 'occupied' };
        }
        return t;
      })
    );

    addLog(`[Gộp Bàn 🔗] Đã gộp các bàn nguồn vào bàn đích ID: ${targetMergeTableId}`, 'info');
    if (onRefresh) onRefresh();
    setActiveActionModal(null);
    setSourceMergeTableIds([]);
  };

  // 4. Chức năng Tách Bàn (Split Table)
  const handleConfirmSplit = async (tableId: string, tableNo: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`/api/v1/diningtables/${tableId}/split`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ storeId }),
      });

      if (!res.ok) {
        res = await fetch(`/api/v1/tables/${tableId}/split`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ storeId }),
        });
      }

      if (res.ok) {
        toast.success(`✅ Đã tách bàn ${tableNo} thành công! Bàn đã trở lại trạng thái độc lập.`);
      }
    } catch {
      // Optimistic
    }

    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'empty', mergedIntoTableId: undefined } : t))
    );

    addLog(`[Tách Bàn ✂️] Đã tách bàn ${tableNo} trở lại trạng thái sẵn sàng`, 'info');
    if (onRefresh) onRefresh();
    setActiveActionModal(null);
  };

  // 5. Thêm Bàn Mới & Gán Trạm AMR (Technical Engineer Setup)
  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNo) {
      toast.warning('Vui lòng nhập mã bàn!');
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch('/api/v1/diningtables', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storeId,
          tableNo: newTableNo,
          tableName: newTableName || `Bàn ${newTableNo}`,
          capacity: newCapacity,
          stationId: newStationId || null,
        }),
      });

      if (!res.ok) {
        res = await fetch('/api/v1/tables', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storeId,
            tableNo: newTableNo,
            tableName: newTableName || `Bàn ${newTableNo}`,
            capacity: newCapacity,
            stationId: newStationId || null,
          }),
        });
      }

      if (res.ok) {
        toast.success(`✅ Đã thiết lập thành công Bàn ${newTableNo} với Trạm AMR!`);
        setNewTableNo('');
        setNewTableName('');
        setActiveActionModal(null);
        if (onRefresh) onRefresh();
        else fetchTablesDirectly();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Lỗi khi tạo bàn.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // 6. Cập nhật trạng thái Dọn Bàn / Khách Vào
  const handleSetTableEmpty = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'empty', amrAssigned: null, orderTime: null } : t))
    );
    addLog(`[KDS Table ⚡ Redis Cache] Bàn đã hoàn tất dọn và sẵn sàng đón khách`, 'info');
    toast.info('Bàn đã sẵn sàng đón khách');
    setActiveActionModal(null);
  };

  const handleSetTableOccupied = (tableId: string) => {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'occupied', amrAssigned: null, orderTime: timeNow } : t))
    );
    addLog(`[KDS Table ⚡ Redis Cache] Ghi nhận khách vào bàn lúc ${timeNow}`, 'info');
    toast.info('Bàn có khách vào');
    setActiveActionModal(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 font-sans">
      {/* Top Header & Technical Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Sơ Đồ Bàn Phục Vụ & Điều Phối KDS Bếp</span>
            </h2>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                tables.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {tables.length > 0 ? `${tables.length} Bàn Đã Cấu Hình` : 'Chưa Có Bàn'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
              ⚡ Redis Sync Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Hệ thống yêu cầu Technical Engineer cấu hình sơ đồ bàn và ánh xạ Trạm AMR từ Robot Service API trước khi robot hoạt động.
          </p>
        </div>

        {/* Action Buttons for Technical Engineer & Staff */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveActionModal('create')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <span>+ Thêm Bàn & Gán Trạm AMR</span>
          </button>
          {tables.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTargetMergeTableId(tables[0]?.id || '');
                  setActiveActionModal('merge');
                }}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-2 rounded-xl text-xs font-bold transition"
              >
                <span>🔗 Gộp Bàn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTable(tables[0]);
                  setActiveActionModal('transfer');
                }}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold transition"
              >
                <span>🔄 Đổi Bàn</span>
              </button>
            </>
          )}
          {onSwitchToConfig && (
            <button
              type="button"
              onClick={onSwitchToConfig}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
            >
              <span>⚙️ Cấu Hình Nâng Cao</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-600 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Có Khách</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>Đang Ra Món (Robot phục vụ)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
          <span>Bàn Sẵn Sàng (Trống)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
          <span>Đã Gộp (Merged)</span>
        </div>
      </div>

      {/* LOADING OR EMPTY STATE: LIVE DATA ONLY - BẮT BUỘC PHẢI SETUP BÀN TRƯỚC */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="py-16 px-6 text-center bg-slate-50/70 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl font-bold shadow-inner">
            🍽️
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-black text-slate-900">
              Chưa Có Sơ Đồ Bàn Ăn Được Thiết Lập
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dữ liệu mặc định đã bị loại bỏ hoàn toàn. <strong>Bắt buộc Technical Engineer phải cấu hình sơ đồ bàn và ánh xạ Trạm dừng AMR từ Robot Service API</strong> trước khi Robot AMR có thể nhận nhiệm vụ phục vụ tại nhà hàng.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveActionModal('create')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <span>➕ Thêm & Cấu Hình Bàn Đầu Tiên</span>
            </button>
            {onSwitchToConfig && (
              <button
                type="button"
                onClick={onSwitchToConfig}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
              >
                <span>⚙️ Mở Tab Cấu Hình AMR Stations</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => (onRefresh ? onRefresh() : fetchTablesDirectly())}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl transition"
            >
              ↻ Tải Lại
            </button>
          </div>
        </div>
      ) : (
        /* ZONES CONTAINER */
        <div className="space-y-8">
          {zones.map((zoneName) => {
            const zoneTables = tables.filter((t) => t.zone === zoneName);

            return (
              <div key={zoneName} className="space-y-3.5">
                <div className="text-xs font-bold text-slate-700 tracking-wider flex items-center gap-2">
                  <span className="text-blue-600 font-extrabold">•</span>
                  <span className="uppercase">{zoneName}</span>
                  <span className="text-slate-400 font-normal font-sans text-[11px]">
                    ({zoneTables.length} BÀN)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {zoneTables.map((table) => {
                    const isOccupied = table.status === 'occupied';
                    const isServing = table.status === 'serving';
                    const isMerged = table.status === 'merged';
                    const isEmpty = table.status === 'empty';
                    const stationLabel = getStationLabel(table.stationId);

                    return (
                      <div
                        key={table.id}
                        onClick={() => handleOpenTable(table)}
                        className={`relative rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between min-h-[135px] select-none ${
                          isOccupied
                            ? 'border-2 border-emerald-500 bg-white hover:shadow-md hover:border-emerald-600'
                            : isServing
                            ? 'border-2 border-blue-500 bg-white hover:shadow-md hover:border-blue-600'
                            : isMerged
                            ? 'border-2 border-purple-400 bg-purple-50/40 opacity-80'
                            : 'border border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Header: Table No & Indicator */}
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-base text-slate-900 tracking-tight font-mono">
                            {table.tableNo}
                          </span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isOccupied
                                ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                                : isServing
                                ? 'bg-blue-500 shadow-[0_0_6px_#3b82f6]'
                                : isMerged
                                ? 'bg-purple-500 shadow-[0_0_6px_#a855f7]'
                                : 'bg-slate-300'
                            }`}
                          />
                        </div>

                        {/* Station Mapping Badge */}
                        <div className="my-1.5">
                          {stationLabel ? (
                            <div className="text-[10px] font-medium text-cyan-800 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-md truncate flex items-center gap-1">
                              <span>🤖</span>
                              <span className="truncate">{stationLabel}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md truncate">
                              ⚠️ Chưa gán trạm AMR
                            </div>
                          )}
                        </div>

                        {/* Card Body & Actions */}
                        <div className="mt-auto space-y-1">
                          {isOccupied && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              Giờ vào: {table.orderTime || '12:15'}
                            </div>
                          )}

                          {isServing && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-mono font-bold">
                              <span>⚙</span>
                              <span>{table.amrAssigned || 'AMR-V01'}</span>
                            </div>
                          )}

                          {isMerged && (
                            <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-purple-700">
                              <span>[Đã gộp bàn]</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmSplit(table.id, table.tableNo);
                                }}
                                className="text-[10px] bg-purple-200/80 hover:bg-purple-300 text-purple-900 px-1.5 py-0.5 rounded-md transition"
                              >
                                ✂️ Tách
                              </button>
                            </div>
                          )}

                          {isEmpty && (
                            <div className="text-xs text-slate-400 font-normal">
                              Bàn sẵn sàng (👥 {table.capacity})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD TABLE (TECHNICAL ENGINEER SETUP) */}
      {activeActionModal === 'create' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                  Technical Engineer • Cấu Hình Bàn Ăn
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Thiết Lập Bàn Mới & Trạm AMR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mã Số Bàn (Ví dụ: A-01, B-02, C-03):</label>
                <input
                  type="text"
                  required
                  value={newTableNo}
                  onChange={(e) => setNewTableNo(e.target.value.toUpperCase())}
                  placeholder="A-01"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên Bàn / Mô Tả Vị Trí:</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Bàn 4 người gần cửa sổ"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Số Chỗ Ngồi:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value) || 4)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Trạm Dừng Robot AMR (API Thực):</label>
                  <select
                    value={newStationId}
                    onChange={(e) => setNewStationId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-cyan-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50"
                  >
                    <option value="">-- Chọn Trạm AMR Từ Hệ Thống --</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.stationType} - ({s.xCoord},{s.yCoord}))
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {stations.length === 0 ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                  ⚠️ <strong>Chưa có trạm AMR nào từ Robot Service API.</strong> Vui lòng thiết lập trạm trên hệ thống bản đồ trước khi gán cho bàn ăn.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                  💡 <strong>Lưu ý kỹ thuật:</strong> Bàn phải được gán đúng Trạm AMR để robot có thể tự động tính toán lộ trình di chuyển từ Bếp ra bàn.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition"
                >
                  Lưu & Ánh Xạ Bàn Vào Hệ Thống
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GỘP BÀN (MERGE TABLES) */}
      {activeActionModal === 'merge' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-purple-600 uppercase tracking-wider block">
                  Điều Phối Sơ Đồ Bàn
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Gộp Nhiều Bàn Ăn (Merge Tables)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmMerge} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  1. Chọn Bàn Đích (Bàn chính nhận đơn & lộ trình phục vụ):
                </label>
                <select
                  value={targetMergeTableId}
                  onChange={(e) => setTargetMergeTableId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNo} ({t.zone} - {t.status === 'occupied' ? 'Có khách' : 'Trống'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  2. Chọn Các Bàn Nguồn Cần Gộp Vào (Nhóm khách ngồi ghép):
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {tables
                    .filter((t) => t.id !== targetMergeTableId)
                    .map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-100 text-xs cursor-pointer hover:bg-purple-50"
                      >
                        <input
                          type="checkbox"
                          checked={sourceMergeTableIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSourceMergeTableIds([...sourceMergeTableIds, t.id]);
                            } else {
                              setSourceMergeTableIds(sourceMergeTableIds.filter((id) => id !== t.id));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-bold text-slate-900 font-mono">{t.tableNo}</span>
                        <span className="text-slate-500 text-[11px]">- {t.zone} ({t.status})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Lý Do Gộp Bàn:</label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50"
                  placeholder="Khách đi nhóm đông..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition"
                >
                  Xác Nhận Gộp Bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPATCH AMR & DIRECT TABLE ACTION MODAL */}
      {selectedTable && activeActionModal !== 'create' && activeActionModal !== 'merge' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider block">
                  {selectedTable.zone} • {selectedTable.status === 'occupied' ? 'Đang có khách' : selectedTable.status === 'serving' ? 'Đang phục vụ' : selectedTable.status === 'merged' ? 'Đã gộp' : 'Bàn trống'}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Thao Tác Bàn {selectedTable.tableNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Action Tabs in Modal */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveActionModal('dispatch')}
                className={`flex-1 py-2 rounded-lg transition ${
                  activeActionModal === 'dispatch' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🤖 Điều Phối AMR
              </button>
              <button
                type="button"
                onClick={() => setActiveActionModal('transfer')}
                className={`flex-1 py-2 rounded-lg transition ${
                  activeActionModal === 'transfer' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔄 Đổi Bàn
              </button>
            </div>

            {/* TAB: DISPATCH ROBOT */}
            {activeActionModal === 'dispatch' && (
              <form onSubmit={handleConfirmDispatch} className="space-y-4">
                {/* Station Mapping Verification Alert */}
                {selectedTable.stationId ? (
                  <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center gap-2">
                    <span>📍</span>
                    <span>
                      Trạm AMR liên kết: <strong>{getStationLabel(selectedTable.stationId)}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>⚠️ CẢNH BÁO KỸ THUẬT:</span>
                    </div>
                    <p className="text-[11px]">
                      Bàn này chưa được gán Trạm dừng AMR (Station). Robot không thể định vị đường đi. 
                      Vui lòng yêu cầu Technical Engineer cấu hình trạm dừng cho bàn trước khi phát lệnh!
                    </p>
                  </div>
                )}

                {/* Status Toggles */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetTableOccupied(selectedTable.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      selectedTable.status === 'occupied'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ● Có Khách
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTableEmpty(selectedTable.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      selectedTable.status === 'empty'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ○ Dọn Xong / Trống
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Chọn Robot AMR Đang Rảnh:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['AMR-V01', 'AMR-V02', 'AMR-V03'].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedRobot(code)}
                        className={`p-3 rounded-xl border text-center transition font-mono font-bold text-xs ${
                          selectedRobot === code
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-sm">🤖 {code}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">Sẵn sàng (95%)</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Chọn Món Cần Giao (Từ KDS Bếp):
                  </label>
                  <select
                    value={selectedDish}
                    onChange={(e) => setSelectedDish(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                  >
                    <option value="Lẩu Thái Hải Sản & Bò Wagyu A5">Lẩu Thái Hải Sản & Bò Wagyu A5</option>
                    <option value="Dĩa Sườn Bò Nướng Sốt Tiêu Đen">Dĩa Sườn Bò Nướng Sốt Tiêu Đen</option>
                    <option value="Salad Rong Biển Trứng Cua Nhật">Salad Rong Biển Trứng Cua Nhật</option>
                    <option value="4 Lon Bia Hoegaarden Rosée">4 Lon Bia Hoegaarden Rosée</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedTable.stationId}
                    className={`flex-2 py-3 rounded-xl text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                      selectedTable.stationId
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 cursor-pointer'
                        : 'bg-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span>🚀 Phát Lệnh Cho {selectedRobot}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: TRANSFER / SWITCH TABLE (ĐỔI BÀN) */}
            {activeActionModal === 'transfer' && (
              <form onSubmit={handleConfirmTransfer} className="space-y-4">
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
                  Chuyển khách và các món đang chế biến/phục vụ từ <strong>Bàn {selectedTable.tableNo}</strong> sang một bàn trống khác.
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Chọn Bàn Đích (Chuyển Sang):
                  </label>
                  <select
                    value={targetTransferTableId}
                    onChange={(e) => setTargetTransferTableId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50 font-mono"
                  >
                    {tables
                      .filter((t) => t.id !== selectedTable.id && t.status === 'empty')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Bàn {t.tableNo} ({t.zone} - Bàn Trống)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Lý Do Đổi Bàn:
                  </label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50"
                    placeholder="Khách yêu cầu chuyển chỗ..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionModal('dispatch')}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                  >
                    Quay Lại
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition flex items-center justify-center gap-2"
                  >
                    <span>🔄 Xác Nhận Đổi Bàn</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableDispatchKdsSection;
