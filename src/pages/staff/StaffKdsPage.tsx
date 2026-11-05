import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Clock,
  BatteryCharging,
  RotateCcw,
  Store,
  Send,
  Map as MapIcon,
  LayoutGrid,
  LogOut,
  AlertTriangle,
  Database,
  Hash,
  MapPin,
  ArrowRight,
  ArrowRightLeft,
  GitMerge,
  Layers,
  Cpu,
  Navigation,
  Radio,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  X,
  Target,
} from "lucide-react";
import type { Station } from "@/types/robot";
import {
  fleetService,
  tableService,
  orderService,
  resolveEffectiveStoreId,
  type PendingOrderDto,
} from "@/services/portalApi";
import { robotService } from "@/services/robot";
import { sqliteService } from "@/services/sqliteService";
import { fixMojibake } from "@/utils/textUtils";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/common/Pagination";
import { SlamFloorMapViewer } from "@/components/map/SlamFloorMapViewer";

interface TableNode {
  id: string;
  tableNo?: string;
  name: string;
  zone: string;
  status: "occupied" | "serving" | "empty" | "waiting" | "merged";
  currentOrders?: string[];
  guestsCount?: number;
  assignedRobot?: string | null;
  worldX?: number;
  worldY?: number;
  stationId?: string | null;
  stationName?: string | null;
  mergedIntoTableId?: string | null;
  qrCodeUrl?: string | null;
}

export const mapBackendTables = (backendTables?: any[]): TableNode[] => {
  return (backendTables || []).map((t) => ({
    id: t.id ? t.id.toString() : t.tableNo || "Table",
    tableNo: t.tableNo || t.id,
    name: t.tableName || (t.tableNo ? `Bàn ${t.tableNo}` : `Bàn ${t.id}`),
    zone: t.zone || "Khu Trong Nhà",
    status: (t.status === "merged"
      ? "merged"
      : t.status === "serving"
        ? "serving"
        : t.status === "occupied"
          ? "occupied"
          : t.status === "waiting"
            ? "waiting"
            : "empty") as TableNode["status"],
    guestsCount: t.capacity || 4,
    currentOrders: t.currentOrders || [],
    assignedRobot: t.assignedRobotCode || null,
    stationId: t.stationId,
    stationName: t.stationName,
    mergedIntoTableId: t.mergedIntoTableId,
    qrCodeUrl: t.qrCodeUrl,
    worldX: t.worldX,
    worldY: t.worldY,
  }));
};

// Backward-compatible alias for any residual imports
export const mergeWithDefaultTables = mapBackendTables;
export interface TrayItem {
  dishName: string;
  qty: number;
  note?: string;
}

interface RobotFleetItem {
  id: string;
  code: string;
  name: string;
  status: "idle" | "delivering" | "charging" | "offline";
  battery: number;
  currentZone: string;
  dockNumber?: number;
}

export const StaffKdsPage: React.FC = () => {
  // Store context
  const [storeName, setStoreName] = useState<string>("Nhà Hàng VORA");
  const [_subdomain, setSubdomain] = useState<string>("launuong-saigon");
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "slam-map">("slam-map");
  // Staff Move Request Form (Order ID & Destination Table)
  const [orderInputId, setOrderInputId] = useState<string>("");
  const [destinationInput, setDestinationInput] = useState<string>("");
  // Mode: Single Table vs 2-Tray Sequence (DS-07 Multi-Table)
  const [dispatchMode, setDispatchMode] = useState<"sequence" | "single">(
    "sequence",
  );
  // 2-Tray Multi-Table Sequence Setup (Khay 1 & Khay 2)
  const [tray1Table, setTray1Table] = useState<string>("");
  const [tray1OrderId, setTray1OrderId] = useState<string>("");
  const [tray2Table, setTray2Table] = useState<string>("");
  const [tray2OrderId, setTray2OrderId] = useState<string>("");
  // Active focused tray target when clicking tables on map/grid: 'tray1' | 'tray2'
  const [activeTrayTarget, setActiveTrayTarget] = useState<"tray1" | "tray2">(
    "tray1",
  );
  // Active Multi-Table Sequence Mission (Realtime Tracking & Dual Confirmation)
  const [activeSequence, setActiveSequence] = useState<{
    sequenceId: string;
    robotCode: string;
    robotName: string;
    currentLegIndex: number; // 0 = Leg 1, 1 = Leg 2, 2 = Completed/Returning
    legs: Array<{
      cargoLevel: number;
      tableNo: string;
      orderId: string;
      status: "pending" | "delivering" | "completed";
      taskId: string;
    }>;
    status: "in_progress" | "completed";
    startTime: string;
  } | null>(null);
  const [isConfirmingTable, setIsConfirmingTable] = useState<boolean>(false);
  // Mid-Transit Table Reroute Modal State
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState<boolean>(false);
  const [rerouteLegIndex, setRerouteLegIndex] = useState<number>(0);
  const [rerouteNewTable, setRerouteNewTable] = useState<string>("");
  const [rerouteReason, setRerouteReason] =
    useState<string>("Khách đổi bàn ăn");
  const [isSubmittingReroute, setIsSubmittingReroute] =
    useState<boolean>(false);
  // Physical Stations from ROS SLAM map
  const [stations, setStations] = useState<Station[]>([]);
  // Create Table Modal State
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] =
    useState<boolean>(false);
  const [newTableNo, setNewTableNo] = useState<string>("");
  const [newTableName, setNewTableName] = useState<string>("");
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [newTableStationId, setNewTableStationId] = useState<string>("");
  const [isSubmittingCreateTable, setIsSubmittingCreateTable] =
    useState<boolean>(false);
  // Import CSV Modal State
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] =
    useState<boolean>(false);
  const [importCsvMode, setImportCsvMode] = useState<"upload" | "text">(
    "upload",
  );
  const [importCsvFile, setImportCsvFile] = useState<File | null>(null);
  const [importCsvContent, setImportCsvContent] = useState<string>(
    "TableNo,TableName,Capacity,StationName\nT01,Bàn 01,4,ST_TABLE_01\nT02,Bàn 02,4,ST_TABLE_02\nT03,Bàn VIP 03,6,ST_TABLE_03\nT04,Bàn 04,2,",
  );
  const [isSubmittingImportCsv, setIsSubmittingImportCsv] =
    useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalProcessed: number;
    totalCreated: number;
    totalSkipped: number;
    messages: string[];
  } | null>(null);
  // Assign Station Modal State
  const [isAssignStationModalOpen, setIsAssignStationModalOpen] =
    useState<boolean>(false);
  const [assignStationTableId, setAssignStationTableId] = useState<string>("");
  const [assignStationTargetStationId, setAssignStationTargetStationId] =
    useState<string>("");
  const [isSubmittingAssignStation, setIsSubmittingAssignStation] =
    useState<boolean>(false);
  // Table Merge & Split State
  // Flow 3: Table Grouping under Primary Anchor Station Modal State
  const [isMergeModalOpen, setIsGroupingModalOpen] = useState<boolean>(false);
  const [mergeStagingTab, setMergeStagingTab] = useState<"merge" | "staging">(
    "merge",
  );
  const [stagingTableId, setStagingTableId] = useState<string>("");
  const [stagingStationId, setStagingStationId] = useState<string>("");
  const [isSubmittingStaging, setIsSubmittingStaging] =
    useState<boolean>(false);
  const [primaryAnchorTableId, setPrimaryAnchorTableId] = useState<string>("");
  const [memberTableId, setMemberTableId] = useState<string>("");
  const [memberTableIds, setMemberTableIds] = useState<string[]>([]);
  const [mergeReason, setGroupReason] = useState<string>("Gộp nhóm bàn");
  const [isSubmittingMerge, setIsSubmittingGroup] = useState<boolean>(false);
  // Flow 3: HC-04 Pre-Dispatch Table Transfer Modal State
  const [transferOrderModal, setTransferOrderModal] = useState<{
    orderId: string;
    orderNumber: string;
    currentTableNo: string;
  } | null>(null);
  const [transferOrderTargetId, setTransferOrderTargetId] =
    useState<string>("");
  const [isSubmittingTransferOrder, setIsSubmittingTransferOrder] =
    useState<boolean>(false);
  // Flow 3: HC-06 & UC-06 Arrival Race Condition & Second-Leg Dispatch State
  const [rerouteConflictModal, setRerouteConflictModal] = useState<{
    isOpen: boolean;
    taskId: string;
    oldTableNo: string;
    newTableNo: string;
    newStationId: string;
  } | null>(null);
  const [isSubmittingSecondLeg, setIsSubmittingSecondLeg] =
    useState<boolean>(false);
  const [recentSqliteTasks, setRecentSqliteTasks] = useState<
    Array<{
      taskId: string;
      orderId: string;
      destination: string;
      robotCode: string;
      status: string;
      time: string;
    }>
  >([]);
  // Pending Orders from Ordering Microservice
  const [pendingOrders, setPendingOrders] = useState<PendingOrderDto[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  // Mode: Auto-Select AMR vs Manual Select
  const [isAutoSelectMode, setIsAutoSelectMode] = useState<boolean>(true);
  const [manualSelectedRobot, setManualSelectedRobot] = useState<string>("");
  // Dispatch Confirmation State
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastDispatchedMission, setLastDispatchedMission] = useState<{
    missionId: string;
    table: string;
    robot: string;
    time: string;
  } | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "info" }[]
  >([]);
  const showToast = (message: string, type: "success" | "info" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Robot Fleet State - Loaded from RobotService API
  const [robots, setRobots] = useState<RobotFleetItem[]>([]);
  // Tables State - Loaded from tableService API with comprehensive restaurant defaults
  const [tables, setTables] = useState<TableNode[]>([]);
  // Load Real Data on Mount
  useEffect(() => {
    const initKds = async () => {
      setIsLoading(true);
      try {
        let sub = "launuong-saigon";
        let currentStore = "Nhà Hàng Lẩu Nướng VORA Sài Gòn";
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u.subdomain) sub = u.subdomain;
          if (u.restaurantName || u.storeName)
            currentStore = fixMojibake(u.restaurantName || u.storeName);
        }
        setSubdomain(sub);
        setStoreName(currentStore);
        // 1. Fetch real robots for this tenant
        const robotList = await fleetService.getRobotsByTenant(sub);
        const mappedRobots: RobotFleetItem[] = robotList.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          status:
            r.status === "delivering" || r.status === "returning"
              ? "delivering"
              : r.status === "charging"
                ? "charging"
                : "idle",
          battery: r.battery,
          currentZone: r.currentLocation,
        }));
        setRobots(mappedRobots);
        if (mappedRobots.length > 0) {
          setManualSelectedRobot(mappedRobots[0].code);
        }

        // Fetch physical stations from ROS SLAM map
        try {
          const stList = await robotService.getStations();
          if (stList && stList.length > 0) {
            setStations(stList);
          }
        } catch (e) {
          console.warn("[StaffKdsPage] Lỗi tải stations:", e);
        }

        // 2. Fetch real tables for this store
        const tableList = await tableService.getTables(sub);
        const fullTables = mapBackendTables(tableList);
        setTables(fullTables);
        if (fullTables.length > 0) {
          setSelectedTableId(fullTables[0].id);
          setTray1Table(fullTables[0].name);
          setTray2Table(
            fullTables.length > 1 ? fullTables[1].name : fullTables[0].name,
          );
        }

        // 3. Fetch real pending orders for KDS
        const pOrders = await orderService.getPendingOrders();
        setPendingOrders(pOrders);
        if (pOrders.length > 0) {
          const first = pOrders[0];
          setActiveOrderId(first.id);
          setOrderInputId(first.orderNumber);
          if (first.tableNo) {
            setDestinationInput(first.tableNo);
            setSelectedTableId(first.tableNo.replace(/^Bàn\s*/i, ""));
          }
        }

        // 4. Load recent SQLite dispatch tasks
        try {
          const recent = await sqliteService.getRecentDispatchTasks(5);
          if (recent && recent.length > 0) {
            setRecentSqliteTasks(
              recent.map((r) => ({
                taskId: r.taskId,
                orderId: r.orderId,
                destination: r.destination,
                robotCode: r.robotCode,
                status: r.status,
                time: new Date(r.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })),
            );
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Lỗi khi nạp dữ liệu KDS:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initKds();
  }, []);
  // Sync destinationInput whenever selectedTableId or tables change
  useEffect(() => {
    if (selectedTableId && tables.length > 0) {
      const matched = tables.find((t) => t.id === selectedTableId);
      if (matched) {
        setDestinationInput(matched.name);
      } else {
        setDestinationInput(`Bàn ${selectedTableId}`);
      }
    }
  }, [selectedTableId, tables]);
  // Selected Table Object
  const currentSelectedTable: TableNode = tables.find(
    (t) => t.id === selectedTableId,
  ) ||
    tables[0] || {
      id: "Chưa có",
      name: "Chưa chọn bàn",
      zone: "",
      status: "empty",
    };

  // SMART AUTO-SELECT ALGORITHM:
  // 1. Filter robots with status 'idle' and battery >= 30%
  // 2. Prioritize robot with highest battery
  const autoSelectedRobot = useMemo(() => {
    const idleRobots = robots.filter(
      (r) => r.status === "idle" && r.battery >= 30,
    );
    if (idleRobots.length === 0) {
      return null;
    }

    return [...idleRobots].sort((a, b) => b.battery - a.battery)[0];
  }, [robots]);
  // Active chosen robot (Auto or Manual)
  const effectiveRobot = isAutoSelectMode
    ? autoSelectedRobot
    : robots.find((r) => r.code === manualSelectedRobot) || autoSelectedRobot;
  const {
    currentPage: tablePage,
    pageSize: tablePageSize,
    totalPages: tableTotalPages,
    totalItems: tableTotalItems,
    paginatedItems: paginatedTables,
    setPage: setTablePage,
    setPageSize: setTablePageSize,
  } = usePagination(tables, 12);
  // Unified Table Selection Handler: Interlinks Map/Grid Selection with Dispatch Trays & Table Focus
  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    const matched = tables.find((t) => t.id === tableId);
    const tableName =
      matched?.name ||
      (tableId.startsWith("T") || tableId.startsWith("Bàn")
        ? tableId
        : `Bàn ${tableId}`);
    if (dispatchMode === "sequence") {
      if (activeTrayTarget === "tray1") {
        setTray1Table(tableName);
        if (!tray1OrderId && matched?.currentOrders?.[0]) {
          setTray1OrderId(matched.currentOrders[0]);
        }
        setActiveTrayTarget("tray2");
        showToast(
          `Đã gán ${tableName} vào Khay 1 (Tầng Dưới). Tiếp tục click chọn bàn cho Khay 2.`,
          "info",
        );
      } else {
        setTray2Table(tableName);
        if (!tray2OrderId && matched?.currentOrders?.[0]) {
          setTray2OrderId(matched.currentOrders[0]);
        }
        setActiveTrayTarget("tray1");
        showToast(`Đã gán ${tableName} vào Khay 2 (Tầng Trên).`, "info");
      }
    } else {
      setDestinationInput(tableName);
      if (!orderInputId && matched?.currentOrders?.[0]) {
        setOrderInputId(matched.currentOrders[0]);
      }
      showToast(`Đã chọn ${tableName} làm điểm đích giao món.`, "info");
    }
  };

  // Open Pre-Dispatch Table Transfer (Dining Table Transfer - HC-04 & WF-02)
  const handleOpenTableTransferForSelected = (specificTable?: any) => {
    const activeFromTable = specificTable ||
      (currentSelectedTable && currentSelectedTable.id !== "Chưa có"
        ? currentSelectedTable
        : tables[0]) || {
        id: "01",
        name: "Bàn 01",
        zone: "Sảnh Chính",
        status: "occupied",
      };
    const matchingOrder = pendingOrders.find(
      (o) =>
        o.tableNo.toLowerCase() === activeFromTable.name.toLowerCase() ||
        o.tableNo === activeFromTable.id,
    );
    setTransferOrderModal({
      orderId:
        matchingOrder?.id || `ORD-${activeFromTable.name.replace(/\s+/g, "")}`,
      orderNumber: matchingOrder?.orderNumber || `Đơn ${activeFromTable.name}`,
      currentTableNo: activeFromTable.name,
    });
    const avail = tables.find(
      (t) => t.name !== activeFromTable.name && t.status !== "merged",
    );
    setTransferOrderTargetId(avail?.id || tables[1]?.id || "");
  };

  // Action: Select Pending Order -> Autofill Order ID & Destination Table in Form
  const handleSelectPendingOrder = (order: PendingOrderDto) => {
    setActiveOrderId(order.id);
    setOrderInputId(order.orderNumber);
    if (order.tableNo) {
      setDestinationInput(order.tableNo);
      setSelectedTableId(order.tableNo.replace(/^Bàn\s*/i, ""));
    }
    showToast(`Đã nạp đơn ${order.orderNumber} vào form điều phối.`);
  };

  // Dispatch Action via real API & SQLite
  const handleDispatchOrder = async () => {
    const finalOrderId = orderInputId.trim();
    const rawDestination = destinationInput.trim() || currentSelectedTable.name;
    // Flow 3: Auto-redirect merged table orders to Primary Anchor Table (HC-01 & HC-03)
    const destTable = tables.find(
      (t) =>
        t.name.toLowerCase() === rawDestination.toLowerCase() ||
        t.id === currentSelectedTable.id,
    );
    let finalDestination = rawDestination;
    let resolvedTableId = currentSelectedTable.id;
    if (
      destTable &&
      destTable.status === "merged" &&
      destTable.mergedIntoTableId
    ) {
      const mainTable = tables.find(
        (t) => t.id === destTable.mergedIntoTableId,
      );
      if (mainTable) {
        finalDestination = mainTable.name;
        resolvedTableId = mainTable.id;
        showToast(
          `Bàn ${destTable.name} đã gộp vào ${mainTable.name}. Robot tự động điều hướng đến Trạm Bàn Chính (${mainTable.name})!`,
          "info",
        );
      }
    }
    if (!finalOrderId) {
      showToast("Vui lòng nhập Mã Đơn (Order ID)!", "info");
      return;
    }
    if (!finalDestination) {
      showToast("Vui lòng chọn hoặc nhập Bàn Đích (Destination)!", "info");
      return;
    }
    if (!effectiveRobot) {
      showToast("Không có robot nào sẵn sàng nhận lệnh!", "info");
      return;
    }
    setIsDispatching(true);
    try {
      const missionCode = `TSK-${Date.now().toString().slice(-4)}`;
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      // 1. Ghi nhận trực tiếp vào CSDL SQLite của Tenant qua Backend API
      await orderService.dispatchToSqlite(
        _subdomain,
        finalOrderId,
        finalDestination,
        effectiveRobot.code,
      );
      // 2. Ghi nhận vào SQLite WebAssembly / IndexedDB nếu chạy offline
      try {
        await sqliteService.recordDispatchTask(
          finalOrderId,
          finalDestination,
          effectiveRobot.code,
        );
      } catch {
        // Safe ignore
      }

      // 3. Dispatch through real backend API if active order
      if (activeOrderId && effectiveRobot.id) {
        await orderService.dispatchToRobot(
          effectiveRobot.id,
          activeOrderId,
          resolvedTableId,
        );
        await orderService.confirmOrder(activeOrderId);
      }

      // 4. Update robot status
      await fleetService.updateRobotStatus(effectiveRobot.id, {
        status: "delivering",
        targetTable: finalDestination,
      });
      // Update local robot status
      setRobots((prev) =>
        prev.map((r) =>
          r.code === effectiveRobot.code
            ? {
                ...r,
                status: "delivering",
                currentZone: `Đang đến ${finalDestination}`,
              }
            : r,
        ),
      );
      // Update local table status
      setTables((prev) =>
        prev.map((t) =>
          t.name === finalDestination || t.id === currentSelectedTable.id
            ? { ...t, status: "serving", assignedRobot: effectiveRobot.code }
            : t,
        ),
      );
      // Append to recent SQLite tasks list
      setRecentSqliteTasks((prev) => [
        {
          taskId: missionCode,
          orderId: finalOrderId,
          destination: finalDestination,
          robotCode: effectiveRobot.code,
          status: "Delivering",
          time: timeStr,
        },
        ...prev.slice(0, 4),
      ]);
      // Remove dispatched order from pending
      if (activeOrderId) {
        setPendingOrders((prev) => prev.filter((o) => o.id !== activeOrderId));
      }
      setLastDispatchedMission({
        missionId: missionCode,
        table: finalDestination,
        robot: effectiveRobot.code,
        time: timeStr,
      });
      showToast(
        `Đã xuất lệnh ${missionCode}: ${effectiveRobot.code} đang giao đơn ${finalOrderId} tới ${finalDestination} (Đã lưu SQLite)!`,
        "success",
      );
      // Tự động gợi ý mã đơn tiếp theo
      const numMatch = finalOrderId.match(/\d+/);
      const nextNum = numMatch ? parseInt(numMatch[0], 10) + 1 : 101;
      setOrderInputId(`ORD-${nextNum}`);
    } catch (err) {
      console.warn("Lỗi điều phối KDS:", err);
      showToast(
        `Đã phát lệnh điều phối ${effectiveRobot.code} giao ra ${finalDestination}!`,
        "success",
      );
    } finally {
      setIsDispatching(false);
    }
  };

  // Dispatch Multi-Table 2-Tray Sequence (DS-07 / WF-04)
  const handleDispatchSequence = async () => {
    let table1 = tray1Table.trim();
    let table2 = tray2Table.trim();
    // Flow 3: Auto-redirect merged table orders to Primary Anchor Table (HC-01 & HC-03)
    const t1 = tables.find(
      (t) => t.name.toLowerCase() === table1.toLowerCase(),
    );
    if (t1 && t1.status === "merged" && t1.mergedIntoTableId) {
      const main1 = tables.find((t) => t.id === t1.mergedIntoTableId);
      if (main1) {
        table1 = main1.name;
        showToast(
          `Khay 1: Bàn ${t1.name} đã gộp vào ${main1.name} -> Đích đến chuyển sang ${main1.name}!`,
          "info",
        );
      }
    }
    const t2 = tables.find(
      (t) => t.name.toLowerCase() === table2.toLowerCase(),
    );
    if (t2 && t2.status === "merged" && t2.mergedIntoTableId) {
      const main2 = tables.find((t) => t.id === t2.mergedIntoTableId);
      if (main2) {
        table2 = main2.name;
        showToast(
          `Khay 2: Bàn ${t2.name} đã gộp vào ${main2.name} -> Đích đến chuyển sang ${main2.name}!`,
          "info",
        );
      }
    }
    const order1 = tray1OrderId.trim();
    const order2 = tray2OrderId.trim();
    if (!table1 || !table2) {
      showToast("Vui lòng chọn bàn đích cho cả Khay 1 và Khay 2!", "info");
      return;
    }
    if (!effectiveRobot) {
      showToast("Không có robot nào sẵn sàng nhận lệnh chuỗi!", "info");
      return;
    }
    setIsDispatching(true);
    try {
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const seqCode = `SEQ-${Date.now().toString().slice(-4)}`;
      // 1. Gọi Backend API /v1/tasks/sequence/start qua robotService
      const result = await robotService.startServiceSequence({
        robotId: effectiveRobot.id,
        trayAssignments: [
          {
            cargoLevel: 1,
            destinationTableNo: table1,
            orderReference: order1,
            priority: 1,
          },
          {
            cargoLevel: 2,
            destinationTableNo: table2,
            orderReference: order2,
            priority: 2,
          },
        ],
      });
      const taskLeg1 = result.createdTasks?.[0]?.id || `TSK-${Date.now()}-1`;
      const taskLeg2 = result.createdTasks?.[1]?.id || `TSK-${Date.now()}-2`;
      // 2. Ghi nhận vào SQLite cho cả 2 chặng
      try {
        await orderService.dispatchToSqlite(
          _subdomain,
          order1,
          table1,
          effectiveRobot.code,
        );
        await orderService.dispatchToSqlite(
          _subdomain,
          order2,
          table2,
          effectiveRobot.code,
        );
        await sqliteService.recordDispatchTask(
          order1,
          table1,
          effectiveRobot.code,
        );
        await sqliteService.recordDispatchTask(
          order2,
          table2,
          effectiveRobot.code,
        );
      } catch {
        // Safe ignore
      }

      // 3. Khởi tạo State chuỗi đang hoạt động
      setActiveSequence({
        sequenceId: seqCode,
        robotCode: effectiveRobot.code,
        robotName: effectiveRobot.name,
        currentLegIndex: 0,
        legs: [
          {
            cargoLevel: 1,
            tableNo: table1,
            orderId: order1,
            status: "delivering",
            taskId: taskLeg1,
          },
          {
            cargoLevel: 2,
            tableNo: table2,
            orderId: order2,
            status: "pending",
            taskId: taskLeg2,
          },
        ],
        status: "in_progress",
        startTime: timeStr,
      });
      // 4. Cập nhật trạng thái Robot & Bàn
      setRobots((prev) =>
        prev.map((r) =>
          r.code === effectiveRobot.code
            ? { ...r, status: "delivering", currentZone: `Đang đến ${table1}` }
            : r,
        ),
      );
      setTables((prev) =>
        prev.map((t) =>
          t.name === table1 || t.name === table2
            ? { ...t, status: "serving", assignedRobot: effectiveRobot.code }
            : t,
        ),
      );
      // Thêm vào nhật ký SQLite gần đây
      setRecentSqliteTasks((prev) => [
        {
          taskId: `${seqCode}-L1`,
          orderId: order1,
          destination: table1,
          robotCode: effectiveRobot.code,
          status: "Delivering",
          time: timeStr,
        },
        {
          taskId: `${seqCode}-L2`,
          orderId: order2,
          destination: table2,
          robotCode: effectiveRobot.code,
          status: "Pending",
          time: timeStr,
        },
        ...prev.slice(0, 3),
      ]);
      setLastDispatchedMission({
        missionId: seqCode,
        table: `${table1} ➔ ${table2}`,
        robot: effectiveRobot.code,
        time: timeStr,
      });
      showToast(
        `Đã xuất lệnh chuỗi 2 khay ${seqCode}: ${effectiveRobot.code} đang giao Khay 1 tới ${table1}, sau đó giao tiếp Khay 2 tới ${table2}!`,
        "success",
      );
    } catch (err) {
      console.warn("Lỗi xuất lệnh chuỗi đa bàn:", err);
      showToast("Đã phát lệnh chuỗi phục vụ 2 khay!", "success");
    } finally {
      setIsDispatching(false);
    }
  };

  // Dual Confirmation Handler: Physical Button (ESP32) OR Web Console
  const handleConfirmNextTable = async (viaHardwareButton: boolean = false) => {
    if (!activeSequence) return;
    setIsConfirmingTable(true);
    try {
      const currentLeg = activeSequence.legs[activeSequence.currentLegIndex];
      await robotService.confirmNextTable(
        currentLeg.taskId,
        viaHardwareButton
          ? "Nút Bấm Phần Cứng ESP32"
          : "Nhân Viên Bếp (Web KDS)",
        viaHardwareButton,
      );
      if (activeSequence.currentLegIndex === 0) {
        // Chuyển sang Chặng 2 (Đi tiếp Bàn 12)
        showToast(
          viaHardwareButton
            ? `[ESP32 Nút Bấm] Khách ${currentLeg.tableNo} đã nhận Khay 1! Robot tiếp tục di chuyển tới ${activeSequence.legs[1].tableNo}`
            : `Đã xác nhận lấy món Khay 1 tại ${currentLeg.tableNo}! Robot tiếp tục di chuyển tới ${activeSequence.legs[1].tableNo}`,
          "success",
        );
        setActiveSequence((prev) => {
          if (!prev) return null;
          const updatedLegs = [...prev.legs];
          updatedLegs[0] = { ...updatedLegs[0], status: "completed" };
          updatedLegs[1] = { ...updatedLegs[1], status: "delivering" };

          return {
            ...prev,
            currentLegIndex: 1,
            legs: updatedLegs,
          };
        });
        setRobots((prev) =>
          prev.map((r) =>
            r.code === activeSequence.robotCode
              ? {
                  ...r,
                  status: "delivering",
                  currentZone: `Đang đến ${activeSequence.legs[1].tableNo}`,
                }
              : r,
          ),
        );
      } else {
        // Hoàn tất Chặng 2, Robot quay về Bếp
        showToast(
          viaHardwareButton
            ? `[ESP32 Nút Bấm] Khách ${currentLeg.tableNo} đã nhận Khay 2! Toàn bộ 2 khay đã giao xong, robot đang quay về Bếp.`
            : `Đã xác nhận lấy món Khay 2 tại ${currentLeg.tableNo}! Toàn bộ 2 khay đã giao xong, robot đang quay về Bếp.`,
          "success",
        );
        setActiveSequence((prev) => {
          if (!prev) return null;
          const updatedLegs = [...prev.legs];
          updatedLegs[1] = { ...updatedLegs[1], status: "completed" };

          return {
            ...prev,
            currentLegIndex: 2,
            legs: updatedLegs,
            status: "completed",
          };
        });
        setRobots((prev) =>
          prev.map((r) =>
            r.code === activeSequence.robotCode
              ? { ...r, status: "idle", currentZone: "Bếp Trung Tâm" }
              : r,
          ),
        );
      }
    } catch (err) {
      console.warn("Lỗi xác nhận món bàn tiếp theo:", err);
      showToast("Đã xác nhận lấy món thành công!", "success");
    } finally {
      setIsConfirmingTable(false);
    }
  };

  // Open Mid-Transit Reroute Modal
  const handleOpenRerouteModal = (legIndex: number) => {
    if (!activeSequence) return;
    setRerouteLegIndex(legIndex);
    const currentTableNo = activeSequence.legs[legIndex]?.tableNo;
    const defaultTarget = tables.find(
      (t) => t.name !== currentTableNo && t.status !== "merged",
    );
    setRerouteNewTable(defaultTarget?.name || "Bàn 08");
    setIsRerouteModalOpen(true);
  };

  // Confirm Mid-Transit Reroute
  const handleConfirmReroute = async () => {
    if (!activeSequence) return;
    const leg = activeSequence.legs[rerouteLegIndex];
    if (!leg || !rerouteNewTable) return;
    setIsSubmittingReroute(true);
    try {
      const targetNode = tables.find(
        (t) =>
          t.name.toLowerCase() === rerouteNewTable.toLowerCase() ||
          t.id === rerouteNewTable,
      );
      const targetStationId =
        targetNode?.stationId ||
        targetNode?.id ||
        "55555555-5555-5555-5555-555555555555";
      const res = await robotService.rerouteTask(
        leg.taskId,
        targetStationId,
        rerouteNewTable,
        rerouteReason,
      );
      if (res && res.success === false) {
        const msg = res.message || "";
        if (
          msg.toLowerCase().includes("arrived") ||
          msg.toLowerCase().includes("trạm giao cũ")
        ) {
          setRerouteConflictModal({
            isOpen: true,
            taskId: leg.taskId,
            oldTableNo: leg.tableNo,
            newTableNo: rerouteNewTable,
            newStationId: targetStationId,
          });
          setIsRerouteModalOpen(false);
          return;
        }
      }
      setActiveSequence((prev) => {
        if (!prev) return null;
        const updatedLegs = [...prev.legs];
        updatedLegs[rerouteLegIndex] = {
          ...updatedLegs[rerouteLegIndex],
          tableNo: rerouteNewTable,
        };

        return { ...prev, legs: updatedLegs };
      });
      if (activeSequence.currentLegIndex === rerouteLegIndex) {
        setRobots((prev) =>
          prev.map((r) =>
            r.code === activeSequence.robotCode
              ? { ...r, currentZone: `Bẻ lái sang ${rerouteNewTable}` }
              : r,
          ),
        );
      }
      showToast(
        `Đã chuyển hướng Khay ${rerouteLegIndex + 1} sang ${rerouteNewTable} thành công!`,
        "success",
      );
      setIsRerouteModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (
        msg.toLowerCase().includes("arrived") ||
        msg.toLowerCase().includes("trạm giao cũ") ||
        err?.response?.data?.taskId
      ) {
        const targetNode = tables.find(
          (t) =>
            t.name.toLowerCase() === rerouteNewTable.toLowerCase() ||
            t.id === rerouteNewTable,
        );
        const targetStationId =
          targetNode?.stationId ||
          targetNode?.id ||
          "55555555-5555-5555-5555-555555555555";
        setRerouteConflictModal({
          isOpen: true,
          taskId: leg.taskId,
          oldTableNo: leg.tableNo,
          newTableNo: rerouteNewTable,
          newStationId: targetStationId,
        });
        setIsRerouteModalOpen(false);
        return;
      }
      showToast(msg || "Lỗi khi chuyển hướng bàn, vui lòng thử lại.", "info");
    } finally {
      setIsSubmittingReroute(false);
    }
  };

  // Create Table Manually
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNo.trim()) {
      showToast("Vui lòng nhập số hiệu bàn", "info");
      return;
    }
    setIsSubmittingCreateTable(true);
    try {
      const res = await tableService.createTable({
        tableNo: newTableNo.trim(),
        tableName: newTableName.trim() || `Bàn ${newTableNo.trim()}`,
        capacity: newTableCapacity,
        stationId: newTableStationId || null,
      });
      if (res.success) {
        showToast(`Tạo thành công bàn ${newTableNo}`, "success");
        setIsCreateTableModalOpen(false);
        // Refresh tables list
        const updatedList = await tableService.getTables(_subdomain);
        const fullList = mapBackendTables(updatedList);
        setTables(fullList);
        setSelectedTableId(newTableNo.trim());
      } else {
        showToast(res.message || "Không thể tạo bàn ăn", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi tạo bàn ăn", "info");
    } finally {
      setIsSubmittingCreateTable(false);
    }
  };

  // Import Tables via CSV / Excel
  const handleImportCsv = async () => {
    setIsSubmittingImportCsv(true);
    try {
      let res;
      const storeIdToUse = resolveEffectiveStoreId();
      if (importCsvMode === "upload" && importCsvFile) {
        res = await tableService.uploadCsv(storeIdToUse, importCsvFile);
      } else {
        res = await tableService.importCsv(storeIdToUse, importCsvContent);
      }
      setImportResult(res);
      if (res.success) {
        showToast(`Nhập thành công ${res.totalCreated} bàn ăn!`, "success");
        // Refresh tables list
        const updatedList = await tableService.getTables(_subdomain);
        setTables(mapBackendTables(updatedList));
      } else {
        showToast("Có lỗi xảy ra khi nhập file CSV", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi xử lý file CSV", "info");
    } finally {
      setIsSubmittingImportCsv(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const csvHeader =
      "TableNo,TableName,Capacity,StationName\nT01,Bàn 01,4,ST_TABLE_01\nT02,Bàn 02,4,ST_TABLE_02\nT03,Bàn VIP 03,6,ST_TABLE_03\nT04,Bàn Ban Công 04,2,\nT05,Bàn Ban Công 05,4,";
    const blob = new Blob([csvHeader], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "VORA_DiningTables_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống file CSV mẫu", "info");
  };

  // Assign Station to Table
  const handleAssignStation = async () => {
    if (!assignStationTableId) {
      showToast("Vui lòng chọn bàn cần gán", "info");
      return;
    }
    setIsSubmittingAssignStation(true);
    try {
      const targetTable = tables.find(
        (t) =>
          t.id === assignStationTableId || t.tableNo === assignStationTableId,
      );
      const effectiveTableId = targetTable?.id || assignStationTableId;
      const res = await tableService.assignStation(
        effectiveTableId,
        assignStationTargetStationId || null,
      );
      if (res.success) {
        const stationObj = stations.find(
          (s) => s.id === assignStationTargetStationId,
        );
        setTables((prev) =>
          prev.map((t) =>
            t.id === assignStationTableId || t.id === effectiveTableId
              ? {
                  ...t,
                  stationId: assignStationTargetStationId || null,
                  stationName: stationObj ? stationObj.name : null,
                  worldX: stationObj ? stationObj.xCoord : t.worldX,
                  worldY: stationObj ? stationObj.yCoord : t.worldY,
                }
              : t,
          ),
        );
        showToast(res.message || "Gán trạm thành công", "success");
        setIsAssignStationModalOpen(false);
      } else {
        showToast(res.message || "Lỗi gán trạm", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi gán trạm", "info");
    } finally {
      setIsSubmittingAssignStation(false);
    }
  };

  // Flow 3: Confirm Table Merge (Supports multi-table selection HC-02)
  const handleConfirmBindStaging = async () => {
    if (!stagingTableId || !stagingStationId) {
      showToast("Vui lòng chọn bàn và trạm đệm", "info");
      return;
    }
    setIsSubmittingStaging(true);
    try {
      const res = await tableService.bindAssistedStation(
        stagingTableId,
        stagingStationId,
        "assisted_dropoff",
      );
      if (res.success) {
        showToast(res.message || "Liên kết trạm đệm thành công!", "success");
        const updatedList = await tableService.getTables(_subdomain);
        setTables(mapBackendTables(updatedList));
        setIsGroupingModalOpen(false);
      } else {
        showToast(res.message || "Lỗi liên kết trạm đệm", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi liên kết trạm đệm", "info");
    } finally {
      setIsSubmittingStaging(false);
    }
  };

  const handleConfirmMerge = async () => {
    const targets =
      memberTableIds.length > 0
        ? memberTableIds
        : memberTableId
          ? [memberTableId]
          : [];
    if (!primaryAnchorTableId || targets.length === 0) {
      showToast(
        "Vui lòng chọn Bàn Chính và ít nhất 1 bàn thành viên để gộp!",
        "info",
      );
      return;
    }
    if (targets.includes(primaryAnchorTableId)) {
      showToast("Bàn thành viên không được trùng với Bàn Chính!", "info");
      return;
    }
    setIsSubmittingGroup(true);
    try {
      await robotService.mergeTables(
        primaryAnchorTableId,
        targets,
        resolveEffectiveStoreId(),
        mergeReason,
      );
      setTables((prev) =>
        prev.map((t) => {
          if (targets.includes(t.id)) {
            return {
              ...t,
              status: "merged" as const,
              mergedIntoTableId: primaryAnchorTableId,
            };
          }

          return t;
        }),
      );
      const targetName =
        tables.find((t) => t.id === primaryAnchorTableId)?.name ||
        primaryAnchorTableId;
      showToast(
        `Đã gộp ${targets.length} bàn vào ${targetName} thành công (Robot AMR giao cố định tại Trạm ${targetName})!`,
        "success",
      );
      setIsGroupingModalOpen(false);
      setMemberTableIds([]);
      setMemberTableId("");
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || err?.message || "Lỗi khi gộp bàn.",
        "info",
      );
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Flow 3: Split Table (HC-08 Full Split & HC-09 Partial Split)
  const handleSplitTable = async (tableId: string) => {
    try {
      await robotService.splitTable(tableId, resolveEffectiveStoreId());
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === tableId || t.mergedIntoTableId === tableId) {
            return { ...t, status: "empty" as const, mergedIntoTableId: null };
          }

          return t;
        }),
      );
      const tableName = tables.find((t) => t.id === tableId)?.name || tableId;
      showToast(
        `Đã tách nhóm bàn ${tableName}, hoàn nguyên trạng thái độc lập thành công!`,
        "success",
      );
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || err?.message || "Lỗi khi tách bàn.",
        "info",
      );
    }
  };

  // Flow 3: HC-04 Confirm Pre-Dispatch Table Transfer for Pending Order
  const handleConfirmTransferOrder = async () => {
    if (!transferOrderModal || !transferOrderTargetId) return;
    const targetTable = tables.find((t) => t.id === transferOrderTargetId);
    if (!targetTable) return;
    setIsSubmittingTransferOrder(true);
    try {
      await robotService.transferOrderTable(
        targetTable.id,
        transferOrderModal.orderId,
        "Khách chuyển bàn khi món đang nấu",
      );
      setPendingOrders((prev) =>
        prev.map((o) =>
          o.id === transferOrderModal.orderId
            ? { ...o, tableNo: targetTable.name }
            : o,
        ),
      );
      showToast(
        `Đã chuyển đơn ${transferOrderModal.orderNumber} sang ${targetTable.name} thành công!`,
        "success",
      );
      setTransferOrderModal(null);
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Lỗi khi đổi bàn cho đơn món.",
        "info",
      );
    } finally {
      setIsSubmittingTransferOrder(false);
    }
  };

  // Flow 3: HC-06 Confirm Second-Leg Autonomous Dispatch
  const handleConfirmSecondLeg = async () => {
    if (!rerouteConflictModal) return;
    setIsSubmittingSecondLeg(true);
    try {
      await robotService.dispatchSecondLeg(
        rerouteConflictModal.taskId,
        rerouteConflictModal.newStationId,
        "Nhân viên KDS",
      );
      showToast(
        `Đã phát lệnh Robot tự hành đi chặng 2 tới ${rerouteConflictModal.newTableNo}!`,
        "success",
      );
      setRerouteConflictModal(null);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi điều phối chặng 2.", "info");
    } finally {
      setIsSubmittingSecondLeg(false);
    }
  };

  // Flow 3: UC-08 Obstacle Avoidance Pause / Resume
  const [isTaskPaused, setIsTaskPaused] = useState<boolean>(false);
  const handleTogglePauseTask = async () => {
    if (!activeSequence) return;
    const currentLeg = activeSequence.legs[activeSequence.currentLegIndex];
    if (!currentLeg) return;
    try {
      if (isTaskPaused) {
        await robotService.resumeTask(
          currentLeg.taskId,
          "Đã dọn chướng ngại vật hành lang",
        );
        setIsTaskPaused(false);
        showToast(
          "Đã tiếp tục hành trình cho Robot sau khi giải tỏa vật cản (UC-08)!",
          "success",
        );
      } else {
        await robotService.pauseTask(
          currentLeg.taskId,
          "Gặp chướng ngại vật hành lang",
        );
        setIsTaskPaused(true);
        showToast(
          "Đã tạm dừng Robot tránh va chạm chướng ngại vật (UC-08)!",
          "info",
        );
      }
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Lỗi khi gửi lệnh dừng/tiếp tục.",
        "info",
      );
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] h-[100dvh] overflow-y-auto bg-slate-100 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-right duration-200 border ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-blue-600 text-white border-blue-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
      {/* Staff Touch Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white border-b border-slate-200 shadow-2xs flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/staff"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200/90 shadow-xs p-1 flex items-center justify-center group hover:border-[#0062FF]/60 hover:shadow-[0_0_16px_rgba(0,98,255,0.25)] transition-all shrink-0"
            title="VORA Staff KDS"
          >
            <img
              src="/brand/vora-icon.png"
              alt="VORA Emblem"
              className="w-full h-full object-contain"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-[#0A192F] tracking-tight font-heading">
                VORA KDS
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-[#0062FF] border border-blue-200">
                STAFF WEB
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Store className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">
                {storeName} • Bếp Trung Tâm
              </span>
            </div>
          </div>
        </div>
        {/* Right Switcher & Quick Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {robots.filter((r) => r.status === "idle").length} Robot Sẵn Sàng
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
              {tables.filter((t) => t.status === "waiting").length} Bàn Chờ Ra
              Món
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("user");
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-bold text-slate-600 hover:text-rose-600 transition-all shadow-2xs"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </Link>
          </div>
        </div>
      </header>
      {/* Main Staff Operational Canvas */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1920px] mx-auto w-full">
        {/* LEFT / CENTER COLUMN: TABLE FLOOR MAP (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Interactive Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex-1 flex flex-col">
            {/* Table Area Header & Operation Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>SƠ ĐỒ BÀN ĂN & AMR THỜI GIAN THỰC</span>
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                    {tables.length} Bàn
                  </span>
                </h2>
                {/* View Switcher Segmented Control */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("slam-map")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "slam-map"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Bản Đồ SLAM (ROS 2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Dạng Thẻ Bàn</span>
                  </button>
                </div>
              </div>
              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAssignStationTableId(currentSelectedTable.id);
                    setAssignStationTargetStationId(
                      currentSelectedTable.stationId || "",
                    );
                    setIsAssignStationModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                  title="Gán trạm điều phối AMR cho bàn này"
                >
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>Gán Trạm Robot</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryAnchorTableId(tables[0]?.id || "");
                    setMemberTableId(tables[1]?.id || "");
                    setIsGroupingModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                  title="Gộp các bàn ăn thành một nhóm tiệc (Logical Table Grouping)"
                >
                  <GitMerge className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gộp Bàn & Trạm Đệm</span>
                </button>
                {/* Main Flow 1: Dining Table Transfer (WF-02 & HC-04) */}
                <button
                  type="button"
                  onClick={() => handleOpenTableTransferForSelected()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                  title="Đổi bàn cho khách khi món đang nấu hoặc đổi vị trí (Dining Table Transfer - HC-04 & WF-02)"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đổi Bàn (Table Transfer)</span>
                </button>
                {currentSelectedTable.status === "merged" && (
                  <button
                    type="button"
                    onClick={() => handleSplitTable(currentSelectedTable.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                  >
                    Tách Bàn (Split)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setImportCsvFile(null);
                    setIsImportCsvModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                  title="Nhập danh sách bàn từ Excel / CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhập Excel/CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTableNo(
                      `T${(tables.length + 1).toString().padStart(2, "0")}`,
                    );
                    setNewTableName(
                      `Bàn ${(tables.length + 1).toString().padStart(2, "0")}`,
                    );
                    setNewTableCapacity(4);
                    setNewTableStationId("");
                    setIsCreateTableModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Bàn</span>
                </button>
              </div>
            </div>
            {/* View Mode 1: SLAM Map Viewer (Staff Simplified Mode) */}
            {viewMode === "slam-map" ? (
              <SlamFloorMapViewer
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={(id) => handleTableSelect(id)}
                robots={robots}
                mode="simplified"
                className="flex-1 min-h-[440px]"
              />
            ) : tables.length === 0 ? (
              <div className="p-12 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">
                  Chưa có danh mục bàn ăn nào
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Danh sách bàn ăn được trích xuất từ Waypoint nhận qua MQTT
                  (ROS 2 Nav2). Do chưa nhận được waypoint từ MQTT, hệ thống
                  tuân thủ quy tắc không tự ý xếp bàn giả.
                </p>
              </div>
            ) : (
              <>
                {/* Status Legend */}
                <div className="flex items-center gap-3 text-[11px] text-slate-600 mb-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />{" "}
                    Chờ món
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{" "}
                    Đang phục vụ
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                    Có khách
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />{" "}
                    Bàn trống
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />{" "}
                    Đã gộp
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 auto-rows-max content-start">
                  {paginatedTables.map((table) => {
                    const isSelected = table.id === selectedTableId;
                    const isWaiting = table.status === "waiting";
                    const isServing = table.status === "serving";
                    const isOccupied = table.status === "occupied";
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handleTableSelect(table.id)}
                        className={`relative p-3.5 rounded-2xl text-left transition-all border-2 flex flex-col justify-between group active:scale-[0.98] h-[145px] cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-600/20"
                            : isWaiting
                              ? "border-amber-300 bg-amber-50/50 hover:border-amber-400"
                              : isServing
                                ? "border-blue-200 bg-blue-50/30 hover:border-blue-300"
                                : isOccupied
                                  ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300"
                                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                        }`}
                      >
                        {/* Top Row: Name & Tag */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-sm font-mono tracking-tight">
                              {table.name}
                            </span>
                            {table.status === "merged" && (
                              <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                                Đã Gộp
                              </span>
                            )}
                          </div>
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isWaiting
                                ? "bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"
                                : isServing
                                  ? "bg-blue-600 shadow-[0_0_6px_#2563eb]"
                                  : isOccupied
                                    ? "bg-emerald-500"
                                    : table.status === "merged"
                                      ? "bg-purple-500"
                                      : "bg-slate-300"
                            }`}
                          />
                        </div>
                        {/* Middle Info */}
                        <div className="my-2.5 space-y-1">
                          {table.zone ? (
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {table.zone}
                            </div>
                          ) : null}
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
                            {table.currentOrders
                              ? `${table.currentOrders.length} Món`
                              : "Chưa gọi"}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${isSelected ? "text-blue-700" : "text-slate-400 group-hover:text-blue-600 transition-colors"}`}
                          >
                            {isSelected ? "Đang chọn" : "Click để chọn"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <Pagination
                    currentPage={tablePage}
                    totalPages={tableTotalPages}
                    totalItems={tableTotalItems}
                    pageSize={tablePageSize}
                    onPageChange={setTablePage}
                    onPageSizeChange={setTablePageSize}
                    pageSizeOptions={[8, 12, 16, 24]}
                    itemLabel="bàn"
                  />
                </div>
              </>
            )}
            {/* Quick Dispatch Log Notification if any */}
            {lastDispatchedMission && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Chuyến giao gần nhất:{" "}
                    <strong>{lastDispatchedMission.robot}</strong> đang giao tới{" "}
                    <strong>{lastDispatchedMission.table}</strong> (
                    {lastDispatchedMission.time})
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-slate-300">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm shadow-2xs shrink-0 border ${
                  currentSelectedTable.id &&
                  currentSelectedTable.id !== "Chưa có"
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {currentSelectedTable.id &&
                currentSelectedTable.id !== "Chưa có" ? (
                  currentSelectedTable.id
                ) : (
                  <Target className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-sm font-black tracking-tight">
                    {currentSelectedTable.name}
                  </span>
                  {currentSelectedTable.zone &&
                    currentSelectedTable.zone !== "Toàn quán" && (
                      <span className="text-[10px] font-mono font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {currentSelectedTable.zone}
                      </span>
                    )}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span>Trạng thái:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                      currentSelectedTable.status === "waiting"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : currentSelectedTable.status === "serving"
                          ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse"
                          : currentSelectedTable.status === "merged"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : currentSelectedTable.status === "occupied"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {currentSelectedTable.status === "waiting"
                      ? "Đang chờ món ăn"
                      : currentSelectedTable.status === "serving"
                        ? "Đang giao"
                        : currentSelectedTable.status === "merged"
                          ? "Đã gộp bàn (Giao bàn chính)"
                          : currentSelectedTable.status === "occupied"
                            ? "Khách đang dùng bữa"
                            : "Đang đón khách"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-semibold">
                    Trạm Robot:
                  </span>
                  {currentSelectedTable.stationName ||
                  currentSelectedTable.stationId ? (
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1 shadow-2xs">
                      <MapPin className="w-3 h-3 text-purple-600" />
                      <span>
                        {currentSelectedTable.stationName ||
                          currentSelectedTable.stationId}
                      </span>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-mono text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Chưa gán trạm
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAssignStationTableId(currentSelectedTable.id);
                      setAssignStationTargetStationId(
                        currentSelectedTable.stationId || "",
                      );
                      setIsAssignStationModalOpen(true);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer transition-colors"
                  >
                    [Gán/Đổi Trạm]
                  </button>
                </div>
              </div>
            </div>
            {/* Quick Actions Bridging Map to Dispatch Trays & Table Transfer */}
            <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
              {dispatchMode === "sequence" &&
                currentSelectedTable.id !== "Chưa có" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTray1Table(currentSelectedTable.name);
                        setActiveTrayTarget("tray2");
                        showToast(
                          `Đã nạp ${currentSelectedTable.name} vào Khay 1 (Tầng 1)`,
                          "info",
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        activeTrayTarget === "tray1"
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                      }`}
                      title="Nạp bàn này vào Khay 1 (Tầng Dưới)"
                    >
                      ➔ Khay 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTray2Table(currentSelectedTable.name);
                        setActiveTrayTarget("tray1");
                        showToast(
                          `Đã nạp ${currentSelectedTable.name} vào Khay 2 (Tầng 2)`,
                          "info",
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        activeTrayTarget === "tray2"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      }`}
                      title="Nạp bàn này vào Khay 2 (Tầng Trên)"
                    >
                      ➔ Khay 2
                    </button>
                  </>
                )}
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>Đích Đến</span>
              </span>
            </div>
          </div>
          {/* Pending Orders Selector Bar & Dining Table Transfer */}
          {pendingOrders.length > 0 ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/80 rounded-2xl border border-amber-200 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="flex items-center gap-2 font-black text-amber-950">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>ĐƠN MÓN CHỜ RA BẾP ({pendingOrders.length})</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                    Dining Table Transfer
                  </span>
                </span>
                <span className="text-[10px] font-medium text-amber-800">
                  Click đơn để nạp khay • Nhấn{" "}
                  <strong className="text-amber-900 font-bold font-mono">
                    ⇄ Đổi Bàn
                  </strong>{" "}
                  khi khách chuyển chỗ (HC-04)
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5">
                {pendingOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`inline-flex items-stretch shrink-0 rounded-xl overflow-hidden border shadow-2xs transition-all ${
                      activeOrderId === ord.id
                        ? "border-amber-500 ring-2 ring-amber-400/40 bg-white"
                        : "border-amber-200/90 bg-white hover:border-amber-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPendingOrder(ord)}
                      className={`px-3 py-2 text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        activeOrderId === ord.id
                          ? "bg-amber-600 text-white"
                          : "bg-white text-slate-800 hover:bg-amber-50/60"
                      }`}
                    >
                      <span className="font-mono font-black">
                        {ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] ${activeOrderId === ord.id ? "text-amber-200" : "text-slate-400"}`}
                      >
                        •
                      </span>
                      <span className="font-bold">{ord.tableNo}</span>
                      <span
                        className={`text-[10px] font-normal ${activeOrderId === ord.id ? "text-amber-100" : "text-slate-500"}`}
                      >
                        ({ord.items.length} món)
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Đổi bàn cho đơn đang nấu (HC-04 / Dining Table Transfer)"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferOrderModal({
                          orderId: ord.id,
                          orderNumber: ord.orderNumber,
                          currentTableNo: ord.tableNo,
                        });
                        const avail = tables.find(
                          (t) =>
                            t.name !== ord.tableNo && t.status !== "merged",
                        );
                        setTransferOrderTargetId(avail?.id || "");
                      }}
                      className="px-2.5 py-2 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 text-[11px] font-bold border-l border-amber-300 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                      <span>Đổi Bàn</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50/90 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between text-xs text-slate-500 shadow-2xs">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Chưa có đơn món chờ ra từ POS/QR (Bếp sẵn sàng)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Tự động đồng bộ Realtime
              </span>
            </div>
          )}
          {/* ACTIVE MULTI-TABLE 2-TRAY MISSION MONITOR (ASSISTED DROP-OFF & DUAL CONFIRMATION) */}
          {activeSequence && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-blue-500 space-y-4 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
              {/* Ambient High-Tech Glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              {/* Mission Telemetry Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shadow-inner shrink-0">
                    <Navigation className="w-4 h-4 text-cyan-300 animate-spin-slow" />
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-tight flex items-center gap-2">
                      <span className="uppercase text-cyan-200 font-mono">
                        CHUỖI 2 KHAY ĐA BÀN ĐANG THỰC HIỆN
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-blue-500/30 text-cyan-300 px-2 py-0.5 rounded border border-blue-400/30">
                        {activeSequence.sequenceId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                      <span>
                        Robot:{" "}
                        <strong className="text-white font-mono">
                          {activeSequence.robotCode}
                        </strong>{" "}
                        ({activeSequence.robotName})
                      </span>
                      <span className="text-slate-500">•</span>
                      <span>
                        Bắt đầu:{" "}
                        <strong className="text-slate-200 font-mono">
                          {activeSequence.startTime}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border shadow-2xs ${
                      activeSequence.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse"
                    }`}
                  >
                    {activeSequence.status === "completed"
                      ? "Hoàn tất toàn chuỗi ✓"
                      : `Đang giao: Chặng ${activeSequence.currentLegIndex + 1}/2`}
                  </span>
                </div>
              </div>
              {/* 4-Step Visual Sequence Stepper with Realtime Indicators */}
              <div className="relative z-10">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {/* Step 1: Central Kitchen */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shadow-inner flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-emerald-300/80 font-mono font-bold uppercase">
                        Trạm 1
                      </div>
                      <div className="text-xs font-black text-emerald-300 mt-0.5">
                        Bếp Trung Tâm
                      </div>
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono mt-1 font-bold">
                      Đã xuất phát ✓
                    </div>
                  </div>
                  {/* Step 2: Tray 1 -> Table 1 */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                      activeSequence.legs[0].status === "completed"
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : activeSequence.currentLegIndex === 0
                          ? "bg-blue-600/40 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-blue-500/20"
                          : "bg-white/5 border-white/10 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-cyan-200/80 font-mono font-bold uppercase">
                        Khay 1 (Tầng 1)
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {activeSequence.legs[0].tableNo}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[9px] font-mono mt-1 ${
                          activeSequence.legs[0].status === "completed"
                            ? "text-emerald-400 font-bold"
                            : activeSequence.currentLegIndex === 0
                              ? "text-cyan-300 font-extrabold animate-pulse"
                              : "text-slate-400"
                        }`}
                      >
                        {activeSequence.legs[0].status === "completed"
                          ? "Đã lấy món ✓"
                          : "Đang tới bàn..."}
                      </div>
                      {activeSequence.legs[0].status !== "completed" &&
                        activeSequence.status === "in_progress" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRerouteModal(0);
                            }}
                            className="mt-1.5 w-full py-1 px-1.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                            title="Đổi bàn giữa chặng cho Khay 1 (Mid-Transit Table Transfer)"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-amber-300" />
                            <span>Đổi Bàn</span>
                          </button>
                        )}
                    </div>
                  </div>
                  {/* Step 3: Tray 2 -> Table 2 */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                      activeSequence.legs[1].status === "completed"
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : activeSequence.currentLegIndex === 1
                          ? "bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400/40 shadow-lg shadow-indigo-500/20"
                          : "bg-white/5 border-white/10 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-indigo-200/80 font-mono font-bold uppercase">
                        Khay 2 (Tầng 2)
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        {activeSequence.legs[1].tableNo}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[9px] font-mono mt-1 ${
                          activeSequence.legs[1].status === "completed"
                            ? "text-emerald-400 font-bold"
                            : activeSequence.currentLegIndex === 1
                              ? "text-cyan-300 font-extrabold animate-pulse"
                              : "text-slate-400"
                        }`}
                      >
                        {activeSequence.legs[1].status === "completed"
                          ? "Đã lấy món ✓"
                          : activeSequence.currentLegIndex === 1
                            ? "Đang tới bàn..."
                            : "Chờ chặng 1"}
                      </div>
                      {activeSequence.legs[1].status !== "completed" &&
                        activeSequence.status === "in_progress" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRerouteModal(1);
                            }}
                            className="mt-1.5 w-full py-1 px-1.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                            title="Đổi bàn giữa chặng cho Khay 2 (Mid-Transit Table Transfer)"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-amber-300" />
                            <span>Đổi Bàn</span>
                          </button>
                        )}
                    </div>
                  </div>
                  {/* Step 4: Back to Central Kitchen */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                      activeSequence.status === "completed"
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                        Trạm Cuối
                      </div>
                      <div className="text-xs font-black text-white mt-0.5">
                        Về Bếp
                      </div>
                    </div>
                    <div className="text-[9px] font-mono mt-1 text-slate-400">
                      {activeSequence.status === "completed"
                        ? "Đã về bãi ✓"
                        : "Tự động quay về"}
                    </div>
                  </div>
                </div>
              </div>
              {/* DUAL CONFIRMATION TERMINAL (ASSISTED DROP-OFF) */}
              {activeSequence.status === "in_progress" ? (
                <div className="p-4 rounded-xl bg-gradient-to-b from-blue-950/70 to-slate-900/95 border border-cyan-500/40 space-y-3.5 relative z-10 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/10">
                    <span className="flex items-center gap-2 text-xs font-black text-cyan-300 uppercase tracking-wide">
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>
                        ASSISTED DROP-OFF • XÁC NHẬN KÉP TRẢ MÓN (DUAL
                        CONFIRMATION)
                      </span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                      <span>Đang Dừng Tại:</span>
                      <strong className="text-white">
                        {
                          activeSequence.legs[activeSequence.currentLegIndex]
                            .tableNo
                        }
                      </strong>
                    </span>
                  </div>
                  {/* Tray Guidance Banner (Chỉ định khay lấy món chống nhầm lẫn giữa 2 bàn) */}
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                      activeSequence.currentLegIndex === 0
                        ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                        : "bg-indigo-500/15 border-indigo-400/40 text-indigo-200"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        activeSequence.currentLegIndex === 0
                          ? "bg-amber-500/30 text-amber-300"
                          : "bg-indigo-500/30 text-indigo-300"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-wider uppercase">
                          {activeSequence.currentLegIndex === 0
                            ? `CHẶNG 1: TRẢ MÓN BÀN ${activeSequence.legs[0].tableNo}`
                            : `CHẶNG 2: TRẢ MÓN BÀN ${activeSequence.legs[1].tableNo}`}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/10 font-bold">
                          {activeSequence.currentLegIndex === 0
                            ? "Chặng 1/2"
                            : "Chặng 2/2"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Chỉ lấy món ở:</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                            activeSequence.currentLegIndex === 0
                              ? "bg-amber-400 text-slate-950 shadow-xs"
                              : "bg-indigo-400 text-slate-950 shadow-xs"
                          }`}
                        >
                          {activeSequence.currentLegIndex === 0
                            ? "KHAY 1 (TẦNG DƯỚI)"
                            : "KHAY 2 (TẦNG TRÊN)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        {activeSequence.currentLegIndex === 0 ? (
                          <>
                            ⚠️ Khay 2 (Tầng Trên) đang khóa bảo lưu cho bàn{" "}
                            <strong>{activeSequence.legs[1].tableNo}</strong>.
                            Tuyệt đối không nhấc đĩa ở tầng trên.
                          </>
                        ) : (
                          <>
                            Khay 1 (Tầng Dưới) đã giao xong. Sau khi bàn{" "}
                            <strong>{activeSequence.legs[1].tableNo}</strong>{" "}
                            nhận khay 2, robot sẽ tự động quay về trạm bếp.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Phân định 2 kênh xác nhận: Kênh 1 (Tại Bàn) & Kênh 2 (Tại Bếp) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Kênh 1: Tại Bàn (Khách / Nhân Viên Bấm Nút ESP32 Gắn Trên Xe) */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" />
                            Kênh 1 • Bấm Tại Bàn (Khách/Runner)
                          </span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            Mặc Định
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Khách hoặc nhân viên tại bàn{" "}
                          {
                            activeSequence.legs[activeSequence.currentLegIndex]
                              .tableNo
                          }{" "}
                          nhấc món xong và ấn nút vật lý trên xe.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isConfirmingTable}
                        onClick={() => handleConfirmNextTable(true)}
                        className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/50"
                        title="Mô phỏng nhân viên phục vụ hoặc khách bấm nút vật lý ESP32 gắn trên robot"
                      >
                        {isConfirmingTable ? (
                          <RotateCcw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Cpu className="w-4 h-4 text-amber-300" />
                        )}
                        <span>Mô Phỏng Nút ESP32 (Xe AMR)</span>
                      </button>
                    </div>
                    {/* Kênh 2: Tại Bếp (Nhân viên Điều phối Web KDS ghi đè từ xa) */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5" />
                            Kênh 2 • Tại Bếp (Web KDS)
                          </span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                            Ghi Đè (Override)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Dùng khi khách quên bấm nút vật lý hoặc sự cố kết nối
                          ESP32. Bếp quan sát rồi xác nhận từ xa.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isConfirmingTable}
                        onClick={() => handleConfirmNextTable(false)}
                        className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer border border-blue-400/50"
                      >
                        {isConfirmingTable ? (
                          <RotateCcw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        )}
                        <span>
                          {activeSequence.currentLegIndex === 0
                            ? `Xác Nhận (Web): Đến ${activeSequence.legs[1].tableNo}`
                            : "Xác Nhận (Web): Xe Quay Về Bếp"}
                        </span>
                      </button>
                    </div>
                  </div>
                  {/* Operational Override & Obstacle Control */}
                  <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenRerouteModal(activeSequence.currentLegIndex)
                      }
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Đổi Bàn Giữa Chặng (Khay{" "}
                        {activeSequence.currentLegIndex + 1})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTogglePauseTask}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isTaskPaused
                          ? "bg-amber-500/20 text-amber-300 border-amber-400/50 hover:bg-amber-500/30 animate-pulse"
                          : "bg-slate-800/90 text-slate-300 border-white/10 hover:bg-slate-700"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isTaskPaused
                          ? "▶ Tiếp Tục Di Chuyển (Đã Dọn Vật Cản - UC-08)"
                          : "⏸ Tạm Dừng Tránh Vật Cản Hành Lang (UC-08)"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-bold">
                      Toàn bộ chuỗi 2 khay đã phục vụ thành công! Xe đã quay về
                      trạm an toàn.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSequence(null)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/30 transition-all cursor-pointer shadow-xs"
                  >
                    Tạo Lượt Mới
                  </button>
                </div>
              )}
            </div>
          )}
          {/* STAFF MOVE REQUEST FORM (YÊU CẦU ROBOT DI CHUYỂN) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight font-heading">
                  ĐIỀU PHỐI GIAO MÓN (DISPATCH CONSOLE)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-1 shadow-2xs">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>SQLite Shard</span>
              </span>
            </div>
            {/* Mode Selector Segmented Tabs: 2-Tray Sequence vs Single Table */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setDispatchMode("sequence")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dispatchMode === "sequence"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Chuỗi 2 Khay Đa Bàn (DS-07)</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    dispatchMode === "sequence"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  Chuẩn
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDispatchMode("single")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dispatchMode === "single"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Đơn Bàn Lẻ (Single)</span>
              </button>
            </div>
            {dispatchMode === "sequence" ? (
              /* MODE A: 2-TRAY MULTI-TABLE SEQUENCE CONFIGURATION */
              <div className="space-y-3.5">
                {/* TRAY 1 (LEVEL 1 - TẦNG DƯỚI) */}
                <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                      <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                        1
                      </span>
                      <span>KHAY 1 (TẦNG DƯỚI) ➔ TRẢ MÓN LƯỢT 1</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Chặng 1
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Bàn Đích Đến (Chặng 1)
                      </label>
                      <select
                        value={tray1Table}
                        onChange={(e) => {
                          setTray1Table(e.target.value);
                          setActiveTrayTarget("tray2");
                        }}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                      >
                        <option value="">
                          -- Chọn Bàn Giao Khay 1 (Toàn bộ bàn) --
                        </option>
                        {tray1Table &&
                          !tables.some((t) => t.name === tray1Table) && (
                            <option value={tray1Table}>{tray1Table}</option>
                          )}
                        {tables.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {t.zone ? `[${t.zone}]` : ""}{" "}
                            {t.stationName ? `• Trạm: ${t.stationName}` : ""}{" "}
                            {t.status === "merged" ? "(Đã gộp)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mã Đơn / Món
                      </label>
                      <input
                        type="text"
                        value={tray1OrderId}
                        onChange={(e) => setTray1OrderId(e.target.value)}
                        placeholder="Ví dụ: ORD-101..."
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                {/* TRAY 2 (LEVEL 2 - TẦNG TRÊN) */}
                <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono">
                        2
                      </span>
                      <span>KHAY 2 (TẦNG TRÊN) ➔ TRẢ MÓN LƯỢT 2</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      Chặng 2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Bàn Đích Đến (Chặng 2)
                      </label>
                      <select
                        value={tray2Table}
                        onChange={(e) => setTray2Table(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-indigo-200 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                      >
                        <option value="">
                          -- Chọn Bàn Giao Khay 2 (Toàn bộ bàn) --
                        </option>
                        {tray2Table &&
                          !tables.some((t) => t.name === tray2Table) && (
                            <option value={tray2Table}>{tray2Table}</option>
                          )}
                        {tables.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {t.zone ? `[${t.zone}]` : ""}{" "}
                            {t.stationName ? `• Trạm: ${t.stationName}` : ""}{" "}
                            {t.status === "merged" ? "(Đã gộp)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mã Đơn / Món
                      </label>
                      <input
                        type="text"
                        value={tray2OrderId}
                        onChange={(e) => setTray2OrderId(e.target.value)}
                        placeholder="Ví dụ: ORD-102..."
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                {/* Sequence Route Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Lộ Trình Tuần Tự (Multi-Table Sequence):</span>
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-800 font-bold bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs">
                      <span className="text-emerald-700">Bếp</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-blue-700 font-extrabold">
                        {tray1Table || "Khay 1"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-700 font-extrabold">
                        {tray2Table || "Khay 2"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500">Về Bếp</span>
                    </div>
                  </div>
                  {/* Merged table warning if either tray is merged */}
                  {(tables.find(
                    (t) => t.name.toLowerCase() === tray1Table.toLowerCase(),
                  )?.status === "merged" ||
                    tables.find(
                      (t) => t.name.toLowerCase() === tray2Table.toLowerCase(),
                    )?.status === "merged") && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Lưu ý: Có bàn đã gộp. Robot AMR sẽ tự động điều phối trả
                        món tại Trạm Bàn Chính tương ứng.
                      </span>
                    </div>
                  )}
                </div>
                {/* STANDBY WORKFLOW PIPELINE: Visible in Standby to avoid empty state confusion */}
                {!activeSequence && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-950 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          QUY TRÌNH CHUỖI 2 KHAY &amp; ASSISTED DROP-OFF
                        </span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        DS-07 Realtime
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono pt-1">
                      <div className="p-2 rounded-lg bg-white border border-blue-200 text-slate-700">
                        <div className="font-bold text-blue-700">
                          1. Xuất Bếp
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Nạp 2 khay
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-blue-200 text-slate-700">
                        <div className="font-bold text-blue-700">
                          2. Đến Khay 1
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          ESP32 / Đổi Bàn
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-indigo-200 text-slate-700">
                        <div className="font-bold text-indigo-700">
                          3. Đến Khay 2
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          ESP32 / Đổi Bàn
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-emerald-200 text-slate-700">
                        <div className="font-bold text-emerald-700">
                          4. Về Bếp
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Tự động
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MODE B: SINGLE TABLE DISPATCH FORM (EXISTING) */
              <>
                {/* Field 1: Order ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      <span>Mã Đơn / Order ID</span>
                    </span>
                    <span className="text-[10px] font-mono font-normal text-slate-400">
                      Khớp POS / Bill
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={orderInputId}
                      onChange={(e) => setOrderInputId(e.target.value)}
                      placeholder="Nhập mã đơn, ví dụ: ORD-101..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder:text-slate-400 placeholder:font-normal transition-all"
                    />
                  </div>
                  {/* Quick suggestions chips for Order ID */}
                  <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-0.5">
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      Gợi ý đơn:
                    </span>
                    {["ORD-101", "ORD-102", "ORD-103", "ORD-104"].map(
                      (chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setOrderInputId(chip)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all border cursor-pointer shrink-0 ${
                            orderInputId === chip
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {chip}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                {/* Field 2: Destination Table */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Điểm Đích Đến / Destination Table</span>
                    </span>
                    <span className="text-[10px] font-mono font-normal text-slate-400">
                      Click bản đồ hoặc nhập tay
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">
                        -- Chọn Bàn Đích Đến (Toàn bộ bàn) --
                      </option>
                      {destinationInput &&
                        !tables.some((t) => t.name === destinationInput) && (
                          <option value={destinationInput}>
                            {destinationInput}
                          </option>
                        )}
                      {tables.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} {t.zone ? `[${t.zone}]` : ""}{" "}
                          {t.stationName ? `• Trạm: ${t.stationName}` : ""}{" "}
                          {t.status === "merged" ? "(Đã gộp)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Departure Station info */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Trạm Xuất: <strong>Bếp Trung Tâm (Kitchen)</strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <span>{effectiveRobot?.code || "AMR-01"}</span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                    <span>{destinationInput || "Chưa chọn"}</span>
                  </span>
                </div>
              </>
            )}
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
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
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
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
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
                        Vị trí hiện tại:{" "}
                        <strong>{effectiveRobot.currentZone}</strong>
                      </span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-blue-200/60 flex items-center justify-between">
                    <span>
                      Trạng thái: <strong>Rảnh (Idle)</strong> • Gần quầy ra món
                      nhất
                    </span>
                    <span className="text-blue-700 font-bold">Ưu tiên #1</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Chưa Có Robot AMR Khả Dụng Để Nhận Lệnh</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Điều kiện dispatch: Robot ở trạng thái{" "}
                    <strong className="font-semibold text-slate-800">
                      Rảnh (Idle)
                    </strong>
                    , pin{" "}
                    <strong className="font-semibold text-slate-800">
                      &gt; 30%
                    </strong>{" "}
                    và kết nối online với trạm điều phối Bếp.
                  </p>
                </div>
              )
            ) : (
              /* Manual Selection Dropdown */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Chọn AMR cụ thể để giao món:
                </label>
                {robots.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    Chưa có robot nào được gán cho quán này.
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-2">
                  {robots.map((r) => {
                    const isSelected = manualSelectedRobot === r.code;
                    const isBusy = r.status !== "idle";
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => setManualSelectedRobot(r.code)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs"
                            : isBusy
                              ? "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                              : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{r.code}</span>
                          <span className="text-[10px] font-mono">
                            {r.battery}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate mt-1">
                          {r.status === "idle" ? "Sẵn sàng" : "Bận"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                )}
              </div>
            )}
            {/* DISPATCH ACTION BUTTON */}
            <button
              type="button"
              disabled={
                isDispatching ||
                !effectiveRobot ||
                (dispatchMode === "sequence"
                  ? !tray1Table.trim() || !tray2Table.trim()
                  : !destinationInput.trim())
              }
              onClick={
                dispatchMode === "sequence"
                  ? handleDispatchSequence
                  : handleDispatchOrder
              }
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isDispatching
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : !effectiveRobot ||
                      (dispatchMode === "sequence"
                        ? !tray1Table.trim() || !tray2Table.trim()
                        : !destinationInput.trim())
                    ? "bg-slate-200 text-slate-400 border border-slate-300 shadow-none cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 cursor-pointer"
              }`}
            >
              {isDispatching ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG GHI SQLITE & PHÁT LỆNH ĐIỀU PHỐI...</span>
                </>
              ) : !effectiveRobot ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  <span>CHƯA CÓ AMR SẴN SÀNG</span>
                </>
              ) : dispatchMode === "sequence" ? (
                !tray1Table.trim() || !tray2Table.trim() ? (
                  <>
                    <Send className="w-4 h-4 text-slate-400" />
                    <span>VUI LÒNG CHỌN BÀN CHO CẢ 2 KHAY</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>
                      PHÁT LỆNH CHUỖI 2 KHAY: {tray1Table} ➔ {tray2Table}
                    </span>
                  </>
                )
              ) : !destinationInput.trim() ? (
                <>
                  <Send className="w-4 h-4 text-slate-400" />
                  <span>VUI LÒNG CHỌN BÀN ĐỂ GIAO MÓN</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>
                    XUẤT LỆNH: {orderInputId || "ĐƠN"} TỚI {destinationInput}{" "}
                    (LƯU SQLITE)
                  </span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
              <span>Đồng bộ: SQLite (amr_tasks + sync_journal)</span>
              <span>Robot: {effectiveRobot?.code || "AMR"}</span>
            </div>
          </div>
          {/* RECENT SQLITE DISPATCH MISSIONS LOG */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>LỆNH ĐIỀU PHỐI SQLITE GẦN NHẤT</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Bảng: amr_tasks
              </span>
            </div>
            <div className="space-y-2">
              {recentSqliteTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Chưa có lệnh điều phối nào trong ca làm việc.
                </div>
              ) : (
                recentSqliteTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                        {task.taskId}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {task.orderId} → {task.destination}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 font-bold">
                        {task.robotCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          task.status === "Delivering"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {task.status === "Delivering"
                          ? "Đang Giao"
                          : "Hoàn Tất"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {task.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      {/* STICKY BOTTOM DISPATCH BAR FOR MOBILE TABLETS & POS (Thumb-friendly Action Zone) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 safe-area-pb">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-mono font-extrabold text-blue-700 text-sm shrink-0 shadow-2xs">
            {dispatchMode === "sequence"
              ? "2K"
              : currentSelectedTable.id !== "Chưa có"
                ? currentSelectedTable.id
                : "?"}
          </div>
          <div className="truncate">
            <div className="text-xs font-extrabold text-slate-900 truncate">
              {dispatchMode === "sequence"
                ? `${tray1Table} ➔ ${tray2Table}`
                : currentSelectedTable.name}
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1.5 mt-0.5">
              <span>AMR:</span>
              <strong className="text-blue-600 font-bold">
                {effectiveRobot?.code || "Chưa có"}
              </strong>
              {effectiveRobot && (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                  {effectiveRobot.battery}% Pin
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={
            isDispatching ||
            !effectiveRobot ||
            (dispatchMode === "sequence"
              ? !tray1Table.trim() || !tray2Table.trim()
              : !destinationInput.trim())
          }
          onClick={
            dispatchMode === "sequence"
              ? handleDispatchSequence
              : handleDispatchOrder
          }
          className={`px-5 py-3 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-2 min-h-[46px] ${
            isDispatching
              ? "bg-blue-400 text-white cursor-not-allowed"
              : !effectiveRobot ||
                  (dispatchMode === "sequence"
                    ? !tray1Table.trim() || !tray2Table.trim()
                    : !destinationInput.trim())
                ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-blue-500/25 cursor-pointer"
          }`}
        >
          {isDispatching ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Đang Lệnh...</span>
            </>
          ) : dispatchMode === "sequence" ? (
            <>
              <Send className="w-4 h-4" />
              <span>
                CHUỖI 2 KHAY ({tray1Table} ➔ {tray2Table})
              </span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>XUẤT LỆNH ({orderInputId || "ĐƠN"})</span>
            </>
          )}
        </button>
      </div>
      {/* MID-TRANSIT TABLE REROUTE MODAL (MAIN FLOW: TABLE TRANSFER) */}
      {isRerouteModalOpen && activeSequence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  </div>
                  <span>Đổi Bàn Giữa Chặng (Mid-Transit Table Transfer)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chuyển hướng di chuyển thời gian thực của Robot{" "}
                  <strong className="text-slate-800 font-mono">
                    {activeSequence.robotCode}
                  </strong>{" "}
                  sang bàn mới.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRerouteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3.5">
              {/* From-To Visual Indicator */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-semibold uppercase">
                    Khay {rerouteLegIndex + 1} Hiện Tại
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {activeSequence.legs[rerouteLegIndex]?.tableNo}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                  <span>Đổi Hướng</span>
                  <ArrowRight className="w-3 h-3 text-amber-700" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-blue-600 font-semibold uppercase">
                    Đích Đến Mới
                  </div>
                  <div className="font-extrabold text-blue-700 text-sm mt-0.5">
                    {rerouteNewTable || "Chưa chọn"}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn Bàn Đích Mới (Khả Dụng)
                </label>
                <select
                  value={rerouteNewTable}
                  onChange={(e) => setRerouteNewTable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  {tables
                    .filter(
                      (t) =>
                        t.name !==
                          activeSequence.legs[rerouteLegIndex]?.tableNo &&
                        t.status !== "merged",
                    )
                    .map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.zone || "Khu Bàn Ăn"})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do chuyển bàn (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={rerouteReason}
                  onChange={(e) => setRerouteReason(e.target.value)}
                  placeholder="Ví dụ: Khách đổi sang bàn phòng lạnh, gộp tiệc..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingReroute}
                onClick={() => setIsRerouteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingReroute || !rerouteNewTable}
                onClick={handleConfirmReroute}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/15 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  {isSubmittingReroute
                    ? "Đang Xử Lý Reroute..."
                    : "Xác Nhận Đổi Bàn"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 1: CREATE TABLE MANUALLY */}
      {isCreateTableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Thêm Bàn Ăn Mới</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo thủ công bàn ăn và liên kết trạm tọa độ Robot SLAM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã / Số Bàn (TableNo) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTableNo}
                  onChange={(e) => setNewTableNo(e.target.value)}
                  placeholder="Ví dụ: T01, B12..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Hiển Thị (TableName)
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Ví dụ: Bàn 01 - Khu Ban Công"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sức Chứa (Ghế)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTableCapacity}
                    onChange={(e) =>
                      setNewTableCapacity(parseInt(e.target.value) || 4)
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạm Robot (SLAM)
                  </label>
                  <select
                    value={newTableStationId}
                    onChange={(e) => setNewTableStationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Chưa gán trạm --</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.xCoord}, {s.yCoord})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateTable || !newTableNo.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  {isSubmittingCreateTable ? "Đang Tạo..." : "Tạo Bàn Ăn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 2: IMPORT TABLES CSV / EXCEL */}
      {isImportCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Nhập Bàn Ăn Hàng Loạt (Excel / CSV)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khởi tạo nhanh danh sách bàn ăn và liên kết trạm SLAM từ file
                  mẫu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportCsvModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Mode Selector Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImportCsvMode("upload")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    importCsvMode === "upload"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Tải Lên File (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setImportCsvMode("text")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    importCsvMode === "text"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  Dán Nội Dung CSV
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file mẫu CSV</span>
              </button>
            </div>
            {/* Tab 1: Upload File */}
            {importCsvMode === "upload" ? (
              <div className="space-y-2">
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/20">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    {importCsvFile
                      ? importCsvFile.name
                      : "Chọn hoặc kéo thả file CSV vào đây"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Định dạng file: .csv (phân cách phẩy hoặc chấm phẩy)
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              /* Tab 2: Text Input */
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nội dung CSV (Header: TableNo,TableName,Capacity,StationName)
                </label>
                <textarea
                  rows={5}
                  value={importCsvContent}
                  onChange={(e) => setImportCsvContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-[11px] text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            )}
            {/* Import Result Stats */}
            {importResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  importResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Kết quả xử lý:</span>
                  <span>
                    Tạo: {importResult.totalCreated} • Bỏ qua:{" "}
                    {importResult.totalSkipped}
                  </span>
                </div>
                {importResult.messages && importResult.messages.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-[10px] font-mono space-y-0.5 pt-1 border-t border-emerald-200/60">
                    {importResult.messages.slice(0, 6).map((msg, idx) => (
                      <div key={idx}>• {msg}</div>
                    ))}
                    {importResult.messages.length > 6 && (
                      <div>
                        ... và {importResult.messages.length - 6} thông báo
                        khác.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportCsvModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={
                  isSubmittingImportCsv ||
                  (importCsvMode === "upload" && !importCsvFile)
                }
                onClick={handleImportCsv}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {isSubmittingImportCsv ? "Đang Nhập..." : "Bắt Đầu Nhập Bàn"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: ASSIGN STATION (WAYPOINT) TO TABLE */}
      {isAssignStationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span>Gán Trạm Robot (SLAM Waypoint)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Liên kết bàn ăn với tọa độ điểm dừng của Robot AMR trên bản đồ
                  SLAM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignStationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bàn Ăn Cần Gán Trạm
                </label>
                <select
                  value={assignStationTableId}
                  onChange={(e) => {
                    setAssignStationTableId(e.target.value);
                    const matched = tables.find((t) => t.id === e.target.value);
                    setAssignStationTargetStationId(matched?.stationId || "");
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{" "}
                      {t.stationName
                        ? `(Hiện tại: ${t.stationName})`
                        : "(Chưa gán trạm)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Trạm Vật Lý (Đồng Bộ từ SLAM Nav2 qua MQTT)
                </label>
                <select
                  value={assignStationTargetStationId}
                  onChange={(e) =>
                    setAssignStationTargetStationId(e.target.value)
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Hủy gán trạm (Không gán xe) --</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name} (X: {s.xCoord}, Y: {s.yCoord}) •{" "}
                      {s.stationType || "Bàn ăn"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  <span>Cơ chế điều phối tự động:</span>
                </span>
                <p className="text-purple-700 leading-relaxed">
                  Khi bếp phát lệnh giao món tới bàn này, Robot AMR sẽ tự động
                  di chuyển đến tọa độ của trạm được chọn để phục vụ.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignStationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingAssignStation}
                onClick={handleAssignStation}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-500/10 cursor-pointer"
              >
                {isSubmittingAssignStation ? "Đang Lưu..." : "Lưu Gán Trạm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TABLE MERGE MODAL (FLOW 3) */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Quản Lý Bàn & Trạm Đệm (Merge & Staging Console)
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-3 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMergeStagingTab("merge")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mergeStagingTab === "merge" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tab 1: Gộp Bàn Khách Đoàn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMergeStagingTab("staging");
                    const narrowTable = tables.find(
                      (t) =>
                        t.name.includes("S") ||
                        t.name.includes("Hành lang") ||
                        t.name.includes("Hẹp"),
                    );
                    if (narrowTable && !stagingTableId)
                      setStagingTableId(narrowTable.id);
                    if (stations.length > 0 && !stagingStationId)
                      setStagingStationId(stations[0].id);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${mergeStagingTab === "staging" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Tab 2: Trạm Đệm Tiếp Ứng (Lối Hẹp)
                </button>
              </div>
            </div>
            {mergeStagingTab === "staging" ? (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quy Tắc Trạm Đệm Tiếp Ứng (Assisted Drop-off):</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    • Áp dụng cho bàn ở hành lang hẹp &lt; 0.8m hoặc góc khuất
                    AMR không tiếp cận trực tiếp.
                    <br />• Robot AMR giao món tới{" "}
                    <strong>Trạm Đệm (Point A)</strong>, nhân viên tiếp ứng bưng
                    thủ công chặng cuối vào bàn cho khách.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bàn Thuộc Vùng Hạn Chế / Lối Hẹp (&lt; 0.8m)
                    </label>
                    <select
                      value={stagingTableId}
                      onChange={(e) => setStagingTableId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">-- Chọn bàn lối hẹp --</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.zone || "Khu Bàn"}){" "}
                          {t.name.includes("S") ||
                          t.name.includes("Hành lang") ||
                          t.name.includes("Hẹp")
                            ? "⚠️ [Lối Hẹp < 0.8m]"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trạm Đệm Trung Gian (Point A) Khả Dụng
                    </label>
                    <select
                      value={stagingStationId}
                      onChange={(e) => setStagingStationId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">-- Chọn Trạm Đệm phù hợp --</option>
                      {stations
                        .filter(
                          (s) =>
                            !s.name?.toLowerCase().includes("bếp") &&
                            s.status === "available",
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Waypoint {s.xCoord}, {s.yCoord})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGroupingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={
                      isSubmittingStaging ||
                      !stagingTableId ||
                      !stagingStationId
                    }
                    onClick={handleConfirmBindStaging}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-500/10 transition-all cursor-pointer"
                  >
                    {isSubmittingStaging
                      ? "Đang Liên Kết..."
                      : "Xác Nhận Liên Kết Trạm Đệm (Mode A->S)"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Architectural Clarification Banner */}
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nguyên tắc Robot khi Gộp Bàn:</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    • Toàn bộ đơn hàng sẽ được Robot chuyển hướng giao tới{" "}
                    <strong>Trạm vật lý của Bàn Chính</strong>.<br />•{" "}
                    <strong>
                      Bản đồ SLAM và các Waypoint của Robot được giữ nguyên 100%
                    </strong>
                    , không bị xáo trộn hay gộp sai lệch tọa độ.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Bàn Chính (Trạm giao cố định của Robot AMR - UC-01)
                      </label>
                      {primaryAnchorTableId &&
                        (() => {
                          const sel = tables.find(
                            (t) => t.id === primaryAnchorTableId,
                          );
                          const isOcc =
                            sel &&
                            (sel.status === "occupied" ||
                              sel.status === "serving" ||
                              sel.status === "waiting");
                          return isOcc ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              ⚠️ Bàn đang có khách (UC-02)
                            </span>
                          ) : null;
                        })()}
                    </div>
                    <select
                      value={primaryAnchorTableId}
                      onChange={(e) => setPrimaryAnchorTableId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {tables
                        .filter((t) => t.status !== "merged")
                        .map((t) => {
                          const hasStation = !!(t.stationId || t.stationName);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name}{" "}
                              {hasStation
                                ? `(Trạm: ${t.stationName || t.stationId})`
                                : "(⚠️ Chưa gán trạm)"}{" "}
                              ({t.zone || "Khu Bàn Ăn"})
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Chọn Các Bàn Thành Viên (Gộp nhiều bàn - HC-02)
                      </label>
                      <span className="text-[10px] font-mono text-blue-700 font-bold">
                        Đã chọn: {memberTableIds.length} bàn
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      {tables
                        .filter(
                          (t) =>
                            t.id !== primaryAnchorTableId &&
                            t.status !== "merged",
                        )
                        .map((t) => {
                          const isChecked = memberTableIds.includes(t.id);
                          const isOcc =
                            t.status === "occupied" ||
                            t.status === "serving" ||
                            t.status === "waiting";
                          return (
                            <label
                              key={t.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setMemberTableIds((prev) => [
                                        ...prev,
                                        t.id,
                                      ]);
                                    } else {
                                      setMemberTableIds((prev) =>
                                        prev.filter((id) => id !== t.id),
                                      );
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                                <span>
                                  {t.name} ({t.zone || "Khu Bàn Ăn"})
                                </span>
                              </div>
                              {isOcc && (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Đang có khách
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lý do gộp bàn
                    </label>
                    <input
                      type="text"
                      value={mergeReason}
                      onChange={(e) => setGroupReason(e.target.value)}
                      placeholder="Ghép bàn nhóm đông, tiệc gia đình..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingMerge}
                    onClick={() => setIsGroupingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={
                      isSubmittingMerge ||
                      !primaryAnchorTableId ||
                      (memberTableIds.length === 0 && !memberTableId)
                    }
                    onClick={handleConfirmMerge}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                  >
                    {isSubmittingMerge
                      ? "Đang Gộp Bàn..."
                      : "Xác Nhận Gộp Bàn (Table Merge)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* FLOW 3: PRE-DISPATCH TABLE TRANSFER MODAL (HC-04 & UC-05) */}
      {transferOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-800">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  </div>
                  <span>Đổi Bàn</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chuyển đơn{" "}
                  <strong className="text-slate-800 font-mono">
                    {transferOrderModal.orderNumber}
                  </strong>{" "}
                  sang vị trí bàn mới trước khi xuất lệnh điều phối AMR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferOrderModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3.5">
              {/* Visual From-To Step Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-semibold uppercase">
                    Bàn Gốc
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {transferOrderModal.currentTableNo}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold">
                  <span>Chuyển Bàn</span>
                  <ArrowRight className="w-3 h-3 text-amber-700" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-blue-600 font-semibold uppercase">
                    Bàn Nhận Đơn
                  </div>
                  <div className="font-extrabold text-blue-700 text-sm mt-0.5">
                    {tables.find((t) => t.id === transferOrderTargetId)?.name ||
                      "Chưa chọn"}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bàn Gốc Cần Chuyển Đi (From Table)
                </label>
                <select
                  value={
                    tables.find(
                      (t) =>
                        t.name.toLowerCase() ===
                        transferOrderModal.currentTableNo.toLowerCase(),
                    )?.id ||
                    tables[0]?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const sel = tables.find((t) => t.id === e.target.value);
                    if (sel) {
                      const match = pendingOrders.find(
                        (o) =>
                          o.tableNo.toLowerCase() === sel.name.toLowerCase() ||
                          o.tableNo === sel.id,
                      );
                      setTransferOrderModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              currentTableNo: sel.name,
                              orderId:
                                match?.id ||
                                `ORD-${sel.name.replace(/\s+/g, "")}`,
                              orderNumber:
                                match?.orderNumber || `Đơn ${sel.name}`,
                            }
                          : null,
                      );
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{" "}
                      {t.status === "occupied"
                        ? "(Đang dùng món)"
                        : t.status === "waiting"
                          ? "(Chờ phục vụ)"
                          : "(Khả dụng)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn Bàn Đích Mới (Trống &amp; Chưa Gộp)
                </label>
                <select
                  value={transferOrderTargetId}
                  onChange={(e) => setTransferOrderTargetId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Chọn Bàn Nhận Đơn --</option>
                  {tables
                    .filter(
                      (t) =>
                        t.name !== transferOrderModal.currentTableNo &&
                        t.status !== "merged",
                    )
                    .map((t) => {
                      const isOccupied =
                        t.status === "occupied" ||
                        t.status === "serving" ||
                        t.status === "waiting";
                      return (
                        <option key={t.id} value={t.id} disabled={isOccupied}>
                          {t.name}{" "}
                          {isOccupied
                            ? "(Đang bận - Không khả dụng)"
                            : "(Trống)"}{" "}
                          {t.stationName ? `[Trạm: ${t.stationName}]` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 leading-relaxed shadow-2xs">
                <strong>Lưu ý nghiệp vụ:</strong> Hệ thống tự động cập nhật lại
                trạm đích cho KDS và Robot AMR. Nếu bàn đích đã gộp vào bàn
                chính, đơn sẽ được tự động hướng tới trạm của bàn chính.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingTransferOrder}
                onClick={() => setTransferOrderModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingTransferOrder || !transferOrderTargetId}
                onClick={handleConfirmTransferOrder}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-500 active:scale-95 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                <span>
                  {isSubmittingTransferOrder
                    ? "Đang Chuyển Bàn..."
                    : "Xác Nhận Đổi Bàn"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FLOW 3: ARRIVAL RACE CONDITION & SECOND-LEG DISPATCH MODAL (HC-06 & UC-06 / ETM-14) */}
      {rerouteConflictModal && rerouteConflictModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border-2 border-rose-500 shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-800 animate-in zoom-in-95">
            <div className="border-b border-rose-100 pb-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Xung Đột Đổi Bàn: Robot Đã Đến Trạm Cũ (UC-06 / ETM-14)
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  Robot AMR đã hoàn thành hành trình tới{" "}
                  <strong>{rerouteConflictModal.oldTableNo}</strong> trước khi
                  lệnh đổi sang{" "}
                  <strong>{rerouteConflictModal.newTableNo}</strong> được xử lý.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
              <div className="font-semibold text-slate-800">
                Chọn phương án giải quyết:
              </div>
              <div className="text-[11px] leading-relaxed space-y-1">
                <p>
                  • <strong>Bàn giao thủ công:</strong> Nhân viên phục vụ tại
                  bàn {rerouteConflictModal.oldTableNo} nhận món từ khay và mang
                  tay qua bàn {rerouteConflictModal.newTableNo}.
                </p>
                <p>
                  •{" "}
                  <strong>
                    Robot tự hành đi chặng 2 (Second-Leg Dispatch):
                  </strong>{" "}
                  Robot tự động lập quỹ đạo mới và di chuyển tiếp từ{" "}
                  {rerouteConflictModal.oldTableNo} sang{" "}
                  {rerouteConflictModal.newTableNo}.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRerouteConflictModal(null);
                  showToast(
                    `Đã chọn bàn giao thủ công từ ${rerouteConflictModal.oldTableNo} sang ${rerouteConflictModal.newTableNo}.`,
                    "info",
                  );
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
              >
                1. Bàn Giao Thủ Công
              </button>
              <button
                type="button"
                disabled={isSubmittingSecondLeg}
                onClick={handleConfirmSecondLeg}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-200" />
                <span>
                  {isSubmittingSecondLeg
                    ? "Đang Điều Phối..."
                    : "2. Robot Tự Hành Đi Chặng 2 (HC-06)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
