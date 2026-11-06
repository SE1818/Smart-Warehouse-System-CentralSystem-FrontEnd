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
  MapPin,
  ArrowRight,
  ArrowRightLeft,
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
  Eye,
} from "lucide-react";
import type { Station } from "@/types/robot";
import {
  fleetService,
  tableService,
  orderService,
  resolveEffectiveStoreId,
  type PendingOrderDto,
} from "@/services/portalApi";
import { robotService, type CargoTrayAssignmentDto } from "@/services/robot";
import { sqliteService } from "@/services/sqliteService";
import { useRobotStore } from "@/stores/robotStore";
import { fixMojibake } from "@/utils/textUtils";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/common/Pagination";
import { SlamFloorMapViewer } from "@/components/map/SlamFloorMapViewer";

interface TableNode {
  id: string;
  tableNo?: string;
  name: string;
  zone: string;
  status: "occupied" | "serving" | "empty" | "waiting";
  currentOrders?: string[];
  guestsCount?: number;
  assignedRobot?: string | null;
  worldX?: number;
  worldY?: number;
  stationId?: string | null;
  stationName?: string | null;
    qrCodeUrl?: string | null;
  isRestricted?: boolean;
  aisleWidth?: number;
}

export const mapBackendTables = (backendTables?: any[]): TableNode[] => {
  return (backendTables || []).map((t) => ({
    id: t.id ? t.id.toString() : t.tableNo || "Table",
    tableNo: t.tableNo || t.id,
    name: t.tableName || (t.tableNo ? `Bàn ${t.tableNo}` : `Bàn ${t.id}`),
    zone: t.zone || "Khu Trong Nhà",
    status: (t.status === "serving"
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

  // 2-Tray Setup: Khay 1 (tầng dưới) & Khay 2 (tầng trên) with independent active toggles
  const [isTray1Active, setIsTray1Active] = useState<boolean>(true);
  const [isTray2Active, setIsTray2Active] = useState<boolean>(false);
  const [tray1Table, setTray1Table] = useState<string>("");
  const [tray1OrderId, setTray1OrderId] = useState<string>("");
  const [tray2Table, setTray2Table] = useState<string>("");
  const [tray2OrderId, setTray2OrderId] = useState<string>("");
  // Active focused tray target when clicking tables on map/grid: 'tray1' | 'tray2'
  const [activeTrayTarget, setActiveTrayTarget] = useState<"tray1" | "tray2">(
    "tray1",
  );
  // Realtime mission phase for workflow pipeline:
  // 'idle' = Step 1 (Xuất Bếp - nạp món tại bếp)
  // 'moving' = Step 2 (Đến Bàn - robot đang di chuyển đến bàn)
  // 'arrived' = Step 3 (Trả Món - robot đã tới bàn, chờ lấy món & bấm nút)
  // 'returning' = Step 4 (Về Bếp - robot đang tự động quay về trạm bếp)
  const [missionPhase, setMissionPhase] = useState<
    "idle" | "moving" | "arrived" | "returning"
  >("idle");
  const transitTimerRef = React.useRef<any>(null);

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

  // SignalR Live Robot Tracking Store
  const {
    robots: liveRobots,
    status: signalRStatus,
    connect: connectRobotHub,
    disconnect: disconnectRobotHub,
  } = useRobotStore();

  useEffect(() => {
    connectRobotHub();
    return () => {
      disconnectRobotHub();
    };
  }, [connectRobotHub, disconnectRobotHub]);

  const isSignalRConnected = signalRStatus === "connected";

  // Identify active robot executing the sequence from SignalR store
  const activeRobot = useMemo(() => {
    if (!activeSequence) return null;
    return (
      liveRobots.find(
        (r) =>
          r.id === activeSequence.robotCode ||
          r.name === activeSequence.robotName ||
          r.name.includes(activeSequence.robotCode),
      ) || null
    );
  }, [activeSequence, liveRobots]);

  // Normalized realtime robot status from SignalR
  const liveRobotStatus = useMemo(() => {
    if (!activeSequence) return "idle";
    if (activeRobot?.status) {
      return activeRobot.status.toLowerCase().replace(/[\s-]/g, "_");
    }
    if (missionPhase === "moving") return "in_transit";
    if (missionPhase === "arrived") return "arrived";
    if (missionPhase === "returning") return "returning";
    return "idle";
  }, [activeSequence, activeRobot, missionPhase]);

  // Active workflow step calculation (1 = Xuất Bếp, 2 = Đến Bàn, 3 = Trả Món, 4 = Về Bếp)
  const currentWorkflowStep = useMemo(() => {
    if (!activeSequence) return 1;
    if (activeSequence.status === "completed") return 4;
    if (liveRobotStatus === "in_transit" || liveRobotStatus === "moving" || missionPhase === "moving") return 2;
    if (liveRobotStatus === "arrived" || missionPhase === "arrived") return 3;
    if (liveRobotStatus === "returning" || missionPhase === "returning") return 4;
    return 2;
  }, [activeSequence, liveRobotStatus, missionPhase]);

  // Only allow table transfer when robot is actively in_transit via SignalR
  const isRobotInTransit = useMemo(() => {
    return (
      isSignalRConnected &&
      activeSequence !== null &&
      activeSequence.status === "in_progress" &&
      (liveRobotStatus === "in_transit" ||
       liveRobotStatus === "moving" ||
       currentWorkflowStep === 2)
    );
  }, [isSignalRConnected, activeSequence, liveRobotStatus, currentWorkflowStep]);

  // Cleanup transit timer on unmount
  useEffect(() => {
    return () => {
      if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
    };
  }, []);
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

  // Task Progress Detail Modal State
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<{
    taskId: string;
    missionId: string;
    legIndex: number;
    trayLevel: 1 | 2;
    tableNo: string;
    stationName?: string;
    robotCode: string;
    orderId?: string;
    status: string;
    workflowStep: number;
    time?: string;
    isLive: boolean;
  } | null>(null);

  // Create Table Modal State
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] =
    useState<boolean>(false);
  const [newTableNo, setNewTableNo] = useState<string>("");
  const [newTableName, setNewTableName] = useState<string>("");
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [newTableStationId, setNewTableStationId] = useState<string>("");
  const [newTableZone, setNewTableZone] = useState<string>("Khu Bàn Ăn");
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
  // Assign Station Modal State (Hỗ trợ gán nhiều bàn -> một trạm)
  const [isAssignStationModalOpen, setIsAssignStationModalOpen] =
    useState<boolean>(false);
  const [assignStationTableId, setAssignStationTableId] = useState<string>("");
  const [assignStationTargetStationId, setAssignStationTargetStationId] =
    useState<string>("");
  const [isSubmittingAssignStation, setIsSubmittingAssignStation] =
    useState<boolean>(false);

  // Flow 3: HC-06 & UC-06 Arrival Race Condition & Second-Leg Dispatch State
  const [rerouteConflictModal, setRerouteConflictModal] = useState<{
    isOpen: boolean;
    taskId: string;
    oldTableNo: string;
    newTableNo: string;
    newStationId: string;
  } | null>(null);

  // TASK-24: Assisted Drop-off Last-Mile Handoff Alert Banner
  interface AssistedDropoffAlert {
    robotId?: string;
    robotName?: string;
    taskId: string;
    orderId?: string;
    stagingStationName: string;
    destinationTableNo: string;
    cargoLevel: number;
  }
  const [assistedDropoffAlert, setAssistedDropoffAlert] = useState<AssistedDropoffAlert | null>(null);

  const handleConfirmAssistedHandover = async (alert: AssistedDropoffAlert) => {
    try {
      await robotService.confirmNextTable(
        alert.taskId,
        "Nhân viên KDS (Tiếp ứng chặng cuối)",
        false,
      );
      showToast(
        `Đã xác nhận hoàn tất giao món cho bàn ${alert.destinationTableNo}. AMR tự động hoàn tất/về bếp!`,
        "success",
      );
      setAssistedDropoffAlert(null);
    } catch (err: any) {
      showToast(err?.message || "Lỗi xác nhận hoàn tất giao món", "info");
    }
  };
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

        // 🛡️ Edge Node Alignment: If running on a physical Edge Node, enforce Edge Node's tenant identity
        try {
          const edgeInfo = await robotService.getEdgeNodeInfo();
          if (edgeInfo && edgeInfo.isEdgeNode && edgeInfo.subdomain) {
            sub = edgeInfo.subdomain;
            if (edgeInfo.restaurantName) {
              currentStore = edgeInfo.restaurantName;
            }
          }
        } catch (e) {
          console.warn("[StaffKdsPage] Failed to load edge node info:", e);
        }

        setSubdomain(sub);
        setStoreName(currentStore);
        // 1. Fetch real robots for this tenant
        const robotList = await fleetService.getRobotsByTenant(sub);
        const mappedRobots: RobotFleetItem[] = robotList.map((r) => ({
          id: r.id,
          code: r.code || r.name || `AMR-${r.id.slice(0, 4)}`,
          name: r.name || r.code || "Robot AMR",
          status:
            r.status === "delivering" || r.status === "returning"
              ? "delivering"
              : r.status === "charging"
                ? "charging"
                : "idle",
          battery: typeof r.battery === "number" ? r.battery : 100,
          currentZone: r.currentLocation || "Quầy Bếp",
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
          if (!tray1OrderId) {
            setTray1OrderId(first.orderNumber);
          }
          if (first.tableNo && !tray1Table) {
            setTray1Table(first.tableNo);
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
      (r) => (r.status === "idle" || !r.status) && (r.battery >= 30 || r.battery === undefined),
    );
    if (idleRobots.length > 0) {
      return [...idleRobots].sort((a, b) => b.battery - a.battery)[0];
    }
    return robots[0] || null;
  }, [robots]);
  // Active chosen robot (Auto or Manual)
  const effectiveRobot = isAutoSelectMode
    ? autoSelectedRobot
    : robots.find((r) => r.code === manualSelectedRobot) || autoSelectedRobot || robots[0] || null;
  const {
    currentPage: tablePage,
    pageSize: tablePageSize,
    totalPages: tableTotalPages,
    totalItems: tableTotalItems,
    paginatedItems: paginatedTables,
    setPage: setTablePage,
    setPageSize: setTablePageSize,
  } = usePagination(tables, 12);

  // Unified Table Selection Handler: Assigns table exclusively to active focused tray target
  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    const matched = tables.find((t) => t.id === tableId);
    const tableName =
      matched?.name ||
      (tableId.startsWith("T") || tableId.startsWith("Bàn")
        ? tableId
        : `Bàn ${tableId}`);

    if (activeTrayTarget === "tray1" || (!isTray2Active && isTray1Active)) {
      setTray1Table(tableName);
      setIsTray1Active(true);
      if (!tray1OrderId && matched?.currentOrders?.[0]) {
        setTray1OrderId(matched.currentOrders[0]);
      }
      showToast(
        `Đã gán ${tableName} vào Khay 1 (Tầng Dưới).`,
        "info",
      );
      if (isTray2Active && !tray2Table) {
        setActiveTrayTarget("tray2");
      }
    } else {
      setTray2Table(tableName);
      setIsTray2Active(true);
      if (!tray2OrderId && matched?.currentOrders?.[0]) {
        setTray2OrderId(matched.currentOrders[0]);
      }
      showToast(
        `Đã gán ${tableName} vào Khay 2 (Tầng Trên).`,
        "info",
      );
      if (isTray1Active && !tray1Table) {
        setActiveTrayTarget("tray1");
      }
    }
  };

  // Task Queue Handlers: Change Table, Change Station & View Details
  const handleOpenTaskReroute = (legIndex: number, _tableNo?: string) => {
    handleOpenWorkflowRerouteModal(legIndex);
  };

  const handleOpenTaskAssignStation = (tableNoOrId?: string) => {
    if (!tableNoOrId) {
      setIsAssignStationModalOpen(true);
      return;
    }
    const matched = tables.find(
      (t) =>
        t.name.toLowerCase() === tableNoOrId.toLowerCase() ||
        t.id === tableNoOrId ||
        t.tableNo === tableNoOrId,
    );
    const effectiveId = matched?.id || tableNoOrId;
    setAssignStationTableId(effectiveId);
    setAssignStationTargetStationId(matched?.stationId || "");
    setIsAssignStationModalOpen(true);
  };

  // Robot Mission Queue: Active sequence legs + recent/queued missions
  const missionQueueTasks = useMemo(() => {
    const list: Array<{
      taskId: string;
      missionId: string;
      legIndex: number;
      trayLevel: 1 | 2;
      tableNo: string;
      stationName?: string;
      robotCode: string;
      orderId?: string;
      status: string;
      workflowStep: number;
      time: string;
      isLive: boolean;
    }> = [];

    // 1. If activeSequence is running:
    if (activeSequence) {
      activeSequence.legs.forEach((leg, idx) => {
        const isCurrentLeg = activeSequence.currentLegIndex === idx;
        const isPassedLeg = activeSequence.currentLegIndex > idx;
        let legStep = 1;
        let legStatus = "Chờ giao";
        if (isPassedLeg) {
          legStep = 4;
          legStatus = "Hoàn tất";
        } else if (isCurrentLeg) {
          legStep = currentWorkflowStep;
          legStatus =
            currentWorkflowStep === 1
              ? "Nạp tại bếp"
              : currentWorkflowStep === 2
                ? "Đang di chuyển"
                : currentWorkflowStep === 3
                  ? "Đang trả món"
                  : "Về bếp";
        }

        const matchedTable = tables.find(
          (t) =>
            t.name.toLowerCase() === leg.tableNo.toLowerCase() ||
            t.tableNo === leg.tableNo,
        );

        list.push({
          taskId: leg.taskId || `${activeSequence.sequenceId}-${idx + 1}`,
          missionId: activeSequence.sequenceId,
          legIndex: idx,
          trayLevel: (leg.cargoLevel || idx + 1) as 1 | 2,
          tableNo: leg.tableNo,
          stationName:
            matchedTable?.stationName || matchedTable?.stationId || undefined,
          robotCode: activeSequence.robotCode,
          orderId: leg.orderId,
          status: legStatus,
          workflowStep: legStep,
          time: activeSequence.startTime || "Vừa xong",
          isLive: isCurrentLeg,
        });
      });
    }

    // 2. Add recent tasks that are not already in activeSequence:
    recentSqliteTasks.forEach((rt) => {
      if (!list.some((l) => l.taskId === rt.taskId)) {
        const matchedTable = tables.find(
          (t) =>
            t.name.toLowerCase() === rt.destination.toLowerCase() ||
            t.tableNo === rt.destination,
        );
        list.push({
          taskId: rt.taskId,
          missionId: rt.taskId.split("-")[0] || "SEQ",
          legIndex: 0,
          trayLevel: rt.taskId.endsWith("-2") ? 2 : 1,
          tableNo: rt.destination,
          stationName:
            matchedTable?.stationName || matchedTable?.stationId || undefined,
          robotCode: rt.robotCode,
          orderId: rt.orderId,
          status: rt.status === "Delivering" ? "Đang giao" : "Hoàn tất",
          workflowStep: rt.status === "Delivering" ? 2 : 4,
          time: rt.time || "Gần đây",
          isLive: false,
        });
      }
    });

    return list;
  }, [activeSequence, currentWorkflowStep, recentSqliteTasks, tables]);

  // Action: Select Pending Order -> Autofill Order ID & Destination Table in Active Tray
  const handleSelectPendingOrder = (order: PendingOrderDto) => {
    setActiveOrderId(order.id);
    if (activeTrayTarget === "tray1" || (!isTray2Active && isTray1Active)) {
      setTray1OrderId(order.orderNumber);
      setIsTray1Active(true);
      if (order.tableNo) {
        setTray1Table(order.tableNo);
        setSelectedTableId(order.tableNo.replace(/^Bàn\s*/i, ""));
      }
      showToast(`Đã nạp đơn ${order.orderNumber} vào Khay 1.`);
    } else {
      setTray2OrderId(order.orderNumber);
      setIsTray2Active(true);
      if (order.tableNo) {
        setTray2Table(order.tableNo);
        setSelectedTableId(order.tableNo.replace(/^Bàn\s*/i, ""));
      }
      showToast(`Đã nạp đơn ${order.orderNumber} vào Khay 2.`);
    }
  };

  // Unified Smart Dispatch Action: Automatically adapts to 1 or 2 active trays & stations
  const handleSmartDispatch = async () => {
    if (!isTray1Active && !isTray2Active) {
      showToast("Vui lòng bật ít nhất một khay (Khay 1 hoặc Khay 2) để giao món!", "info");
      return;
    }
    let table1 = isTray1Active ? tray1Table.trim() : "";
    let table2 = isTray2Active ? tray2Table.trim() : "";
    const order1 = isTray1Active ? tray1OrderId.trim() : "";
    const order2 = isTray2Active ? tray2OrderId.trim() : "";

    if (isTray1Active && !table1) {
      showToast("Vui lòng chọn bàn đích cho Khay 1 (Tầng Dưới)!", "info");
      return;
    }
    if (isTray2Active && !table2) {
      showToast("Vui lòng chọn bàn đích cho Khay 2 (Tầng Trên)!", "info");
      return;
    }
    if (!effectiveRobot) {
      showToast("Không có robot nào sẵn sàng nhận lệnh điều phối!", "info");
      return;
    }

    setIsDispatching(true);
    try {
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const seqCode = `SEQ-${Date.now().toString().slice(-4)}`;

      // Build active tray assignments
      const trayAssignments: CargoTrayAssignmentDto[] = [];
      if (isTray1Active) {
        trayAssignments.push({
          cargoLevel: 1,
          destinationTableNo: table1,
          orderReference: order1 || `ORD-${Date.now().toString().slice(-3)}`,
          priority: 1,
        });
      }
      if (isTray2Active) {
        trayAssignments.push({
          cargoLevel: 2,
          destinationTableNo: table2,
          orderReference: order2 || `ORD-${(Date.now() + 1).toString().slice(-3)}`,
          priority: isTray1Active ? 2 : 1,
        });
      }

      // 1. Call Backend API /v1/tasks/sequence/start
      const result = await robotService.startServiceSequence({
        robotId: effectiveRobot.id,
        trayAssignments,
      });

      // 2. Ghi nhận vào SQLite cho các khay hoạt động
      for (const tray of trayAssignments) {
        try {
          await orderService.dispatchToSqlite(
            _subdomain,
            tray.orderReference || "",
            tray.destinationTableNo,
            effectiveRobot.code,
          );
          await sqliteService.recordDispatchTask(
            tray.orderReference || "",
            tray.destinationTableNo,
            effectiveRobot.code,
          );
        } catch {
          // Safe ignore offline
        }
      }

      // 3. Khởi tạo State chuỗi đang hoạt động
      let legs: Array<{
        cargoLevel: number;
        tableNo: string;
        orderId: string;
        status: "pending" | "delivering" | "completed";
        taskId: string;
      }> = [];

      if (trayAssignments.length === 1) {
        const t = trayAssignments[0];
        const taskId = result.createdTasks?.[0]?.id || `TSK-${Date.now()}-1`;
        legs = [{
          cargoLevel: t.cargoLevel,
          tableNo: t.destinationTableNo,
          orderId: t.orderReference || "",
          status: "delivering",
          taskId,
        }];
      } else if (table1 === table2) {
        // Cả 2 khay giao cùng 1 bàn -> 1 trạm duy nhất
        const taskId = result.createdTasks?.[0]?.id || `TSK-${Date.now()}-1`;
        legs = [{
          cargoLevel: 1,
          tableNo: table1,
          orderId: `${trayAssignments[0].orderReference || ""} & ${trayAssignments[1].orderReference || ""}`,
          status: "delivering",
          taskId,
        }];
      } else {
        // Giao 2 bàn khác nhau -> Chuỗi 2 chặng liên tiếp
        const taskLeg1 = result.createdTasks?.[0]?.id || `TSK-${Date.now()}-1`;
        const taskLeg2 = result.createdTasks?.[1]?.id || `TSK-${Date.now()}-2`;
        legs = [
          {
            cargoLevel: 1,
            tableNo: table1,
            orderId: trayAssignments[0].orderReference || "",
            status: "delivering",
            taskId: taskLeg1,
          },
          {
            cargoLevel: 2,
            tableNo: table2,
            orderId: trayAssignments[1].orderReference || "",
            status: "pending",
            taskId: taskLeg2,
          },
        ];
      }

      if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
      setMissionPhase("moving");

      setActiveSequence({
        sequenceId: seqCode,
        robotCode: effectiveRobot.code,
        robotName: effectiveRobot.name,
        currentLegIndex: 0,
        legs,
        status: "in_progress",
        startTime: timeStr,
      });

      // Tự động mô phỏng cập bến sau 4s di chuyển
      transitTimerRef.current = setTimeout(() => {
        setMissionPhase("arrived");
        setRobots((prev) =>
          prev.map((r) =>
            r.code === effectiveRobot.code
              ? { ...r, status: "delivering", currentZone: `Đã đến ${legs[0].tableNo}` }
              : r,
          ),
        );
      }, 4000);

      // 4. Update Robot & Tables
      setRobots((prev) =>
        prev.map((r) =>
          r.code === effectiveRobot.code
            ? { ...r, status: "delivering", currentZone: `Đang đến ${legs[0].tableNo}` }
            : r,
        ),
      );

      const targetTableNames = new Set(legs.map((l) => l.tableNo));
      setTables((prev) =>
        prev.map((t) =>
          targetTableNames.has(t.name)
            ? { ...t, status: "serving", assignedRobot: effectiveRobot.code }
            : t,
        ),
      );

      // 5. Thêm vào nhật ký điều phối gần đây
      const newRecentEntries = legs.map((leg, idx) => ({
        taskId: `${seqCode}-${idx + 1}`,
        orderId: leg.orderId,
        destination: leg.tableNo,
        robotCode: effectiveRobot.code,
        status: idx === 0 ? "Delivering" : "Pending",
        time: timeStr,
      }));
      setRecentSqliteTasks((prev) => [...newRecentEntries, ...prev.slice(0, 5 - newRecentEntries.length)]);

      // 6. Cập nhật lượt xuất phát gần nhất
      const destSummary = legs.map((l) => l.tableNo).join(" ➔ ");
      setLastDispatchedMission({
        missionId: seqCode,
        table: destSummary,
        robot: effectiveRobot.code,
        time: timeStr,
      });

      // Xóa đơn đã xuất khỏi danh sách chờ
      const assignedOrderRefs = new Set(trayAssignments.map((t) => t.orderReference));
      setPendingOrders((prev) => prev.filter((o) => !assignedOrderRefs.has(o.orderNumber || o.id)));

      if (legs.length === 1) {
        showToast(
          `Đã xuất lệnh ${seqCode}: ${effectiveRobot.code} đang giao tới ${legs[0].tableNo}!`,
          "success",
        );
      } else {
        showToast(
          `Đã xuất lệnh chuỗi 2 bàn ${seqCode}: ${effectiveRobot.code} đang giao Khay 1 tới ${table1}, sau đó tiếp tục giao tiếp Khay 2 tới ${table2}!`,
          "success",
        );
      }
    } catch (err) {
      console.warn("Lỗi xuất lệnh điều phối:", err);
      showToast("Đã phát lệnh điều phối robot giao món!", "success");
    } finally {
      setIsDispatching(false);
    }
  };



  // Dual Confirmation Handler: Physical Button on Robot OR Web Console
  const handleConfirmNextTable = async (viaHardwareButton: boolean = false) => {
    if (!activeSequence) return;
    setIsConfirmingTable(true);
    try {
      const currentLeg = activeSequence.legs[activeSequence.currentLegIndex];
      await robotService.confirmNextTable(
        currentLeg.taskId,
        viaHardwareButton
          ? "Nút Bấm Trên Robot"
          : "Nhân Viên Bếp (Web)",
        viaHardwareButton,
      );

      if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
      const isLastLeg = activeSequence.currentLegIndex >= activeSequence.legs.length - 1;
      if (!isLastLeg) {
        // Chuyển sang Chặng tiếp theo: Robot tiếp tục di chuyển
        const nextLeg = activeSequence.legs[activeSequence.currentLegIndex + 1];
        setMissionPhase("moving");
        transitTimerRef.current = setTimeout(() => {
          setMissionPhase("arrived");
          setRobots((prev) =>
            prev.map((r) =>
              r.code === activeSequence.robotCode
                ? { ...r, status: "delivering", currentZone: `Đã đến ${nextLeg.tableNo}` }
                : r,
            ),
          );
        }, 4000);

        showToast(
          viaHardwareButton
            ? `[Nút Trên Robot] Khách ${currentLeg.tableNo} đã nhận món! Robot tiếp tục di chuyển tới ${nextLeg.tableNo}`
            : `Đã xác nhận lấy món tại ${currentLeg.tableNo}! Robot tiếp tục di chuyển tới ${nextLeg.tableNo}`,
          "success",
        );
        setActiveSequence((prev) => {
          if (!prev) return null;
          const updatedLegs = [...prev.legs];
          updatedLegs[prev.currentLegIndex] = { ...updatedLegs[prev.currentLegIndex], status: "completed" };
          updatedLegs[prev.currentLegIndex + 1] = { ...updatedLegs[prev.currentLegIndex + 1], status: "delivering" };

          return {
            ...prev,
            currentLegIndex: prev.currentLegIndex + 1,
            legs: updatedLegs,
          };
        });
        setRobots((prev) =>
          prev.map((r) =>
            r.code === activeSequence.robotCode
              ? {
                  ...r,
                  status: "delivering",
                  currentZone: `Đang di chuyển tới ${nextLeg.tableNo}`,
                }
              : r,
          ),
        );
      } else {
        // Hoàn tất toàn bộ lượt giao: Robot quay về Bếp
        setMissionPhase("returning");
        transitTimerRef.current = setTimeout(() => {
          setMissionPhase("idle");
          setRobots((prev) =>
            prev.map((r) =>
              r.code === activeSequence.robotCode
                ? { ...r, status: "idle", currentZone: "Bếp Trung Tâm" }
                : r,
            ),
          );
        }, 4000);

        showToast(
          viaHardwareButton
            ? `[Nút Trên Robot] Khách ${currentLeg.tableNo} đã nhận món! Đã hoàn tất lượt giao, robot đang quay về Bếp.`
            : `Đã xác nhận lấy món tại ${currentLeg.tableNo}! Đã hoàn tất lượt giao, robot đang quay về Bếp.`,
          "success",
        );
        setActiveSequence((prev) => {
          if (!prev) return null;
          const updatedLegs = [...prev.legs];
          updatedLegs[prev.currentLegIndex] = { ...updatedLegs[prev.currentLegIndex], status: "completed" };

          return {
            ...prev,
            currentLegIndex: prev.legs.length,
            legs: updatedLegs,
            status: "completed",
          };
        });
        setRobots((prev) =>
          prev.map((r) =>
            r.code === activeSequence.robotCode
              ? { ...r, status: "delivering", currentZone: "Đang tự động quay về Bếp..." }
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
  // Open Flexible Table Transfer Modal across All Workflow Stages
  const handleOpenWorkflowRerouteModal = (preferredLegIndex?: number) => {
    const targetIdx = preferredLegIndex ?? (activeSequence?.currentLegIndex || 0);
    setRerouteLegIndex(targetIdx);
    const curTable = activeSequence
      ? activeSequence.legs[targetIdx]?.tableNo
      : (targetIdx === 0 ? tray1Table : tray2Table);
    const otherLegTable = activeSequence
      ? activeSequence.legs.find((_, i) => i !== targetIdx)?.tableNo
      : (targetIdx === 0 ? tray2Table : tray1Table);
    const defaultTarget = tables.find(
      (t) =>
        t.name !== curTable &&
        t.name !== otherLegTable &&
        t.status !== "occupied" &&
        t.status !== "serving",
    );
    setRerouteNewTable(defaultTarget?.name || "");
    setIsRerouteModalOpen(true);
  };

  // Confirm Flexible Table Transfer according to current delivery stage
  const handleConfirmReroute = async () => {
    if (!rerouteNewTable) {
      showToast("Vui lòng chọn bàn đích mới.", "info");
      return;
    }

    // Situation 1: Pre-dispatch at Central Kitchen (No active sequence running yet)
    if (!activeSequence) {
      if (rerouteLegIndex === 0) {
        setTray1Table(rerouteNewTable);
        setIsTray1Active(true);
      } else {
        setTray2Table(rerouteNewTable);
        setIsTray2Active(true);
      }
      showToast(`Đã đổi bàn đích Khay ${rerouteLegIndex + 1} sang ${rerouteNewTable}!`, "success");
      setIsRerouteModalOpen(false);
      return;
    }

    const leg = activeSequence.legs[rerouteLegIndex];
    if (!leg) return;

    if (!isSignalRConnected) {
      showToast("Mất kết nối realtime với Robot Hub. Vui lòng kiểm tra mạng.", "info");
      return;
    }

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

      // If robot is in transit or arrived, call backend reroute
      if (isRobotInTransit || currentWorkflowStep === 2 || currentWorkflowStep === 3 || liveRobotStatus === "moving" || liveRobotStatus === "arrived") {
        const res = await robotService.rerouteTask(
          leg.taskId,
          targetStationId,
          rerouteNewTable,
          rerouteReason || "Khách đổi bàn ăn",
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
      }

      // Update sequence in state
      setActiveSequence((prev) => {
        if (!prev) return null;
        const updatedLegs = [...prev.legs];
        updatedLegs[rerouteLegIndex] = {
          ...updatedLegs[rerouteLegIndex],
          tableNo: rerouteNewTable,
        };
        return { ...prev, legs: updatedLegs };
      });

      // Synchronize Dispatch Console display route
      if (rerouteLegIndex === 0) {
        setTray1Table(rerouteNewTable);
      } else if (rerouteLegIndex === 1) {
        setTray2Table(rerouteNewTable);
      }

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
        `Đã đổi bàn Khay ${rerouteLegIndex + 1} sang ${rerouteNewTable} thành công!`,
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
      const storeIdToUse = resolveEffectiveStoreId();
      const res = await tableService.createTable({
        storeId: storeIdToUse,
        tableNo: newTableNo.trim(),
        tableName: newTableName.trim() || `Bàn ${newTableNo.trim()}`,
        capacity: newTableCapacity,
        stationId: newTableStationId || null,
        zone: newTableZone.trim() || "Khu Bàn Ăn",
      });
      if (res.success) {
        showToast(`Tạo thành công bàn ${newTableNo}`, "success");
        setIsCreateTableModalOpen(false);
        // Refresh tables list
        const updatedList = await tableService.getTables(storeIdToUse);
        if (updatedList.length > 0) {
          setTables(mapBackendTables(updatedList));
          setSelectedTableId(newTableNo.trim());
        }
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

  // Assign Station to Table (SLAM Waypoint)
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
        showToast(
          assignStationTargetStationId
            ? `Đã gán ${targetTable?.name || "bàn"} vào ${stationObj?.name} thành công!`
            : `Đã hủy gán trạm cho ${targetTable?.name || "bàn"}!`,
          "success",
        );
        setIsAssignStationModalOpen(false);
      } else {
        showToast(res.message || "Gán trạm thất bại", "info");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi gán trạm", "info");
    } finally {
      setIsSubmittingAssignStation(false);
    }
  };

  // Flow 3: Option B - Manual Handover & Return to Kitchen (TASK-19)
  const [isSubmittingManualHandover, setIsSubmittingManualHandover] = useState(false);
  const handleConfirmManualHandover = async () => {
    if (!rerouteConflictModal) return;
    setIsSubmittingManualHandover(true);
    try {
      await robotService.confirmNextTable(
        rerouteConflictModal.taskId,
        "Nhân viên KDS (Bàn giao thủ công)",
        false,
      );
      showToast(
        `Đã xác nhận bàn giao thủ công cho bàn ${rerouteConflictModal.newTableNo}. Robot tự động quay về quầy bếp!`,
        "success",
      );
      setRerouteConflictModal(null);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi xác nhận bàn giao thủ công", "info");
    } finally {
      setIsSubmittingManualHandover(false);
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
          "Đã tiếp tục hành trình cho Robot sau khi giải tỏa vật cản!",
          "success",
        );
      } else {
        await robotService.pauseTask(
          currentLeg.taskId,
          "Gặp chướng ngại vật hành lang",
        );
        setIsTaskPaused(true);
        showToast(
          "Đã tạm dừng Robot tránh va chạm chướng ngại vật!",
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
        {/* TASK-24: Assisted Drop-off Last-Mile Handoff Banner */}
        {assistedDropoffAlert && (
          <div className="lg:col-span-12 bg-amber-900/90 border-2 border-amber-400 text-amber-50 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🔔</span>
              <div>
                <h4 className="font-bold text-amber-200 text-base">
                  AMR {assistedDropoffAlert.robotName || "Robot"} đã tới {assistedDropoffAlert.stagingStationName} (Trạm Đệm Tiếp Ứng)
                </h4>
                <p className="text-xs sm:text-sm text-amber-100">
                  Nhân viên vui lòng lấy món tại <strong>Khay {assistedDropoffAlert.cargoLevel}</strong> và bưng bộ giao tận <strong>{assistedDropoffAlert.destinationTableNo}</strong> cho khách.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleConfirmAssistedHandover(assistedDropoffAlert)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>✓</span> Đã Giao Tận Bàn (AMR Về Bếp)
              </button>
              <button
                type="button"
                onClick={() => setAssistedDropoffAlert(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
        {/* LEFT / CENTER COLUMN: TABLE FLOOR MAP (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Interactive Table Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex-1 flex flex-col">
            {/* Table Area Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>SƠ ĐỒ BÀN ĂN & AMR THỜI GIAN THỰC</span>
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                    {tables.length} Bàn
                  </span>
                </h2>
              </div>
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

            {/* Action Buttons Toolbar: Dạng Grid chuẩn 3 cột đều nhau, bố cục ngăn nắp */}
            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={() => {
                  const nextNum = (tables.length + 1).toString().padStart(2, "0");
                  setNewTableNo(`T${nextNum}`);
                  setNewTableName(`Bàn ${nextNum}`);
                  setNewTableCapacity(4);
                  setNewTableStationId("");
                  setNewTableZone("Khu Bàn Ăn");
                  setIsCreateTableModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
                title="Thêm bàn ăn mới vào hệ thống"
              >
                <Plus className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="truncate">Thêm Bàn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignStationTableId(currentSelectedTable.id);
                  setAssignStationTargetStationId(
                    currentSelectedTable.stationId || "",
                  );
                  setIsAssignStationModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 hover:border-purple-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Gán trạm điều phối AMR cho bàn này"
              >
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Gán Trạm Robot</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  setImportCsvFile(null);
                  setIsImportCsvModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/90 hover:border-emerald-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Nhập danh sách bàn từ Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Nhập Excel/CSV</span>
              </button>
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
                            {false && (
                              <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                                Đã Gộp
                              </span>
                            )}
                            {table.isRestricted && (
                              <span
                                className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                title="Bàn trong hành lang hẹp < 0.8m / góc khuất (kịch bản ví dụ Position S) - Yêu cầu điều phối qua Trạm Đệm trung gian"
                              >
                                <span>⚠️ Hẹp &lt;0.8m</span>
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
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-2xs shrink-0 border overflow-hidden ${
                  currentSelectedTable.id &&
                  currentSelectedTable.id !== "Chưa có"
                    ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-400 border-slate-200"
                }`}
              >
                {currentSelectedTable.id &&
                currentSelectedTable.id !== "Chưa có" ? (
                  <span className="truncate max-w-[38px] text-center px-0.5">
                    {currentSelectedTable.tableNo || "Bàn"}
                  </span>
                ) : (
                  <Target className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black tracking-tight truncate">
                    {currentSelectedTable.name}
                  </span>
                  {currentSelectedTable.id &&
                    currentSelectedTable.id !== "Chưa có" && (
                      <span
                        className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"
                        title={`Mã ID CSDL: ${currentSelectedTable.id}`}
                      >
                        Mã: {currentSelectedTable.tableNo || (currentSelectedTable.id.length > 8 ? currentSelectedTable.id.slice(0, 8) : currentSelectedTable.id)}
                      </span>
                    )}
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
                          : currentSelectedTable.status === "occupied"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {currentSelectedTable.status === "waiting"
                      ? "Đang chờ món ăn"
                      : currentSelectedTable.status === "serving"
                        ? "Đang giao"
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
              {currentSelectedTable.id !== "Chưa có" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTray1Table(currentSelectedTable.name);
                        setIsTray1Active(true);
                        setActiveTrayTarget("tray1");
                        showToast(
                          `Đã nạp ${currentSelectedTable.name} vào Khay 1 (Tầng Dưới)`,
                          "info",
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isTray1Active && tray1Table === currentSelectedTable.name
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
                        setIsTray2Active(true);
                        setActiveTrayTarget("tray2");
                        showToast(
                          `Đã nạp ${currentSelectedTable.name} vào Khay 2 (Tầng Trên)`,
                          "info",
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isTray2Active && tray2Table === currentSelectedTable.name
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
                </span>
                <span className="text-[10px] font-medium text-amber-800">
                  Click đơn để tự động nạp khay giao món
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
                        LỆNH ĐIỀU PHỐI ĐANG THỰC HIỆN
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
              {/* Dynamic Visual Sequence Stepper with Realtime Indicators */}
              <div className="relative z-10">
                <div className={`grid gap-2 text-center ${
                  activeSequence.legs.length === 1 ? "grid-cols-3" : "grid-cols-4"
                }`}>
                  {/* Step 1: Central Kitchen */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shadow-inner flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] text-emerald-300/80 font-mono font-bold uppercase">
                        Khởi hành
                      </div>
                      <div className="text-xs font-black text-emerald-300 mt-0.5">
                        Bếp Trung Tâm
                      </div>
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono mt-1 font-bold">
                      Đã xuất phát ✓
                    </div>
                  </div>

                  {/* Dynamic Leg Steps */}
                  {activeSequence.legs.map((leg, idx) => {
                    const isCompleted = leg.status === "completed";
                    const isCurrent = activeSequence.currentLegIndex === idx;
                    return (
                      <div
                        key={leg.taskId || idx}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                          isCompleted
                            ? "bg-emerald-500/20 border-emerald-500/40"
                            : isCurrent
                              ? idx === 0
                                ? "bg-blue-600/40 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-blue-500/20"
                                : "bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400/40 shadow-lg shadow-indigo-500/20"
                              : "bg-white/5 border-white/10 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="text-[10px] text-cyan-200/80 font-mono font-bold uppercase">
                            Khay {leg.cargoLevel} (Tầng {leg.cargoLevel})
                          </div>
                          <div className="text-xs font-black text-white mt-0.5">
                            {leg.tableNo}
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-[9px] font-mono mt-1 ${
                              isCompleted
                                ? "text-emerald-400 font-bold"
                                : isCurrent
                                  ? "text-cyan-300 font-extrabold animate-pulse"
                                  : "text-slate-400"
                            }`}
                          >
                            {isCompleted
                              ? "Đã lấy món ✓"
                              : isCurrent
                                ? "Đang tới bàn..."
                                : `Chờ chặng ${idx}`}
                          </div>

                        </div>
                      </div>
                    );
                  })}

                  {/* Final Step: Back to Central Kitchen */}
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
              {/* DUAL CONFIRMATION TERMINAL */}
              {activeSequence.status === "in_progress" ? (
                <div className="p-4 rounded-xl bg-gradient-to-b from-blue-950/70 to-slate-900/95 border border-cyan-500/40 space-y-3.5 relative z-10 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/10">
                    <span className="flex items-center gap-2 text-xs font-black text-cyan-300 uppercase tracking-wide">
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>XÁC NHẬN TRẢ MÓN TẠI BÀN HOẶC TỪ XA</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                      <span>Đang Dừng Tại:</span>
                      <strong className="text-white">
                        {activeSequence.legs[activeSequence.currentLegIndex]?.tableNo || activeSequence.legs[0]?.tableNo}
                      </strong>
                    </span>
                  </div>
                  {/* Tray Guidance Banner */}
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
                          {activeSequence.legs.length === 1
                            ? `GIAO MÓN TỚI BÀN ${activeSequence.legs[0]?.tableNo}`
                            : `CHẶNG ${activeSequence.currentLegIndex + 1}: TRẢ MÓN BÀN ${activeSequence.legs[activeSequence.currentLegIndex]?.tableNo}`}
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/10 font-bold">
                          Chặng {activeSequence.currentLegIndex + 1}/{activeSequence.legs.length}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Chỉ lấy món ở:</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                            (activeSequence.legs[activeSequence.currentLegIndex]?.cargoLevel ?? 1) === 1
                              ? "bg-amber-400 text-slate-950 shadow-xs"
                              : "bg-indigo-400 text-slate-950 shadow-xs"
                          }`}
                        >
                          KHAY {activeSequence.legs[activeSequence.currentLegIndex]?.cargoLevel ?? 1} ({(activeSequence.legs[activeSequence.currentLegIndex]?.cargoLevel ?? 1) === 1 ? "TẦNG DƯỚI" : "TẦNG TRÊN"})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal">
                        {activeSequence.legs.length === 1 ? (
                          <>Khách tại bàn <strong>{activeSequence.legs[0]?.tableNo}</strong> nhận món xong, bấm nút trên thân robot (hoặc bếp xác nhận) để xe tự động quay về trạm bếp.</>
                        ) : activeSequence.currentLegIndex === 0 ? (
                          <>
                            Khách tại bàn <strong>{activeSequence.legs[0]?.tableNo}</strong> nhận món ở Khay 1.
                            Sau khi lấy món, bấm nút trên robot để xe tiếp tục tới bàn <strong>{activeSequence.legs[1]?.tableNo}</strong>.
                          </>
                        ) : (
                          <>
                            Khay 1 đã giao xong. Sau khi bàn <strong>{activeSequence.legs[1]?.tableNo}</strong> nhận khay 2, robot sẽ tự động quay về trạm bếp.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Phân định 2 kênh xác nhận: Kênh 1 (Tại Bàn) & Kênh 2 (Tại Bếp) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Kênh 1: Tại Bàn */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" />
                            Kênh 1 • Bấm Nút Trên Robot
                          </span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            Mặc Định
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Khách hoặc nhân viên tại bàn {activeSequence.legs[activeSequence.currentLegIndex]?.tableNo} nhấc món xong và ấn nút trên thân xe robot.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isConfirmingTable}
                        onClick={() => handleConfirmNextTable(true)}
                        className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/50"
                        title="Nhân viên hoặc khách bấm nút trên robot"
                      >
                        {isConfirmingTable ? (
                          <RotateCcw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Cpu className="w-4 h-4 text-amber-300" />
                        )}
                        <span>
                          {activeSequence.currentLegIndex >= activeSequence.legs.length - 1
                            ? "Bấm Nút Trên Robot (Xong Lượt)"
                            : "Bấm Nút Trên Robot (Đi Tiếp)"}
                        </span>
                      </button>
                    </div>
                    {/* Kênh 2: Tại Bếp */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5" />
                            Kênh 2 • Tại Bếp (Web KDS)
                          </span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                            Ghi Đè
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Dùng khi khách chưa bấm nút trên xe. Bếp quan sát rồi xác nhận điều phối từ xa.
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
                          {activeSequence.currentLegIndex >= activeSequence.legs.length - 1
                            ? "Xác Nhận (Web): Xe Quay Về Bếp"
                            : `Xác Nhận (Web): Đến ${activeSequence.legs[activeSequence.currentLegIndex + 1]?.tableNo || "Bàn Tiếp Theo"}`}
                        </span>
                      </button>
                    </div>
                  </div>
                  {/* Operational Override & Obstacle Control */}
                  <div className="pt-2 border-t border-white/10 flex justify-end">
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
                          ? "▶ Tiếp Tục Di Chuyển (Đã Dọn Vật Cản)"
                          : "⏸ Tạm Dừng Tránh Vật Cản Hành Lang"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-bold">
                      Toàn bộ lượt giao đã phục vụ thành công! Xe đã quay về trạm an toàn.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (transitTimerRef.current) clearTimeout(transitTimerRef.current);
                      setMissionPhase("idle");
                      setActiveSequence(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/30 transition-all cursor-pointer shadow-xs"
                  >
                    Tạo Lượt Mới
                  </button>
                </div>
              )}
            </div>
          )}
          {/* STAFF MOVE REQUEST FORM - UNIFIED 2-TRAY CONSOLE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight font-heading">
                  ĐIỀU PHỐI GIAO MÓN (DISPATCH CONSOLE)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Hệ Thống Sẵn Sàng</span>
                </span>
              </div>
            </div>

            {/* UNIFIED 2-TRAY FORM WITH EXPLICIT CONFIRMATION TOGGLE PER TRAY */}
            <div className="space-y-3.5">
              {/* TRAY 1 (LEVEL 1 - TẦNG DƯỚI) */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isTray1Active
                    ? "border-blue-300 bg-blue-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                      1
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      KHAY 1 (TẦNG DƯỚI)
                    </span>
                    {isTray1Active && (
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {isTray2Active && tray1Table !== tray2Table ? "Chặng 1" : "Đang dùng"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isTray1Active && (
                      <button
                        type="button"
                        onClick={() => setActiveTrayTarget("tray1")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          activeTrayTarget === "tray1"
                            ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 shadow-2xs"
                            : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {activeTrayTarget === "tray1" ? "🎯 Đang nhận bàn" : "Gán từ bản đồ"}
                      </button>
                    )}
                    {/* Confirmation toggle button */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isTray1Active;
                        setIsTray1Active(next);
                        if (next) setActiveTrayTarget("tray1");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isTray1Active
                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {isTray1Active ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>✓ Đang Dùng Khay 1</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-slate-500" />
                          <span>Bật Khay 1</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {isTray1Active ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-blue-100">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Bàn Đích Đến (Khay 1)
                      </label>
                      <select
                        value={tray1Table}
                        onChange={(e) => {
                          setTray1Table(e.target.value);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Chọn Bàn Giao Khay 1 --</option>
                        {tray1Table && !tables.some((t) => t.name === tray1Table) && (
                          <option value={tray1Table}>{tray1Table}</option>
                        )}
                        {tables.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {t.zone ? `[${t.zone}]` : ""} {t.stationName ? `• Trạm: ${t.stationName}` : ""}
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
                      {pendingOrders.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">Gợi ý:</span>
                          {pendingOrders.slice(0, 4).map((order) => {
                            const chip = order.orderNumber || order.id;
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  setTray1OrderId(chip);
                                  if (order.tableNo && !tray1Table) {
                                    setTray1Table(order.tableNo);
                                  }
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer shrink-0 ${
                                  tray1OrderId === chip
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic mt-1.5">
                    Khay 1 đang để trống. Nhấn [Bật Khay 1] nếu muốn nạp món vào tầng dưới.
                  </p>
                )}
              </div>

              {/* TRAY 2 (LEVEL 2 - TẦNG TRÊN) */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isTray2Active
                    ? "border-indigo-300 bg-indigo-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                      2
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      KHAY 2 (TẦNG TRÊN)
                    </span>
                    {isTray2Active && (
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        {isTray1Active && tray1Table !== tray2Table ? "Chặng 2" : "Đang dùng"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isTray2Active && (
                      <button
                        type="button"
                        onClick={() => setActiveTrayTarget("tray2")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          activeTrayTarget === "tray2"
                            ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 shadow-2xs"
                            : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        }`}
                      >
                        {activeTrayTarget === "tray2" ? "🎯 Đang nhận bàn" : "Gán từ bản đồ"}
                      </button>
                    )}
                    {/* Confirmation toggle button */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isTray2Active;
                        setIsTray2Active(next);
                        if (next) setActiveTrayTarget("tray2");
                      }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isTray2Active
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-2xs"
                        : "bg-white hover:bg-slate-100 text-slate-600 border-slate-300"
                    }`}
                  >
                    {isTray2Active ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>✓ Đang Dùng Khay 2</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Bật Khay 2</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {isTray2Active ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-indigo-100">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Bàn Đích Đến (Khay 2)
                      </label>
                      <select
                        value={tray2Table}
                        onChange={(e) => setTray2Table(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-indigo-200 bg-white text-xs font-bold text-slate-900 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Chọn Bàn Giao Khay 2 --</option>
                        {tray2Table && !tables.some((t) => t.name === tray2Table) && (
                          <option value={tray2Table}>{tray2Table}</option>
                        )}
                        {tables.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {t.zone ? `[${t.zone}]` : ""} {t.stationName ? `• Trạm: ${t.stationName}` : ""}
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
                      {pendingOrders.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">Gợi ý:</span>
                          {pendingOrders.slice(0, 4).map((order) => {
                            const chip = order.orderNumber || order.id;
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  setTray2OrderId(chip);
                                  if (order.tableNo && !tray2Table) {
                                    setTray2Table(order.tableNo);
                                  }
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer shrink-0 ${
                                  tray2OrderId === chip
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic mt-1.5">
                    Khay 2 đang để trống. Nhấn [Bật Khay 2] nếu muốn nạp thêm món tầng trên.
                  </p>
                )}
              </div>

              {/* DYNAMIC ROUTE PREVIEW */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      {!isTray1Active && !isTray2Active
                        ? "Chưa chọn khay giao món:"
                        : isTray1Active && isTray2Active
                          ? tray1Table === tray2Table
                            ? "Lộ trình giao 1 bàn (Cả 2 khay):"
                            : "Lộ trình chuỗi 2 bàn liên tiếp:"
                          : "Lộ trình giao 1 bàn:"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-800 font-bold bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs overflow-x-auto">
                    <span className="text-emerald-700">Bếp</span>
                    {isTray1Active && (() => {
                      const matched = tables.find((t) => t.name.toLowerCase() === tray1Table.toLowerCase());
                      const stLabel = matched?.stationName ? ` [Trạm: ${matched.stationName}]` : "";
                      return (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-blue-700 font-extrabold whitespace-nowrap">
                            {tray1Table || "Chưa chọn"}{stLabel} (Khay 1)
                          </span>
                        </>
                      );
                    })()}
                    {isTray2Active && (() => {
                      const matched = tables.find((t) => t.name.toLowerCase() === tray2Table.toLowerCase());
                      const stLabel = matched?.stationName ? ` [Trạm: ${matched.stationName}]` : "";
                      return (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-indigo-700 font-extrabold whitespace-nowrap">
                            {tray2Table || "Chưa chọn"}{stLabel} (Khay 2)
                          </span>
                        </>
                      );
                    })()}
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Về Bếp</span>
                  </div>
                </div>
                {/* Merged table warning if active trays have merged tables */}
                
              </div>
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
                (!isTray1Active && !isTray2Active) ||
                (isTray1Active && !tray1Table.trim()) ||
                (isTray2Active && !tray2Table.trim())
              }
              onClick={handleSmartDispatch}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isDispatching
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : !effectiveRobot ||
                      (!isTray1Active && !isTray2Active) ||
                      (isTray1Active && !tray1Table.trim()) ||
                      (isTray2Active && !tray2Table.trim())
                    ? "bg-slate-200 text-slate-400 border border-slate-300 shadow-none cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 cursor-pointer"
              }`}
            >
              {isDispatching ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG PHÁT LỆNH ĐIỀU PHỐI ROBOT...</span>
                </>
              ) : !effectiveRobot ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  <span>CHƯA CÓ ROBOT SẴN SÀNG</span>
                </>
              ) : !isTray1Active && !isTray2Active ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  <span>VUI LÒNG BẬT ÍT NHẤT 1 KHAY ĐỂ GIAO</span>
                </>
              ) : isTray1Active && !tray1Table.trim() ? (
                <>
                  <Send className="w-4 h-4 text-slate-400" />
                  <span>VUI LÒNG CHỌN BÀN CHO KHAY 1</span>
                </>
              ) : isTray2Active && !tray2Table.trim() ? (
                <>
                  <Send className="w-4 h-4 text-slate-400" />
                  <span>VUI LÒNG CHỌN BÀN CHO KHAY 2</span>
                </>
              ) : isTray1Active && isTray2Active ? (
                tray1Table === tray2Table ? (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>PHÁT LỆNH GIAO 2 KHAY TỚI {tray1Table}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>PHÁT LỆNH GIAO 2 BÀN: {tray1Table} ➔ {tray2Table}</span>
                  </>
                )
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>PHÁT LỆNH GIAO MÓN TỚI {isTray1Active ? tray1Table : tray2Table}</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
              <span>Hoạt động: Sẵn sàng ngoại tuyến • Lưu trữ cục bộ</span>
              <span>Robot: {effectiveRobot?.code || "AMR"}</span>
            </div>
          </div>
          {/* HÀNG ĐỢI NHIỆM VỤ TIẾP THEO CỦA ROBOT (ROBOT MISSION QUEUE) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-blue-600" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading">
                    HÀNG ĐỢI NHIỆM VỤ ROBOT
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Nhiệm vụ tiếp theo và chuyển hướng điều phối trực tiếp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {missionQueueTasks.length} nhiệm vụ
                </span>
              </div>
            </div>

            {/* List of Queue Tasks */}
            <div className="space-y-3">
              {missionQueueTasks.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                  <Clock className="w-6 h-6 text-slate-300" />
                  <span className="font-semibold text-slate-600">Hàng đợi nhiệm vụ đang trống</span>
                  <span className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-sans">
                    Nạp món vào Khay 1 / Khay 2 và nhấn [Phát Lệnh Giao Món] để tạo nhiệm vụ tiếp theo cho Robot AMR.
                  </span>
                </div>
              ) : (
                missionQueueTasks.map((task, idx) => {
                  const isCurrent = task.isLive;
                  const isCompleted = task.workflowStep === 4 && task.status.includes("Hoàn tất");
                  return (
                    <div
                      key={`${task.taskId}-${idx}`}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-2.5 ${
                        isCurrent
                          ? "bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border-blue-400 shadow-sm ring-1 ring-blue-300/60"
                          : isCompleted
                            ? "bg-slate-50/50 border-slate-200 opacity-80"
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {/* Top Row: Mission ID, Tray Badge, Robot, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              task.trayLevel === 1
                                ? "bg-blue-600 text-white"
                                : "bg-indigo-600 text-white"
                            }`}
                          >
                            Khay {task.trayLevel}
                          </span>
                          <span className="font-mono font-extrabold text-xs text-slate-900">
                            #{task.taskId}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            🤖 {task.robotCode}
                          </span>
                        </div>
                        {/* Status Badge with Live Pulse */}
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isCurrent
                                  ? task.workflowStep === 2
                                    ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                                    : task.workflowStep === 3
                                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                                      : "bg-indigo-100 text-indigo-800 border-indigo-300"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Details (Destination, Station, Order, Time) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-slate-400 font-semibold text-[11px]">Đích đến:</span>
                          <span className="font-black text-slate-900 text-sm">
                            {task.tableNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="text-slate-400 font-semibold text-[11px]">Trạm robot:</span>
                          {task.stationName ? (
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-purple-600" />
                              <span>{task.stationName}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                              Chưa gán trạm
                            </span>
                          )}
                        </div>
                        {task.orderId && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400 font-semibold text-[11px]">Đơn món:</span>
                            <span className="font-mono font-semibold text-slate-800 text-[11px]">
                              {task.orderId}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{task.time}</span>
                        </div>
                      </div>

                      {/* Bottom Action Bar: Đổi Bàn, Đổi Trạm, Xem Chi Tiết */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenTaskReroute(task.legIndex, task.tableNo)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Đổi bàn đích đến cho nhiệm vụ này"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                          <span>Đổi Bàn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTaskAssignStation(task.tableNo)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-800 border border-purple-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Gán hoặc đổi trạm dừng SLAM cho bàn này"
                        >
                          <MapPin className="w-3.5 h-3.5 text-purple-600" />
                          <span>Đổi Trạm Giao</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTaskDetail(task)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ml-auto"
                          title="Xem tiến trình chi tiết 4 bước phục vụ của nhiệm vụ này"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Xem Chi Tiết</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
      {/* STICKY BOTTOM DISPATCH BAR FOR MOBILE TABLETS & POS (Thumb-friendly Action Zone) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3 safe-area-pb">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-mono font-extrabold text-blue-700 text-sm shrink-0 shadow-2xs">
            {isTray1Active && isTray2Active ? "2K" : isTray1Active ? "K1" : isTray2Active ? "K2" : "--"}
          </div>
          <div className="truncate">
            <div className="text-xs font-extrabold text-slate-900 truncate">
              {isTray1Active && isTray2Active
                ? `${tray1Table || "K1"} ➔ ${tray2Table || "K2"}`
                : isTray1Active
                  ? `Khay 1: ${tray1Table || "Chưa chọn bàn"}`
                  : isTray2Active
                    ? `Khay 2: ${tray2Table || "Chưa chọn bàn"}`
                    : "Chưa bật khay"}
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
            (!isTray1Active && !isTray2Active) ||
            (isTray1Active && !tray1Table.trim()) ||
            (isTray2Active && !tray2Table.trim())
          }
          onClick={handleSmartDispatch}
          className={`px-5 py-3 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-2 min-h-[46px] ${
            isDispatching
              ? "bg-blue-400 text-white cursor-not-allowed"
              : !effectiveRobot ||
                  (!isTray1Active && !isTray2Active) ||
                  (isTray1Active && !tray1Table.trim()) ||
                  (isTray2Active && !tray2Table.trim())
                ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-blue-500/25 cursor-pointer"
          }`}
        >
          {isDispatching ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Đang Lệnh...</span>
            </>
          ) : isTray1Active && isTray2Active ? (
            tray1Table === tray2Table ? (
              <>
                <Send className="w-4 h-4" />
                <span>GIAO 2 KHAY ({tray1Table})</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>CHUỖI 2 BÀN ({tray1Table} ➔ {tray2Table})</span>
              </>
            )
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>XUẤT LỆNH ({isTray1Active ? tray1Table : tray2Table})</span>
            </>
          )}
        </button>
      </div>
      {/* MODAL ĐỔI BÀN & CHUYỂN HƯỚNG GIAO MÓN (HIỂN THỊ TIẾN TRÌNH QUY TRÌNH REALTIME & XỬ LÝ THEO TÌNH HUỐNG) */}
      {isRerouteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-800 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-heading flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  </div>
                  <span>Đổi Bàn &amp; Chuyển Hướng Giao Món</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeSequence ? (
                    <>
                      Lượt giao <strong className="font-mono text-slate-800">{activeSequence.sequenceId}</strong> • Robot <strong className="font-mono text-slate-800">{activeSequence.robotCode}</strong> ({activeSequence.robotName})
                    </>
                  ) : (
                    "Điều phối giao món tại Quầy Bếp (Chưa xuất lệnh robot)"
                  )}
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

            {/* SignalR & Robot Live Status Indicator Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">
                  {activeSequence ? `Robot ${activeSequence.robotCode}:` : "Bộ điều phối:"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    !activeSequence
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : isRobotInTransit
                        ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                        : liveRobotStatus === "arrived"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  {!activeSequence
                    ? "● Sẵn Sàng (Tại Bếp)"
                    : isRobotInTransit
                      ? "● in_transit (Đang Di Chuyển)"
                      : liveRobotStatus === "arrived"
                        ? "● arrived (Đã Đến Bàn)"
                        : `● ${liveRobotStatus}`}
                </span>
              </div>
              <div>
                {isSignalRConnected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SignalR Realtime
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Mất kết nối
                  </span>
                )}
              </div>
            </div>

            {/* THÔNG TIN TIẾN TRÌNH: QUY TRÌNH GIAO ĐANG TỚI ĐÂU */}
            <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5 font-heading">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <span>Quy Trình Giao Đang Tới Đâu:</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    !activeSequence
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : currentWorkflowStep === 1
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : currentWorkflowStep === 2
                          ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                          : currentWorkflowStep === 3
                            ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                            : "bg-indigo-100 text-indigo-800 border-indigo-300"
                  }`}
                >
                  {!activeSequence
                    ? "Tại Bếp (Soạn Khay)"
                    : currentWorkflowStep === 1
                      ? "Bước 1/4: Xuất Bếp"
                      : currentWorkflowStep === 2
                        ? "Bước 2/4: Đến Bàn (Đang Di Chuyển)"
                        : currentWorkflowStep === 3
                          ? "Bước 3/4: Trả Món (Tại Bàn)"
                          : "Bước 4/4: Về Bếp"}
                </span>
              </div>

              {/* 4-Step Mini Pipeline Stepper */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {/* Step 1: Xuất Bếp */}
                <div
                  className={`p-2 rounded-xl border text-center transition-all ${
                    !activeSequence || currentWorkflowStep === 1
                      ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/40 font-bold shadow-xs"
                      : currentWorkflowStep > 1
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                        : "bg-white border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <div className="text-[9px] uppercase font-mono font-bold">1. Xuất Bếp</div>
                  <div className="text-[10px] font-extrabold mt-0.5 truncate">Quầy Bếp</div>
                  <div className="text-[8.5px] font-mono mt-0.5 font-bold">
                    {!activeSequence
                      ? "Soạn khay"
                      : currentWorkflowStep === 1
                        ? "Đang nạp món"
                        : "Đã xong ✓"}
                  </div>
                </div>

                {/* Step 2: Đến Bàn */}
                <div
                  className={`p-2 rounded-xl border text-center transition-all ${
                    activeSequence && currentWorkflowStep === 2
                      ? "bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/40 font-bold shadow-md shadow-blue-500/10 animate-pulse"
                      : activeSequence && currentWorkflowStep > 2
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                        : "bg-white border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <div className="text-[9px] uppercase font-mono font-bold">2. Đến Bàn</div>
                  <div className="text-[10px] font-extrabold mt-0.5 truncate">In-Transit</div>
                  <div className="text-[8.5px] font-mono mt-0.5 font-bold">
                    {activeSequence && currentWorkflowStep === 2
                      ? "Đang chạy tới bàn"
                      : activeSequence && currentWorkflowStep > 2
                        ? "Đã tới bàn ✓"
                        : "Chưa tới"}
                  </div>
                </div>

                {/* Step 3: Trả Món */}
                <div
                  className={`p-2 rounded-xl border text-center transition-all ${
                    activeSequence && currentWorkflowStep === 3
                      ? "bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/40 font-bold shadow-md shadow-amber-500/10 animate-pulse"
                      : activeSequence && currentWorkflowStep > 3
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                        : "bg-white border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <div className="text-[9px] uppercase font-mono font-bold">3. Trả Món</div>
                  <div className="text-[10px] font-extrabold mt-0.5 truncate">Tại Bàn</div>
                  <div className="text-[8.5px] font-mono mt-0.5 font-bold">
                    {activeSequence && currentWorkflowStep === 3
                      ? "Khách nhận món"
                      : activeSequence && currentWorkflowStep > 3
                        ? "Đã trả xong ✓"
                        : "Chờ đến"}
                  </div>
                </div>

                {/* Step 4: Về Bếp */}
                <div
                  className={`p-2 rounded-xl border text-center transition-all ${
                    activeSequence && currentWorkflowStep === 4
                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/40 font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <div className="text-[9px] uppercase font-mono font-bold">4. Về Bếp</div>
                  <div className="text-[10px] font-extrabold mt-0.5 truncate">Quay Về</div>
                  <div className="text-[8.5px] font-mono mt-0.5 font-bold">
                    {activeSequence && currentWorkflowStep === 4 ? "Đang quay về" : "Tự động"}
                  </div>
                </div>
              </div>

              {/* Tình Huống Cụ Thể (Situational Context & Action Guidance) */}
              <div
                className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-all shadow-2xs ${
                  !activeSequence || currentWorkflowStep === 1
                    ? "bg-emerald-50/90 border-emerald-200/90 text-emerald-950"
                    : currentWorkflowStep === 2
                      ? "bg-blue-50/90 border-blue-200/90 text-blue-950"
                      : currentWorkflowStep === 3
                        ? "bg-amber-50/90 border-amber-200/90 text-amber-950"
                        : "bg-indigo-50/90 border-indigo-200/90 text-indigo-950"
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5 mb-1 text-[11.5px]">
                  {!activeSequence || currentWorkflowStep === 1 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tình huống: Đổi bàn khi món còn ở Bếp (Xuất Bếp)</span>
                    </>
                  ) : currentWorkflowStep === 2 ? (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />
                      <span>Tình huống: Khách đổi chỗ khi Robot đang trên đường đi (In-Transit)</span>
                    </>
                  ) : currentWorkflowStep === 3 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Tình huống: Robot đã tới bàn cũ nhưng khách đã sang bàn mới (Trả Món)</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Tình huống: Robot đang trên đường quay về Bếp</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {!activeSequence
                    ? "Robot chưa phát lệnh xuất bến. Thao tác đổi bàn sẽ cập nhật ngay bàn đích mới trên khay soạn của bộ điều phối."
                    : currentWorkflowStep === 1
                      ? `Món ăn đang ở quầy bếp. Đổi bàn lúc này sẽ cập nhật ngay bàn đích xuất phát cho Khay ${rerouteLegIndex + 1}, robot sẽ xuất bến đi thẳng tới bàn mới.`
                      : currentWorkflowStep === 2
                        ? `Robot đang chạy tới ${activeSequence.legs[rerouteLegIndex]?.tableNo || "Bàn cũ"}. Hệ thống sẽ gửi lệnh Reroute lập tức để AMR bẻ lái chuyển hướng trong thời gian thực sang bàn mới mà không cần quay về bếp.`
                        : currentWorkflowStep === 3
                          ? `Robot đã dừng tại ${activeSequence.legs[rerouteLegIndex]?.tableNo || "Bàn cũ"}. Bạn có thể chọn bàn mới để robot di chuyển tiếp, hoặc nhân viên tại sảnh hỗ trợ chuyển món từ khay tới bàn của khách.`
                          : "Robot đã hoàn tất trả món và đang trở về trạm sạc bếp. Chọn bàn mới nếu cần điều hướng robot phục vụ tiếp."}
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Tray Selector */}
              {activeSequence && activeSequence.legs.length > 1 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn Khay Cần Đổi Bàn:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeSequence.legs.map((leg, idx) => {
                      const isLegDone = leg.status === "completed";
                      const isSelected = rerouteLegIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isLegDone}
                          onClick={() => {
                            setRerouteLegIndex(idx);
                            const other = activeSequence.legs.find((_, i) => i !== idx)?.tableNo;
                            const avail = tables.find(
                              (t) =>
                                t.name !== leg.tableNo &&
                                t.name !== other &&
                                t.status !== "occupied" &&
                                t.status !== "serving",
                            );
                            setRerouteNewTable(avail?.name || "");
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs"
                              : isLegDone
                                ? "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                                : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                            <span className={isSelected ? "text-blue-700" : "text-slate-500"}>
                              Khay {leg.cargoLevel} (Tầng {leg.cargoLevel})
                            </span>
                            {isLegDone && <span className="text-emerald-600">Đã xong ✓</span>}
                          </div>
                          <div className="text-xs font-black text-slate-900 mt-0.5">
                            Bàn: {leg.tableNo}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : !activeSequence ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn Khay Cần Đổi Bàn (Dispatch Console):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRerouteLegIndex(0);
                        const avail = tables.find(
                          (t) =>
                            t.name !== tray1Table &&
                            t.name !== tray2Table &&
                            t.status !== "occupied" &&
                            t.status !== "serving",
                        );
                        setRerouteNewTable(avail?.name || "");
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        rerouteLegIndex === 0
                          ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold text-blue-700">
                        Khay 1 (Tầng Dưới)
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {tray1Table || "Chưa chọn bàn"}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRerouteLegIndex(1);
                        const avail = tables.find(
                          (t) =>
                            t.name !== tray2Table &&
                            t.name !== tray1Table &&
                            t.status !== "occupied" &&
                            t.status !== "serving",
                        );
                        setRerouteNewTable(avail?.name || "");
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        rerouteLegIndex === 1
                          ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold text-blue-700">
                        Khay 2 (Tầng Trên)
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {tray2Table || "Chưa chọn bàn"}
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* From-To Visual Indicator */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 font-semibold uppercase">
                    Khay {rerouteLegIndex + 1} Hiện Tại
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {activeSequence
                      ? activeSequence.legs[rerouteLegIndex]?.tableNo
                      : rerouteLegIndex === 0
                        ? tray1Table || "Chưa chọn"
                        : tray2Table || "Chưa chọn"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                  <span>Đổi Sang</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
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

              {/* Target Table Dropdown - Filtered Valid Tables */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn Bàn Đích Mới (Khả Dụng):
                </label>
                <select
                  value={rerouteNewTable}
                  onChange={(e) => setRerouteNewTable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Chọn bàn đích chuyển hướng --</option>
                  {tables
                    .filter((t) => {
                      const curTable = activeSequence
                        ? activeSequence.legs[rerouteLegIndex]?.tableNo
                        : rerouteLegIndex === 0
                          ? tray1Table
                          : tray2Table;
                      const otherLegTable = activeSequence
                        ? activeSequence.legs.find((_, i) => i !== rerouteLegIndex)?.tableNo
                        : rerouteLegIndex === 0
                          ? tray2Table
                          : tray1Table;
                      return (
                        t.name !== curTable &&
                        t.name !== otherLegTable &&
                        t.status !== "occupied" &&
                        t.status !== "serving"
                      );
                    })
                    .map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.zone || "Khu Bàn Ăn"}) {t.stationName ? `• Trạm: ${t.stationName}` : ""}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  * Hệ thống chỉ hiển thị bàn trống/sẵn sàng, loại trừ bàn hiện tại và bàn đang có khách dùng bữa.
                </span>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do chuyển bàn (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={rerouteReason}
                  onChange={(e) => setRerouteReason(e.target.value)}
                  placeholder="Ví dụ: Khách đổi sang bàn phòng lạnh, chuyển chỗ..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
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
                className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-all flex items-center gap-1.5 ${
                  !isSubmittingReroute && rerouteNewTable
                    ? "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/15 cursor-pointer"
                    : "bg-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>
                  {isSubmittingReroute
                    ? "Đang Xử Lý Đổi Bàn..."
                    : !activeSequence
                      ? "Xác Nhận Đổi Bàn (Khay Bếp)"
                      : currentWorkflowStep === 2
                        ? "Xác Nhận Reroute Robot AMR"
                        : "Xác Nhận Đổi Bàn"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 1: TẠO BÀN ĂN MỚI */}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
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
                    Số Chỗ Ngồi (Sức Chứa)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTableCapacity}
                    onChange={(e) =>
                      setNewTableCapacity(parseInt(e.target.value, 10) || 4)
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khu Vực (Zone)
                  </label>
                  <input
                    type="text"
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    placeholder="Ví dụ: Khu Trong Nhà"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gán Trạm Robot SLAM (Tùy chọn)
                </label>
                <select
                  value={newTableStationId}
                  onChange={(e) => setNewTableStationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Chưa gán trạm --</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name} ({s.stationType || "Bàn"})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  * Nếu bàn nằm ở vị trí robot không tới được, có thể gán trạm gần nhất tại đây hoặc dùng tính năng &quot;Gán Trạm Robot&quot;.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateTable || !newTableNo.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
      {/* MODAL: GÁN TRẠM ROBOT (WAYPOINT) */}
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
                  Liên kết bàn ăn với tọa độ điểm dừng của Robot AMR trên bản đồ SLAM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignStationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
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
                  Khi bếp phát lệnh giao món tới bàn này, Robot AMR sẽ tự động di chuyển đến tọa độ của trạm được chọn để phục vụ.
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
                  Xung Đột Đổi Bàn: Robot Đã Đến Trạm Cũ
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
                disabled={isSubmittingManualHandover}
                onClick={handleConfirmManualHandover}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmittingManualHandover ? "Đang Xử Lý..." : "1. Bàn Giao Thủ Công (Về Bếp)"}
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
                    : "2. Robot Tự Động Đến Bàn Mới"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT TIẾN TRÌNH NHIỆM VỤ ROBOT (4 BƯỚC PHỤC VỤ TỰ ĐỘNG) */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 text-slate-800 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Navigation className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                    <span>Tiến Trình Nhiệm Vụ #{selectedTaskDetail.taskId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        selectedTaskDetail.trayLevel === 1
                          ? "bg-blue-600 text-white"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      Khay {selectedTaskDetail.trayLevel}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Theo dõi quy trình phục vụ tự động và chuyển hướng điều phối trực tiếp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Information Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Robot AMR:</span>
                <span className="font-extrabold text-slate-900 text-sm">🤖 {selectedTaskDetail.robotCode}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Bàn Đích Đến:</span>
                <span className="font-extrabold text-blue-700 text-sm">{selectedTaskDetail.tableNo}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Trạm Robot:</span>
                <span className="font-mono font-bold text-purple-700 text-xs">
                  {selectedTaskDetail.stationName || "Chưa gán trạm"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Thời Gian Xuất:</span>
                <span className="font-mono text-slate-700 text-xs">{selectedTaskDetail.time || "Vừa xong"}</span>
              </div>
            </div>

            {/* 4-Step Interactive Pipeline */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/70 via-slate-50/60 to-white border border-blue-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <span className="font-bold text-blue-950 text-xs flex items-center gap-1.5 font-heading">
                  <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>QUY TRÌNH PHỤC VỤ TỰ ĐỘNG</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-white text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                  {selectedTaskDetail.isLive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                  )}
                  <span>
                    {selectedTaskDetail.workflowStep === 1
                      ? "Bước 1/4 • Nạp Món Tại Bếp"
                      : selectedTaskDetail.workflowStep === 2
                        ? `Bước 2/4 • Đang Đến ${selectedTaskDetail.tableNo}`
                        : selectedTaskDetail.workflowStep === 3
                          ? `Bước 3/4 • Trả Món Tại ${selectedTaskDetail.tableNo}`
                          : "Bước 4/4 • Tự Động Về Bếp"}
                  </span>
                </span>
              </div>

              {/* 4 Steps Visual Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono">
                {/* STEP 1: XUẤT BẾP */}
                {(() => {
                  const isActive = selectedTaskDetail.workflowStep === 1;
                  const isDone = selectedTaskDetail.workflowStep > 1;
                  return (
                    <div
                      className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isActive
                          ? "bg-blue-50/90 border-blue-500 text-blue-950 shadow-md ring-2 ring-blue-400/50"
                          : isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-white/80 border-slate-200 text-slate-500 opacity-75"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none" />
                      )}
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                          ) : isDone ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              isActive ? "text-blue-700" : isDone ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Đang Ở Bếp" : isDone ? "Đã Xong" : "Chờ"}
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900">1. Xuất Bếp</div>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-200/50 text-[9.5px] font-sans text-slate-500">
                        {isDone ? "Đã nạp món ✓" : "Nạp khay tại quầy"}
                      </div>
                    </div>
                  );
                })()}

                {/* STEP 2: ĐẾN BÀN */}
                {(() => {
                  const isActive = selectedTaskDetail.workflowStep === 2;
                  const isDone = selectedTaskDetail.workflowStep > 2;
                  return (
                    <div
                      className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isActive
                          ? "bg-blue-50/90 border-blue-600 text-blue-950 shadow-md ring-2 ring-blue-500/60"
                          : isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-white/80 border-slate-200 text-slate-500 opacity-75"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-500/10 animate-pulse pointer-events-none" />
                      )}
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                          ) : isDone ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              isActive ? "text-blue-700" : isDone ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Đang Chạy" : isDone ? "Đã Xong" : "Chờ"}
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900">2. Đến Bàn</div>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-200/50 text-[9.5px] font-sans text-slate-500 truncate">
                        {isActive
                          ? `Đang tới ${selectedTaskDetail.tableNo}...`
                          : isDone
                            ? `Đã đến ${selectedTaskDetail.tableNo} ✓`
                            : "Di chuyển theo SLAM"}
                      </div>
                    </div>
                  );
                })()}

                {/* STEP 3: TRẢ MÓN */}
                {(() => {
                  const isActive = selectedTaskDetail.workflowStep === 3;
                  const isDone = selectedTaskDetail.workflowStep > 3;
                  return (
                    <div
                      className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isActive
                          ? "bg-amber-50/90 border-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400/60"
                          : isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-white/80 border-slate-200 text-slate-500 opacity-75"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-amber-500/10 animate-pulse pointer-events-none" />
                      )}
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                            </span>
                          ) : isDone ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              isActive ? "text-amber-800" : isDone ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Đang Trả Món" : isDone ? "Đã Xong" : "Chờ"}
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900">3. Trả Món</div>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-200/50 text-[9.5px] font-sans text-slate-500 truncate">
                        {isActive ? "Chờ khách nhận món" : isDone ? "Khách đã lấy món ✓" : "Nhận món tại bàn"}
                      </div>
                    </div>
                  );
                })()}

                {/* STEP 4: VỀ BẾP */}
                {(() => {
                  const isActive = selectedTaskDetail.workflowStep === 4 && !selectedTaskDetail.status.includes("Hoàn tất");
                  const isDone = selectedTaskDetail.workflowStep === 4 && selectedTaskDetail.status.includes("Hoàn tất");
                  return (
                    <div
                      className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isActive
                          ? "bg-teal-50/90 border-teal-500 text-teal-950 shadow-md ring-2 ring-teal-400/60"
                          : isDone
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-white/80 border-slate-200 text-slate-500 opacity-75"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-teal-500/10 animate-pulse pointer-events-none" />
                      )}
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                            </span>
                          ) : isDone ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              isActive ? "text-teal-800" : isDone ? "text-emerald-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {isActive ? "Đang Về" : isDone ? "Hoàn Tất" : "Chờ"}
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900">4. Về Bếp</div>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-200/50 text-[9.5px] font-sans text-slate-500 truncate">
                        {isDone ? "Đã về bến an toàn ✓" : "Quay về quầy bếp"}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Quick Actions Footer inside Detail Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const task = selectedTaskDetail;
                    setSelectedTaskDetail(null);
                    handleOpenTaskReroute(task.legIndex, task.tableNo);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đổi Bàn Nhiệm Vụ Này</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const task = selectedTaskDetail;
                    setSelectedTaskDetail(null);
                    handleOpenTaskAssignStation(task.tableNo);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-purple-600" />
                  <span>Đổi Trạm Giao</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedTaskDetail.workflowStep === 3 && activeSequence && (
                  <button
                    type="button"
                    disabled={isConfirmingTable}
                    onClick={() => {
                      setSelectedTaskDetail(null);
                      handleConfirmNextTable(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Xác Nhận Đã Nhận Món</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTaskDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};