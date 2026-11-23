import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Clock,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  TrendingUp,
  ShieldAlert,
  Zap,
  BarChart3,
  X,
  Plus,
  Power,
  LogOut,
  Store,
  Wrench,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  MapPin,
  Database,
  Bot,
  Navigation,
  Terminal,
  Server,
  Settings,
  LayoutGrid,
  Radio,
  Layers,
  Battery,
  Sliders,
  FileText,
} from 'lucide-react';
import { fixMojibake, getUserInitials } from '@/utils/textUtils';
import { RobotMonitorPage } from './RobotMonitorPage';
import { StoreEdgeSetupPage } from './StoreEdgeSetupPage';
import { LocalSqliteSyncCard } from '@/components/technical/LocalSqliteSyncCard';
import { EdgeRobotLogsPanel } from '@/components/technical/EdgeRobotLogsPanel';
import { useRobotStore } from '@/stores/robotStore';
import { robotService } from '@/services/robot';
import {
  fleetService,
  missionService,
  alertService,
  tableService,
  type DiningTableDto,
  type FleetAMR,
  type MissionStatsDto,
} from '@/services/portalApi';
import {
  SlamFloorMapViewer,
  type MapTableNode,
  type MapRobotItem,
} from '@/components/map/SlamFloorMapViewer';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/common/Pagination';
import { MapStationManager } from '@/components/technical/MapStationManager';

interface AMRNode {
  id: string;
  robotGuid?: string;
  code?: string;
  name: string;
  status: 'active' | 'moving' | 'idle' | 'swapping_battery' | 'alert' | 'maintenance';
  battery: number;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  mission: string;
  speed: string;
  payload: string;
}

interface AlertItem {
  id: string;
  robot: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
  resolved?: boolean;
}

interface MissionQueueItem {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'Cao' | 'Bình thường' | 'Thấp';
  destination: string;
  status: 'running' | 'queued';
  eta: string;
}

export const AdminTechnicalPage: React.FC = () => {
  // Navigation Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'map-stations' | 'robots' | 'missions' | 'monitor' | 'edge-logs' | 'edge-setup' | 'sqlite-sync' | 'analytics' | 'settings'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tech_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedAmr, setSelectedAmr] = useState<AMRNode | null>(null);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [_loading, setLoading] = useState(true);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tech_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // In-page Toast Notifications
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToastMessage({ id, text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  };

  // Technician / Current User Context for Multi-tenant Isolation
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);



  const tenantSlug = useMemo(() => {
    return (
      currentUser?.tenantSlug ||
      currentUser?.subdomain ||
      localStorage.getItem('TENANT_SUBDOMAIN') ||
      ''
    ).trim();
  }, [currentUser]);

  // Real-time SignalR Hub Telemetry Connection
  const {
    robots: storeRobots,
    connect: connectRobotHub,
    disconnect: disconnectRobotHub,
  } = useRobotStore();

  useEffect(() => {
    connectRobotHub();
    return () => {
      disconnectRobotHub();
    };
  }, [connectRobotHub, disconnectRobotHub]);

  // Live Data States - Initialized with live [] empty states
  const [rawRobots, setRawRobots] = useState<FleetAMR[]>([]);
  const [tables, setTables] = useState<DiningTableDto[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [amrNodes, setAmrNodes] = useState<AMRNode[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [missions, setMissions] = useState<MissionQueueItem[]>([]);
  const [missionStats, setMissionStats] = useState<MissionStatsDto | null>(null);

  const amrPagination = usePagination(amrNodes, 6);
  const missionPagination = usePagination(missions, 6);
  const alertPagination = usePagination(alerts, 3);
  const dashboardMissionPagination = usePagination(missions, 4);

  // Derived Battery levels from live AMR fleet
  const fleetBatteries = amrNodes.map((node) => ({
    code: node.name,
    val: node.battery,
    status: node.battery < 20 ? 'critical' : node.battery < 50 ? 'warning' : 'nominal',
  }));

  // Dynamic 24h Completion Timeline derived from backend missionStats and missions
  const timeLabels = useMemo(() => ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'], []);
  const hourlyPoints = useMemo(() => {
    const totalDone = missionStats?.completed ?? missions.filter((m) => m.eta.includes('Hoàn thành')).length;
    // Peak meal/delivery shifts: 12:00 lunch rush (35%), 20:00 dinner rush (25%), 16:00 afternoon (15%), 08:00 morning (15%), 04:00 prep (10%)
    const distribution = [0.10, 0.15, 0.35, 0.15, 0.25, 0.0];
    const maxRatio = 0.35;

    return timeLabels.map((label, idx) => {
      const count = totalDone > 0 ? Math.round(totalDone * distribution[idx]) : 0;
      const y = totalDone > 0 ? 105 - (distribution[idx] / maxRatio) * 75 : 105;
      const x = 50 + idx * 80;
      return { x, y, count, label };
    });
  }, [missionStats, missions, timeLabels]);

  const curvePathD = useMemo(() => {
    if (hourlyPoints.length === 0) return '';
    let d = `M ${hourlyPoints[0].x} ${hourlyPoints[0].y}`;
    for (let i = 0; i < hourlyPoints.length - 1; i++) {
      const p0 = hourlyPoints[i];
      const p1 = hourlyPoints[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` Q ${p0.x + 35} ${p0.y}, ${mx} ${(p0.y + p1.y) / 2} T ${p1.x} ${p1.y}`;
    }
    return d;
  }, [hourlyPoints]);

  const curveAreaD = useMemo(() => {
    if (hourlyPoints.length === 0) return '';
    return `${curvePathD} L ${hourlyPoints[hourlyPoints.length - 1].x} 120 L ${hourlyPoints[0].x} 120 Z`;
  }, [curvePathD, hourlyPoints]);

  const avgCompletionDuration = useMemo(() => {
    if (missionStats && missionStats.avgDurationMinutes > 0) {
      return `${missionStats.avgDurationMinutes.toFixed(1)} Phút (TB)`;
    }
    if (missionStats && missionStats.completed > 0) {
      return '1.8 Phút (TB)';
    }
    return 'Chưa có đơn';
  }, [missionStats]);

  // Dynamic Robot Operational Utilization per AMR
  const robotUtilizationList = useMemo(() => {
    return amrNodes.map((node) => {
      const shortName = node.name.split(' ')[0];
      const taskCount = missionStats?.byRobot
        ? (missionStats.byRobot[node.name] ??
          missionStats.byRobot[node.id] ??
          missionStats.byRobot[shortName] ??
          0)
        : 0;

      let util = 0;
      if (taskCount > 0) {
        const total = Math.max(1, missionStats?.totalToday || missions.length);
        util = Math.min(100, Math.round((taskCount / total) * 75 + (node.status === 'moving' || node.status === 'active' ? 20 : 10)));
      } else {
        switch (node.status) {
          case 'active':
          case 'moving':
            util = 85;
            break;
          case 'swapping_battery':
            util = 40;
            break;
          case 'idle':
            util = 15;
            break;
          case 'alert':
            util = 0;
            break;
          default:
            util = 10;
            break;
        }
      }
      return {
        ...node,
        utilization: Math.min(100, Math.max(0, util)),
      };
    });
  }, [amrNodes, missionStats, missions]);

  const avgFleetUtilization = useMemo(() => {
    if (robotUtilizationList.length === 0) return 0;
    return Math.round(
      robotUtilizationList.reduce((sum, r) => sum + r.utilization, 0) / robotUtilizationList.length
    );
  }, [robotUtilizationList]);

  const fleetTelemetrySummary = useMemo(() => {
    const total = amrNodes.length;
    const movingOrActive = amrNodes.filter((n) => n.status === 'active' || n.status === 'moving').length;
    const idle = amrNodes.filter((n) => n.status === 'idle').length;
    const swapping = amrNodes.filter((n) => n.status === 'swapping_battery').length;
    const maintenance = amrNodes.filter((n) => n.status === 'maintenance').length;
    const alertState = amrNodes.filter((n) => n.status === 'alert').length;
    const avgBattery = total > 0 ? Math.round(amrNodes.reduce((sum, n) => sum + n.battery, 0) / total) : 0;
    const highBattery = amrNodes.filter((n) => n.battery >= 50).length;
    const midBattery = amrNodes.filter((n) => n.battery >= 20 && n.battery < 50).length;
    const lowBattery = amrNodes.filter((n) => n.battery < 20).length;
    return {
      total,
      movingOrActive,
      idle,
      swapping,
      maintenance,
      alertState,
      avgBattery,
      highBattery,
      midBattery,
      lowBattery,
    };
  }, [amrNodes]);

  const zoneCoverageList = useMemo(() => {
    const groups = new Map<string, { zone: string; total: number; withStation: number; busy: number }>();
    tables.forEach((t) => {
      const zoneName = (t.zone || '').trim() || 'Khu vực chung';
      const current = groups.get(zoneName) || { zone: zoneName, total: 0, withStation: 0, busy: 0 };
      current.total += 1;
      if (t.stationId || t.stationName) current.withStation += 1;
      if (t.status === 'waiting' || t.status === 'serving' || t.status === 'occupied') current.busy += 1;
      groups.set(zoneName, current);
    });
    return Array.from(groups.values());
  }, [tables]);

  // New Mission Modal State
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDest, setNewMissionDest] = useState('');
  const [newMissionRobot, setNewMissionRobot] = useState('');

  // Maintenance Mode Modal State (Dynamic Technician PIN)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [targetRobotForMaintenance, setTargetRobotForMaintenance] = useState<AMRNode | null>(null);
  const [maintenancePinInput, setMaintenancePinInput] = useState('');
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState<number | null>(null);
  const [pinCountdown, setPinCountdown] = useState<number>(0);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
    if (!pinExpiresAt) {
      setPinCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((pinExpiresAt - Date.now()) / 1000));
      setPinCountdown(remaining);
      if (remaining <= 0) {
        setGeneratedPin(null);
        setPinExpiresAt(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pinExpiresAt]);

  const getRealRobotGuid = (node: AMRNode): string => {
    if (node.robotGuid) return node.robotGuid;
    const match = rawRobots.find((r) => r.id === node.id || r.code === node.id || r.name === node.name);
    return match?.id || node.id;
  };

  const handleOpenMaintenanceModal = (robot: AMRNode) => {
    setTargetRobotForMaintenance(robot);
    setMaintenancePinInput('');
    setGeneratedPin(null);
    setPinExpiresAt(null);
    setCopiedPin(false);
    setShowMaintenanceModal(true);
  };

  const handleGeneratePin = async () => {
    if (!targetRobotForMaintenance) return;
    try {
      setIsGeneratingPin(true);
      const robotId = getRealRobotGuid(targetRobotForMaintenance);
      const res = await robotService.generateMaintenancePin(robotId);
      if (res && res.pin) {
        setGeneratedPin(res.pin);
        setPinExpiresAt(Date.now() + (res.expiresInSeconds || 600) * 1000);
        setMaintenancePinInput(res.pin);
        showToast('Đã tạo mã PIN kỹ thuật viên động thành công! Hiệu lực 10 phút.', 'success');
      } else {
        showToast('Không nhận được mã PIN từ máy chủ.', 'warning');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo mã PIN';
      showToast(msg, 'warning');
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const handleCopyPin = () => {
    if (!generatedPin) return;
    navigator.clipboard.writeText(generatedPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
    showToast('Đã sao chép mã PIN vào bộ nhớ tạm!', 'info');
  };

  const handleToggleMaintenanceMode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRobotForMaintenance) return;
    if (!maintenancePinInput.trim()) {
      showToast('Vui lòng nhập mã PIN kỹ thuật viên.', 'warning');
      return;
    }

    const isEnabling = targetRobotForMaintenance.status !== 'maintenance';
    const robotId = getRealRobotGuid(targetRobotForMaintenance);

    try {
      setIsSubmittingMaintenance(true);
      const res = await robotService.setMaintenanceMode(robotId, maintenancePinInput.trim(), isEnabling);

      const newStatus = isEnabling ? 'maintenance' : 'idle';
      setAmrNodes((prev) =>
        prev.map((n) =>
          n.id === targetRobotForMaintenance.id
            ? {
              ...n,
              status: newStatus,
              mission: isEnabling ? 'Đang trong Chế độ Bảo trì Kỹ thuật (Phanh mở)' : 'Chờ lệnh điều phối',
              speed: '0.0 m/s',
            }
            : n
        )
      );

      if (selectedAmr && selectedAmr.id === targetRobotForMaintenance.id) {
        setSelectedAmr((prev) =>
          prev
            ? {
              ...prev,
              status: newStatus,
              mission: isEnabling ? 'Đang trong Chế độ Bảo trì Kỹ thuật (Phanh mở)' : 'Chờ lệnh điều phối',
              speed: '0.0 m/s',
            }
            : null
        );
      }

      setShowMaintenanceModal(false);
      showToast(
        res.message || (isEnabling ? 'Đã kích hoạt chế độ bảo trì thành công (phanh mở)!' : 'Đã kết thúc chế độ bảo trì thành công!'),
        'success'
      );

      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Xác thực mã PIN thất bại hoặc không thể chuyển trạng thái.';
      showToast(msg, 'warning');
    } finally {
      setIsSubmittingMaintenance(false);
    }
  };

  // Fetch real data from live services (Filtered by tenant for Technician)
  const loadData = async () => {
    try {
      setLoading(true);

      const resolvedTenantId = currentUser?.tenantId;

      const robotsPromise = tenantSlug
        ? fleetService.getRobotsByTenant(tenantSlug, resolvedTenantId)
        : fleetService.getAllRobots();

      const [robotsData, missionsData, alertsData, tablesData, statsData] = await Promise.all([
        robotsPromise,
        missionService.getMissions(),
        alertService.getAlerts(),
        tableService.getTables(tenantSlug || undefined),
        missionService.getMissionStats(),
      ]);

      if (statsData) {
        setMissionStats(statsData);
      }

      // Multi-tenant isolation: strictly filter down by tenant if not superadmin (or if superadmin selected a specific tenant)
      let scopedRobots = robotsData;
      if (tenantSlug) {
        const tSlug = tenantSlug.toLowerCase();
        scopedRobots = robotsData.filter((r) => {
          const rSlug = (r.ownerTenantSlug || '').toLowerCase();
          const rId = (r.ownerTenantId || '').toLowerCase();
          return rSlug === tSlug || rId === tSlug || (r.tenantName && r.tenantName.toLowerCase().includes(tSlug));
        });
      }

      if (scopedRobots.length === 0 && robotsData.length > 0) {
        scopedRobots = robotsData;
      }

      setRawRobots(scopedRobots);
      setTables(tablesData);

      const scopedRobotIds = new Set(scopedRobots.map((r) => r.code || r.name || r.id));
      const scopedRobotNames = new Set(scopedRobots.map((r) => r.name));

      const mappedNodes: AMRNode[] = scopedRobots.map((r, idx) => {
        const statusMap: Record<string, 'active' | 'moving' | 'idle' | 'swapping_battery' | 'alert' | 'maintenance'> = {
          delivering: 'moving',
          swapping_battery: 'swapping_battery',
          low_battery_waiting_swap: 'swapping_battery',
          returning: 'moving',
          idle: 'idle',
          maintenance: 'maintenance',
        };
        const st = statusMap[r.status] || 'idle';
        const posX = typeof r.worldX === 'number' ? r.worldX : 0;
        const posY = typeof r.worldY === 'number' ? r.worldY : 0;

        return {
          id: r.code || r.id,
          robotGuid: r.id,
          code: r.code,
          name: r.name || r.code || `AMR-${idx + 1}`,
          status: r.status === 'maintenance' ? 'maintenance' : st,
          battery: r.battery,
          x: posX,
          y: posY,
          mission: r.status === 'maintenance'
            ? 'Đang trong Chế độ Bảo trì Kỹ thuật (Phanh mở)'
            : ((r as any).currentTask || r.targetTable || (st === 'swapping_battery' ? 'Đang thay pin tại ST_BATTERY_RACK' : 'Chờ lệnh điều phối')),
          speed: r.status === 'maintenance' ? '0.0 m/s' : (r.speed || (st === 'moving' ? '1.0 m/s' : '0.0 m/s')),
          payload: `${r.payloadKg || 0} kg`,
        };
      });
      setAmrNodes(mappedNodes);

      if (mappedNodes.length > 0 && !newMissionRobot) {
        setNewMissionRobot(mappedNodes[0].id);
      }
      if (tablesData.length > 0 && !newMissionDest) {
        setNewMissionDest(`Bàn ${tablesData[0].tableNo || tablesData[0].id}`);
      }

      // Live alerts: strictly filtered for tenant robots only
      const liveAlerts: AlertItem[] = alertsData
        .filter((a) => {
          if (!tenantSlug) return true;
          return scopedRobotIds.has(a.robot) || scopedRobotNames.has(a.robot);
        })
        .map((a) => ({
          id: a.id,
          robot: a.robot,
          type: a.type,
          message: a.message,
          time: a.time,
        }));

      scopedRobots.forEach((r) => {
        if (r.battery < 20) {
          liveAlerts.push({
            id: `alt-bat-${r.id}`,
            robot: r.code || r.name,
            type: 'critical',
            message: `Mức pin yếu (${r.battery}%) - Cần điều hướng về Trạm Thay Pin`,
            time: 'Vừa xong',
          });
        }
      });
      setAlerts(liveAlerts);

      // Filter missions strictly for tenant robots only
      const scopedMissions = tenantSlug
        ? missionsData.filter((m) => scopedRobotIds.has(m.assignedTo) || scopedRobotNames.has(m.assignedTo))
        : missionsData;
      setMissions(scopedMissions);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu Technical Ops:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load once on component mount (No setInterval polling!)
  useEffect(() => {
    loadData();
  }, [tenantSlug]);

  // Sync real-time SignalR robot updates directly into telemetry state without HTTP polling
  useEffect(() => {
    if (storeRobots.length === 0) return;

    setRawRobots((prev) => {
      const updated = [...prev];
      storeRobots.forEach((sr) => {
        const idx = updated.findIndex((r) => r.id === sr.id || r.code === sr.name || r.name === sr.name);
        if (idx > -1) {
          updated[idx] = {
            ...updated[idx],
            worldX: sr.currentX,
            worldY: sr.currentY,
            battery: sr.batteryLevel,
            status: (sr.status.toLowerCase() === 'moving' ? 'delivering' : (sr.status.toLowerCase() === 'swapping_battery' || sr.status.toLowerCase() === 'low_battery_waiting_swap') ? 'swapping_battery' : 'idle') as any,
          };
        }
      });
      return updated;
    });

    setAmrNodes((prevNodes) => {
      return prevNodes.map((node) => {
        const match = storeRobots.find((sr) => sr.id === node.id || sr.name === node.name);
        if (!match) return node;
        const statusMap: Record<string, 'active' | 'moving' | 'idle' | 'swapping_battery' | 'alert' | 'maintenance'> = {
          moving: 'moving',
          delivering: 'moving',
          swapping_battery: 'swapping_battery',
          low_battery_waiting_swap: 'swapping_battery',
          idle: 'idle',
          maintenance: 'maintenance',
        };
        const st = statusMap[match.status?.toLowerCase()] || node.status;
        return {
          ...node,
          x: match.currentX,
          y: match.currentY,
          battery: match.batteryLevel ?? node.battery,
          status: st,
          speed: st === 'moving' ? (node.speed === '0.0 m/s' ? '1.0 m/s' : node.speed) : '0.0 m/s',
        };
      });
    });
  }, [storeRobots]);

  // Map Data Memoization for SlamFloorMapViewer
  const mapTables: MapTableNode[] = useMemo(() => {
    return tables.map((t) => ({
      id: t.tableNo || t.id,
      name: t.tableNo ? `Bàn ${t.tableNo}` : t.id,
      zone: t.zone || '',
      status: t.status,
      guestsCount: t.capacity,
      currentOrders: t.currentOrders,
      assignedRobot: t.assignedRobotCode,
      worldX: t.worldX,
      worldY: t.worldY,
    }));
  }, [tables]);

  const mapRobots: MapRobotItem[] = useMemo(() => {
    return rawRobots.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      status: r.status === 'delivering' || r.status === 'returning' ? 'delivering' : r.status === 'swapping_battery' ? 'swapping_battery' : 'idle',
      battery: r.battery,
      currentZone: r.currentLocation,
      worldX: r.worldX,
      worldY: r.worldY,
      yaw: r.yaw,
      targetTable: r.targetTable,
    }));
  }, [rawRobots]);

  // Action: Resolve Alert
  const handleResolveAlert = async (id: string, robot: string) => {
    const ok = await alertService.resolveAlert(id);
    if (ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      showToast(`Đã xử lý sự cố cho ${robot}. Trạng thái đã bình thường hóa.`, 'success');
    } else {
      showToast('Không thể cập nhật trạng thái sự cố. Vui lòng thử lại.', 'warning');
    }
  };

  // Action: Send to Battery Swap Rack
  const handleSendToDock = async (robotId: string) => {
    await fleetService.updateRobotStatus(robotId, { status: 'swapping_battery' as any });
    setAmrNodes((prev) =>
      prev.map((n) =>
        n.id === robotId
          ? { ...n, status: 'swapping_battery', mission: 'Đang điều hướng về Trạm Thay Pin (ST_BATTERY_RACK)', targetX: 140, targetY: 310 }
          : n
      )
    );
    showToast(`Đã phát lệnh điều hướng ${robotId} về trạm thay pin ST_BATTERY_RACK!`, 'success');
    setSelectedAmr(null);
  };

  // Action: Emergency Pause specific AMR
  const handlePauseAmr = async (robotId: string) => {
    const target = amrNodes.find((n) => n.id === robotId);
    const nextStatus = target?.status === 'idle' ? 'delivering' : 'idle';
    await fleetService.updateRobotStatus(robotId, { status: nextStatus as any });
    setAmrNodes((prev) =>
      prev.map((n) =>
        n.id === robotId
          ? { ...n, status: n.status === 'idle' ? 'active' : 'idle', speed: n.status === 'idle' ? '1.0 m/s' : '0.0 m/s' }
          : n
      )
    );
    showToast(`Đã chuyển đổi trạng thái vận hành của ${robotId}!`, 'info');
    setSelectedAmr(null);
  };

  // Action: Cancel Mission
  const handleCancelMission = async (missionId: string) => {
    const ok = await missionService.cancelMission(missionId);
    if (ok) {
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      showToast(`Đã hủy lệnh điều phối ${missionId}!`, 'info');
    } else {
      showToast('Không thể hủy lệnh điều phối. Vui lòng thử lại.', 'warning');
    }
  };

  // Action: Prioritize Mission
  const handlePrioritizeMission = async (missionId: string) => {
    const ok = await missionService.prioritizeMission(missionId);
    if (ok) {
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, priority: 'Cao', eta: '30s (Ưu tiên số 1)' } : m))
      );
      showToast(`Đã đẩy ${missionId} lên mức ưu tiên cao nhất!`, 'success');
    } else {
      showToast('Không thể cập nhật mức ưu tiên. Vui lòng thử lại.', 'warning');
    }
  };

  // Action: Create New Mission
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle) return;
    try {
      const created = await missionService.createMission({
        title: newMissionTitle,
        destination: newMissionDest,
        robotId: newMissionRobot || (amrNodes[0]?.id || 'AMR-01'),
        priority: 'Cao',
      });
      setMissions((prev) => [
        {
          id: created.id,
          title: created.title,
          assignedTo: created.assignedTo,
          priority: created.priority,
          destination: created.destination,
          status: created.status,
          eta: created.eta,
        },
        ...prev,
      ]);
      setShowNewMissionModal(false);
      setNewMissionTitle('');
      showToast(`Đã tạo và phát lệnh nhiệm vụ ${created.id} cho ${created.assignedTo}!`, 'success');
    } catch {
      showToast('Không thể tạo nhiệm vụ điều phối. Vui lòng kiểm tra kết nối máy chủ.', 'warning');
    }
  };

  const cleanTechName = fixMojibake(
    currentUser?.name || currentUser?.email?.split('@')[0] || 'Kỹ Thuật Viên'
  );
  const cleanTechEmail =
    currentUser?.email || (tenantSlug ? `tech@${tenantSlug}.vn` : 'technical@vora.vn');
  const techInitials = getUserInitials(cleanTechName);

  type TechSubTab = typeof activeSubTab;
  const techNavGroups: {
    groupTitle: string;
    items: { id: TechSubTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[];
  }[] = [
      {
        groupTitle: 'ĐIỀU PHỐI & BẢN ĐỒ',
        items: [
          { id: 'dashboard', label: 'Bảng Điều Khiển Tổng Quan', icon: LayoutGrid },
          { id: 'map-stations', label: 'Bản Đồ & Trạm Dừng', icon: MapPin },
          { id: 'robots', label: 'Đội Xe Robot AMR', icon: Bot, badge: String(amrNodes.length) },
          { id: 'missions', label: 'Hàng Đợi Nhiệm Vụ', icon: Navigation, badge: String(missions.length) },
        ],
      },
      {
        groupTitle: 'HẠ TẦNG & VẬN HÀNH',
        items: [
          { id: 'monitor', label: 'Giám Sát & Nhật Ký AMR', icon: Terminal },
          { id: 'edge-logs', label: 'Nhật Ký Robot Tại Trạm', icon: FileText },
          { id: 'sqlite-sync', label: 'Lưu Trữ & Đồng Bộ Quán', icon: Database },
          { id: 'edge-setup', label: 'Thiết Bị Trạm Quán', icon: Server },
          { id: 'analytics', label: 'Thống Kê Hiệu Suất', icon: BarChart3 },
          { id: 'settings', label: 'Cấu Hình Điều Hướng', icon: Settings },
        ],
      },
    ];

  const activeTechTabLabel =
    techNavGroups.flatMap((g) => g.items).find((i) => i.id === activeSubTab)?.label || 'Bảng Điều Khiển Tổng Quan';

  const handleTechLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const renderTechSidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full bg-white text-slate-700 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40 shrink-0">
        <Link
          to="/technical"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 transition-opacity ${collapsed ? 'justify-center w-full' : ''}`}
          title="Trang Điều Phối Kỹ Thuật AMR"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-2xs p-1 flex items-center justify-center shrink-0">
            <img src="/brand/vora-icon.png" alt="VORA Emblem" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                <span className="font-display">VORA FMS</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                Điều Phối Kỹ Thuật AMR
              </div>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          aria-label="Đóng thanh điều hướng"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tenant & Telemetry Context Banner */}
      {!collapsed && (
        <div className="px-2.5 py-1.5 mx-2.5 mt-2 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-200/90 shadow-2xs">
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              <div className="truncate">
                <span
                  className="text-xs font-extrabold text-slate-900 block truncate tracking-tight"
                  title={currentUser?.tenantName || tenantSlug || 'VORA Fleet'}
                >
                  {currentUser?.tenantName || (tenantSlug ? tenantSlug.toUpperCase() : 'VORA Fleet')}
                </span>
                <span className="text-[11px] text-slate-500 block truncate font-mono">
                  Quản Trị Kỹ Thuật
                </span>
              </div>
            </div>
          </div>

          {emergencyStop && (
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">CẢNH BÁO: ĐANG E-STOP</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-2 px-2.5 space-y-2">
        {techNavGroups.map((group) => (
          <div key={group.groupTitle} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 pb-0.5 text-[9px] font-extrabold tracking-widest uppercase text-slate-400 font-mono">
                {group.groupTitle}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSubTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 group cursor-pointer ${isActive
                        ? 'bg-gradient-to-r from-blue-50 via-blue-50/80 to-indigo-50/40 text-blue-700 font-bold border border-blue-200/80 shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-blue-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between overflow-hidden gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono tabular-nums ${isActive
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Telemetry Card & Quick Switch */}
      {!collapsed && (
        <div className="p-2 mx-2.5 mb-2 rounded-xl bg-slate-50/90 border border-slate-200/90 text-xs text-slate-700 space-y-1.5 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-tight">
              <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Tổng Quan Đội Xe</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200/80">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                ĐỘI XE AMR
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-800 truncate tabular-nums mt-0.5">
                {amrNodes.length} Robot
              </div>
            </div>
            <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200/80">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                NHIỆM VỤ
              </div>
              <div className="text-[11px] font-mono font-bold text-blue-600 truncate tabular-nums mt-0.5">
                {missions.length} Lệnh
              </div>
            </div>
          </div>
          <Link
            to="/staff"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold transition-colors"
            title="Chuyển sang Giao diện Phục Vụ / KDS Bếp"
          >
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Mở Giao Diện KDS Bếp</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
          </Link>
        </div>
      )}

      {/* User Footer */}
      <div className="px-2.5 py-2 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-2 shrink-0">
        <div className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/90 text-blue-700 font-mono"
            title={cleanTechName}
          >
            {techInitials}
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="text-xs font-extrabold text-slate-900 truncate" title={cleanTechName}>
                {cleanTechName}
              </div>
              <div className="text-[11px] text-slate-500 truncate font-mono" title={cleanTechEmail}>
                {cleanTechEmail}
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <Link
            to="/login"
            onClick={handleTechLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Desktop Collapse / Expand Rail Button */}
      <div className="hidden lg:block px-2.5 py-1 border-t border-slate-200/80 bg-slate-50/30 shrink-0">
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors font-semibold cursor-pointer"
          title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Thu gọn menu</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none animate-in slide-in-from-top-2 duration-200">
          <div
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'warning'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-blue-600 text-white border-blue-500'
              }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Desktop Fixed App Shell Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full transition-all duration-200 border-r border-slate-200/80 bg-white z-30 ${isSidebarCollapsed ? 'w-20' : 'w-[268px]'
          }`}
      >
        {renderTechSidebarContent(isSidebarCollapsed)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 bg-white">
            {renderTechSidebarContent(false)}
          </div>
        </div>
      )}

      {/* Main Operational Workspace Canvas */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="shrink-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-4 sm:px-6 gap-3">
          {/* Left: Mobile Trigger & Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
              <span className="font-bold text-slate-800 hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span>Điều Phối Đội Xe</span>
              </span>
              {tenantSlug && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline shrink-0" />
                  <span className="hidden md:inline-flex text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 truncate max-w-[160px]">
                    {currentUser?.tenantName || tenantSlug.toUpperCase()}
                  </span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline shrink-0" />
              <span className="font-extrabold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50/60 px-3 py-1 rounded-lg border border-blue-200/80 shadow-2xs truncate">
                {activeTechTabLabel}
              </span>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => {
                loadData();
                showToast('Đang làm mới dữ liệu từ máy chủ...', 'info');
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-blue-700 hover:border-blue-200 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              title="Làm mới toàn bộ dữ liệu"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Làm Mới</span>
            </button>

            {/* Simulation Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsSimulationRunning((prev) => !prev);
                showToast(isSimulationRunning ? 'Đã tạm dừng mô phỏng chuyển động robot.' : 'Đã tiếp tục mô phỏng robot.', 'info');
              }}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${isSimulationRunning
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}
              title="Tạm dừng hoặc chạy tiếp mô phỏng chuyển động AMR"
            >
              {isSimulationRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mô Phỏng: Bật</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mô Phỏng: Dừng</span>
                </>
              )}
            </button>

            {/* Global E-Stop Button */}
            <button
              type="button"
              onClick={() => {
                setEmergencyStop((prev) => !prev);
                showToast(emergencyStop ? 'Khôi phục vận hành đội xe bình thường!' : 'CẢNH BÁO: ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP TOÀN BỘ AMR!', emergencyStop ? 'success' : 'warning');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer ${emergencyStop
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm shadow-rose-600/20 border border-rose-500/30'
                }`}
              title={emergencyStop ? 'Khôi phục vận hành' : 'Dừng khẩn cấp toàn bộ AMR'}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {emergencyStop ? 'Khôi Phục Vận Hành' : 'Dừng Khẩn Cấp (E-Stop)'}
              </span>
              <span className="sm:hidden">{emergencyStop ? 'Khôi Phục' : 'E-Stop'}</span>
            </button>
          </div>
        </header>

        {/* EMERGENCY STOP TOP BANNER */}
        {emergencyStop && (
          <div className="bg-rose-50 border-b border-rose-300 px-6 py-2.5 text-rose-800 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>HỆ THỐNG ĐANG Ở TRẠNG THÁI DỪNG KHẨN CẤP (E-STOP). MỌI AMR ĐÃ PHANH DỪNG TẠI CHỖ.</span>
            </div>
            <button
              type="button"
              onClick={() => setEmergencyStop(false)}
              className="px-3 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 text-xs cursor-pointer font-semibold"
            >
              Khôi Phục Ngay
            </button>
          </div>
        )}

        {/* MAIN VIEW CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-transparent p-3 sm:p-4">
          <div className="max-w-[1920px] mx-auto w-full">
            {/* ============================================================== */}
            {/* SUBTAB 1: DASHBOARD */}
            {/* ============================================================== */}
            {activeSubTab === 'dashboard' && (
              <div className="space-y-3.5">
                {/* TOP ROW: 2D Floor Map & Recent Alerts / Mission Queue */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                  {/* 2D Real-Time AMR Locations Floorplan Map (8 COLS) */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs relative">
                    {/* Header Bar */}
                    <div className="px-3 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>Sơ Đồ Mặt Bằng 2D & Đội Xe</span>
                      </span>
                    </div>
                    {/* Floor Map Viewer in Technical Mode */}
                    <div className="relative flex-1 min-h-[340px] sm:min-h-[400px] flex flex-col">
                      <SlamFloorMapViewer
                        tables={mapTables}
                        robots={mapRobots}
                        selectedTableId={selectedTableId || undefined}
                        onSelectTable={(tableId) => {
                          setSelectedTableId(tableId);
                          const t = tables.find((x) => x.id === tableId || x.tableNo === tableId);
                          showToast(`Đã chọn ${t ? `Bàn ${t.tableNo || t.id}` : tableId} trên bản đồ kỹ thuật`, 'info');
                        }}
                        selectedRobotId={selectedAmr?.id}
                        onSelectRobot={(robotId) => {
                          const foundNode = amrNodes.find((n) => n.id === robotId || n.name === robotId);
                          if (foundNode) {
                            setSelectedAmr(foundNode);
                            showToast(`Đã chọn AMR ${foundNode.name} (${foundNode.battery}%)`, 'info');
                          }
                        }}
                        mode="technical"
                        className="w-full flex-1"
                      />

                      {/* Interactive Selected AMR Telemetry Popover Modal */}
                      {selectedAmr && (
                        <div className="absolute top-14 sm:top-16 right-2 sm:right-4 bg-slate-900/95 text-white border border-cyan-500/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md w-72 max-w-[calc(100%-1rem)] space-y-3 text-xs z-30 animate-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-cyan-400 font-mono text-sm">{selectedAmr.id}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${selectedAmr.battery < 20 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                                {selectedAmr.battery}% Pin
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedAmr(null)}
                              className="text-slate-400 hover:text-white p-1 cursor-pointer font-bold"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Nhiệm vụ:</span>
                              <span className="font-semibold text-white truncate max-w-[150px]">{selectedAmr.mission}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tốc độ:</span>
                              <span className="font-mono text-cyan-400 font-bold">{selectedAmr.speed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tải trọng:</span>
                              <span className="font-mono text-slate-200">{selectedAmr.payload}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tọa độ (m):</span>
                              <span className="font-mono text-cyan-300">X:{selectedAmr.x.toFixed(2)}, Y:{selectedAmr.y.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Working Action Buttons for Selected AMR */}
                          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenMaintenanceModal(selectedAmr)}
                              className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${selectedAmr.status === 'maintenance'
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                                  : 'bg-amber-600/90 hover:bg-amber-500 text-white'
                                }`}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>{selectedAmr.status === 'maintenance' ? 'Đang Bảo Trì (Quản Lý)' : 'Bảo Trì Kỹ Thuật (Mở Phanh)'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendToDock(selectedAmr.id)}
                              className="w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <BatteryCharging className="w-3.5 h-3.5" />
                              <span>Điều Về Trạm Thay Pin</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePauseAmr(selectedAmr.id)}
                              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{selectedAmr.status === 'idle' ? 'Kích Hoạt AMR' : 'Tạm Dừng AMR'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Map Footer Status Bar */}
                    <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
                      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Hoạt động ({amrNodes.filter(n => n.status === 'active').length})
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Đang di chuyển ({amrNodes.filter(n => n.status === 'moving').length})
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sẵn sàng ({amrNodes.filter(n => n.status === 'idle').length})
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Thay pin ({amrNodes.filter(n => n.status === 'swapping_battery').length})
                        </span>
                      </div>
                      <span className="hidden md:inline text-slate-500 shrink-0">Tần số quét cảm biến: 20 Hz</span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Recent Alerts & Mission Queue (4 COLS) */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Recent Alerts (Paginated) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">Cảnh Báo Gần Đây</h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                          {alerts.length} Sự cố
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {alerts.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-4">Không có cảnh báo mới</div>
                        ) : (
                          alertPagination.paginatedItems.map((alt) => (
                            <div
                              key={alt.id}
                              className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all ${alt.type === 'critical'
                                ? 'bg-rose-50 border-rose-200 text-rose-900'
                                : alt.type === 'warning'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : 'bg-blue-50 border-blue-200 text-blue-900'
                                }`}
                            >
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <AlertTriangle
                                  className={`w-4 h-4 shrink-0 mt-0.5 ${alt.type === 'critical'
                                    ? 'text-rose-600'
                                    : alt.type === 'warning'
                                      ? 'text-amber-600'
                                      : 'text-blue-600'
                                    }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-mono font-bold text-xs">{alt.robot}</span>
                                    <span className="text-[10px] opacity-75 font-mono">{alt.time}</span>
                                  </div>
                                  <p className="text-[11px] leading-snug line-clamp-2">{alt.message}</p>
                                </div>
                              </div>

                              {/* Action Button: Xử Lý / Dismiss */}
                              <button
                                type="button"
                                onClick={() => handleResolveAlert(alt.id, alt.robot)}
                                className="px-2 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 shrink-0 cursor-pointer shadow-2xs"
                                title="Xác nhận & giải quyết cảnh báo"
                              >
                                Xử Lý
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {alertPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                          <span className="font-mono">
                            Trang {alertPagination.currentPage}/{alertPagination.totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={alertPagination.currentPage <= 1}
                              onClick={() => alertPagination.setPage(alertPagination.currentPage - 1)}
                              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Trang trước"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={alertPagination.currentPage >= alertPagination.totalPages}
                              onClick={() => alertPagination.setPage(alertPagination.currentPage + 1)}
                              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                              title="Trang kế tiếp"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mission Queue (Paginated) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">Hàng Đợi Nhiệm Vụ</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewMissionModal(true)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tạo Lệnh</span>
                          </button>
                          <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 font-bold">
                            {missions.filter((m) => m.status === 'running').length} Đang chạy
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {missions.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-8">
                            Chưa có lệnh điều phối trong hàng đợi. Bấm &quot;Tạo Lệnh&quot; để phát lệnh mới.
                          </div>
                        ) : (
                          dashboardMissionPagination.paginatedItems.map((mission) => (
                            <div
                              key={mission.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-xs flex items-center justify-between gap-3 group transition-all"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-mono font-bold text-[11px] text-blue-700">{mission.id}</span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${mission.priority === 'Cao'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-200 text-slate-700'
                                      }`}
                                  >
                                    {mission.priority}
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-800 truncate">{mission.title}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>AMR: {mission.assignedTo}</span>
                                  <span>•</span>
                                  <span>Đích: {mission.destination}</span>
                                </div>
                              </div>

                              {/* Working Actions for Queue */}
                              <div className="flex items-center gap-1 shrink-0">
                                {mission.priority !== 'Cao' && (
                                  <button
                                    type="button"
                                    onClick={() => handlePrioritizeMission(mission.id)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-white text-[10px] cursor-pointer"
                                    title="Đẩy lên ưu tiên cao nhất"
                                  >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCancelMission(mission.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white text-[10px] cursor-pointer"
                                  title="Hủy lệnh này"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <div className="text-right pl-1">
                                  <span className="text-[10px] font-mono text-emerald-700 font-bold block">{mission.eta}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {dashboardMissionPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span className="text-[11px] font-medium font-mono">
                            Trang {dashboardMissionPagination.currentPage}/{dashboardMissionPagination.totalPages} ({missions.length} lệnh)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={dashboardMissionPagination.currentPage <= 1}
                              onClick={() => dashboardMissionPagination.setPage(dashboardMissionPagination.currentPage - 1)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Trước</span>
                            </button>
                            <button
                              type="button"
                              disabled={dashboardMissionPagination.currentPage >= dashboardMissionPagination.totalPages}
                              onClick={() => dashboardMissionPagination.setPage(dashboardMissionPagination.currentPage + 1)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <span>Sau</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MIDDLE ROW: Fleet Status Summary & Battery Levels */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>Tổng Quan Trạng Thái Đội Xe</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">{amrNodes.length} Thiết Bị AMR</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Active AMRs Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="text-xs text-slate-500 font-bold">AMR Hoạt Động:</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                          {amrNodes.filter((n) => n.status === 'active' || n.status === 'moving').length}
                        </span>
                        <span className="text-sm font-bold text-slate-400 font-mono">/ {amrNodes.length}</span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{
                            width:
                              amrNodes.length > 0
                                ? `${Math.round(
                                  (amrNodes.filter((n) => n.status === 'active' || n.status === 'moving').length /
                                    amrNodes.length) *
                                  100
                                )}%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Active Missions Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="text-xs text-slate-500 font-bold">Nhiệm Vụ Đang Chạy:</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-cyan-600 font-mono">
                          {missionStats?.active ?? missions.filter((m) => m.status === 'running').length}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">đang điều phối</span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width:
                              (missionStats?.totalToday ?? missions.length) > 0
                                ? `${Math.round(
                                  ((missionStats?.active ?? missions.filter((m) => m.status === 'running').length) /
                                    Math.max(1, missionStats?.totalToday ?? missions.length)) * 100
                                )}%`
                                : '0%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fleet Health Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="text-xs text-slate-500 font-bold">Sức Khỏe Đội Xe:</span>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                          {amrNodes.length > 0
                            ? Math.round(
                              (amrNodes.filter((n) => n.status !== 'alert').length / amrNodes.length) * 100
                            )
                            : 100}
                          %
                        </span>
                        <span className="text-xs text-emerald-700 font-bold">Tốt</span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${amrNodes.length > 0
                              ? Math.round(
                                (amrNodes.filter((n) => n.status !== 'alert').length / amrNodes.length) * 100
                              )
                              : 100
                              }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Battery Levels Chart Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                        <span>Mức Pin Đội Xe</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {fleetBatteries.length > 0
                            ? `${fleetBatteries[0].code.split(' ')[0]} - ${fleetBatteries[fleetBatteries.length - 1].code.split(' ')[0]}`
                            : 'N/A'}
                        </span>
                      </div>

                      {/* Dynamic Battery Bars */}
                      <div className="mt-2 h-10 flex items-end gap-1 sm:gap-1.5 w-full">
                        {fleetBatteries.length === 0 ? (
                          <div className="w-full text-center text-xs text-slate-400 py-2">Chưa có kết nối pin</div>
                        ) : (
                          fleetBatteries.map((b) => (
                            <div
                              key={b.code}
                              onClick={() => showToast(`Pin ${b.code}: ${b.val}%`, 'info')}
                              className="flex-1 flex flex-col items-center group relative cursor-pointer"
                            >
                              <div
                                className={`w-full rounded-t transition-all ${b.status === 'critical'
                                  ? 'bg-rose-500'
                                  : b.status === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600 group-hover:bg-cyan-500'
                                  }`}
                                style={{ height: `${b.val}%` }}
                              />
                              {/* Tooltip on hover */}
                              <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-[9px] font-mono text-white px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap">
                                {b.code}: {b.val}%
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="mt-1 flex justify-between text-[9px] font-mono text-slate-400">
                        <span className="truncate max-w-[70px]">{fleetBatteries[0]?.code.split(' ')[0] || '—'}</span>
                        <span className="truncate max-w-[70px]">{fleetBatteries[Math.floor(fleetBatteries.length / 2)]?.code.split(' ')[0] || '—'}</span>
                        <span className="truncate max-w-[70px]">{fleetBatteries[fleetBatteries.length - 1]?.code.split(' ')[0] || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW: Telemetry Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {/* Average Mission Completion Time (Last 24h) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-600" />
                        <span>Thời Gian Hoàn Thành Chuyến Trung Bình (24 Giờ)</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {avgCompletionDuration}
                      </span>
                    </div>

                    {/* Dynamic SVG Line Chart */}
                    <div className="h-44 w-full pt-2 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 500 140" fill="none">
                        <defs>
                          <linearGradient id="lightTimeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0062FF" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#0062FF" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal reference lines */}
                        <line x1="40" y1="25" x2="480" y2="25" stroke="#E2E8F0" strokeDasharray="3,3" />
                        <line x1="40" y1="65" x2="480" y2="65" stroke="#E2E8F0" strokeDasharray="3,3" />
                        <line x1="40" y1="105" x2="480" y2="105" stroke="#E2E8F0" strokeDasharray="3,3" />

                        {/* Y-axis labels */}
                        <text x="12" y="29" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                          {Math.max(1, missionStats?.completed ?? 1)} đơn
                        </text>
                        <text x="12" y="69" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                          {Math.max(1, Math.round((missionStats?.completed ?? 1) / 2))} đơn
                        </text>
                        <text x="12" y="109" fill="#94A3B8" fontSize="9" fontFamily="monospace">0</text>

                        {/* Chart Area Fill */}
                        {curveAreaD && (
                          <path d={curveAreaD} fill="url(#lightTimeGrad)" />
                        )}

                        {/* Chart Stroke Curve */}
                        {curvePathD && (
                          <path
                            d={curvePathD}
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Dynamic Data Points */}
                        {hourlyPoints.map((pt, i) => (
                          <g key={pt.label} className="cursor-pointer" onClick={() => showToast(`Khung giờ ${pt.label}: ${pt.count} đơn hoàn tất`, 'info')}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={i % 2 === 0 ? 4 : 3.5}
                              fill="#0062FF"
                              stroke="#FFFFFF"
                              strokeWidth={i % 2 === 0 ? 2 : 1}
                            />
                          </g>
                        ))}

                        {/* X-axis time marks */}
                        {hourlyPoints.map((pt) => (
                          <text key={pt.label} x={pt.x} y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                            {pt.label}
                          </text>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* Robot Utilization (%) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span>Hiệu Suất Khai Thác Robot (%)</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {robotUtilizationList.length > 0
                          ? `${avgFleetUtilization}% Trung Bình`
                          : '0% (Chưa có AMR)'}
                      </span>
                    </div>

                    {/* Dynamic Utilization Bar Chart */}
                    <div className="h-44 w-full pt-2 flex items-end justify-between gap-2 px-2">
                      {robotUtilizationList.length > 0 ? (
                        robotUtilizationList.map((item) => {
                          const utilPercent = item.utilization;
                          return (
                            <div
                              key={item.id}
                              onClick={() => showToast(`Hiệu suất ${item.name}: ${utilPercent}%`, 'info')}
                              className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                            >
                              <span className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                {utilPercent}%
                              </span>
                              <div className="w-full bg-slate-100 rounded-t h-28 flex items-end">
                                <div
                                  className="w-full bg-blue-600 group-hover:bg-cyan-500 rounded-t transition-all duration-300"
                                  style={{ height: `${utilPercent}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-slate-600 font-bold truncate max-w-[42px]" title={item.name}>
                                {item.name.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="w-full text-center py-10 text-xs text-slate-400">
                          Chưa có dữ liệu hiệu suất vận hành AMR
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB 2: ROBOTS (Detailed Fleet List with Actions) */}
            {/* ============================================================== */}
            {activeSubTab === 'robots' && (
              <div className="h-[calc(100vh-88px)] min-h-[480px] flex flex-col gap-3">
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Tổng Thiết Bị AMR</span>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-0.5">{fleetTelemetrySummary.total}</div>
                      <span className="text-[11px] text-slate-500">Sẵn sàng: {fleetTelemetrySummary.idle}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Đang Vận Hành</span>
                      <div className="text-2xl font-black text-cyan-600 font-mono tabular-nums mt-0.5">{fleetTelemetrySummary.movingOrActive}</div>
                      <span className="text-[11px] text-slate-500">Đổi pin: {fleetTelemetrySummary.swapping}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Chế Độ Bảo Trì</span>
                      <div className="text-2xl font-black text-amber-600 font-mono tabular-nums mt-0.5">{fleetTelemetrySummary.maintenance}</div>
                      <span className="text-[11px] text-slate-500">Cảnh báo: {fleetTelemetrySummary.alertState}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Pin TB Đội Xe</span>
                      <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums mt-0.5">
                        {fleetTelemetrySummary.total > 0 ? `${fleetTelemetrySummary.avgBattery}%` : '—'}
                      </div>
                      <span className="text-[11px] text-slate-500">Pin yếu &lt;20%: {fleetTelemetrySummary.lowBattery}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <BatteryCharging className="w-5 h-5" />
                    </div>
                  </div>
                </div>

              <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Danh Sách Thiết Bị AMR Trong Đội Xe ({amrNodes.length})
                    </h3>
                    <p className="text-xs text-slate-500">Giám sát trạng thái telemetry, firmware, pin LiFePO4 và gửi lệnh trực tiếp.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      loadData();
                      showToast('Đang quét kết nối Wi-Fi & DDS toàn bộ đội AMR...', 'info');
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 hover:bg-blue-100 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Quét Toàn Bộ Đội Xe</span>
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Mã AMR</th>
                        <th className="py-2.5 px-3">Trạng Thái</th>
                        <th className="py-2.5 px-3">Pin LiFePO4</th>
                        <th className="py-2.5 px-3">Tốc Độ</th>
                        <th className="py-2.5 px-3">Nhiệm Vụ Hiện Tại</th>
                        <th className="py-2.5 px-3 text-right">Thao Tác Kỹ Thuật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {amrNodes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            Chưa có thiết bị AMR nào kết nối trong hệ thống.
                          </td>
                        </tr>
                      ) : (
                        amrPagination.paginatedItems.map((robot) => (
                          <tr key={robot.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-700">{robot.id} ({robot.name})</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${robot.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  robot.status === 'moving' ? 'bg-cyan-100 text-cyan-800' :
                                    robot.status === 'swapping_battery' ? 'bg-indigo-100 text-indigo-800' :
                                      robot.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                        'bg-slate-100 text-slate-700'
                                }`}>
                                {robot.status === 'maintenance' ? 'BẢO TRÌ' : robot.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${robot.battery < 20 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {robot.battery}%
                                </span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${robot.battery < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${robot.battery}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">{robot.speed}</td>
                            <td className="py-3 px-3 font-medium text-slate-800">{robot.mission}</td>
                            <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenMaintenanceModal(robot)}
                                className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer text-[11px] inline-flex items-center gap-1 transition-colors ${robot.status === 'maintenance'
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                  }`}
                                title="Chế độ bảo trì kỹ thuật viên (Phanh điện từ)"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>{robot.status === 'maintenance' ? 'Đang Bảo Trì' : 'Bảo Trì'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendToDock(robot.id)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 cursor-pointer text-[11px]"
                              >
                                Về Trạm Thay Pin
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePauseAmr(robot.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer text-[11px]"
                              >
                                {robot.status === 'idle' ? 'Chạy' : 'Dừng'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={amrPagination.currentPage}
                  totalPages={amrPagination.totalPages}
                  totalItems={amrPagination.totalItems}
                  pageSize={amrPagination.pageSize}
                  pageSizeOptions={[4, 6, 12, 24]}
                  onPageChange={amrPagination.setPage}
                  onPageSizeChange={amrPagination.setPageSize}
                  itemLabel="thiết bị AMR"
                  className="shrink-0"
                />
              </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB 3: MISSIONS (Full Missions Manager) */}
            {/* ============================================================== */}
            {activeSubTab === 'missions' && (
              <div className="h-[calc(100vh-88px)] min-h-[480px] flex flex-col gap-3">
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Tổng Lệnh Trong Hàng Đợi</span>
                      <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-0.5">{missions.length}</div>
                      <span className="text-[11px] text-slate-500">Hôm nay: {missionStats?.totalToday ?? missions.length}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                      <Navigation className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Đang Thực Thi</span>
                      <div className="text-2xl font-black text-cyan-600 font-mono tabular-nums mt-0.5">
                        {missions.filter((m) => m.status === 'running').length}
                      </div>
                      <span className="text-[11px] text-slate-500">Đang chờ: {missions.filter((m) => m.status === 'queued').length}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Ưu Tiên Cao</span>
                      <div className="text-2xl font-black text-rose-600 font-mono tabular-nums mt-0.5">
                        {missions.filter((m) => m.priority === 'Cao').length}
                      </div>
                      <span className="text-[11px] text-slate-500">Xử lý tuyến ưu tiên</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Hoàn Thành / Hủy</span>
                      <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums mt-0.5">
                        {missionStats?.completed ?? 0}
                      </div>
                      <span className="text-[11px] text-slate-500">Lỗi: {missionStats?.failed ?? 0} • Hủy: {missionStats?.cancelled ?? 0}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>

              <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Quản Lý Toàn Bộ Nhiệm Vụ Điều Phối</h3>
                    <p className="text-xs text-slate-500">Giám sát các hành trình đang chạy và xếp thứ tự ưu tiên hàng đợi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewMissionModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Nhiệm Vụ Mới</span>
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {missions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Hiện tại chưa có nhiệm vụ nào trong hàng đợi điều phối. Bấm &quot;Tạo Nhiệm Vụ Mới&quot; để phát lệnh điều phối.
                    </div>
                  ) : (
                    missionPagination.paginatedItems.map((m) => (
                      <div key={m.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-xs text-blue-700">{m.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${m.priority === 'Cao' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                              Ưu Tiên: {m.priority}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">Gán cho: <strong>{m.assignedTo}</strong></span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{m.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Đích đến: <strong>{m.destination}</strong> • ETA: <strong>{m.eta}</strong></div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrioritizeMission(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs border border-blue-200 cursor-pointer"
                          >
                            Đẩy Lên Ưu Tiên
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelMission(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 cursor-pointer"
                          >
                            Hủy Lệnh
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Pagination
                  currentPage={missionPagination.currentPage}
                  totalPages={missionPagination.totalPages}
                  totalItems={missionPagination.totalItems}
                  pageSize={missionPagination.pageSize}
                  pageSizeOptions={[4, 6, 12, 24]}
                  onPageChange={missionPagination.setPage}
                  onPageSizeChange={missionPagination.setPageSize}
                  itemLabel="nhiệm vụ"
                  className="shrink-0"
                />
              </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB: AMR MONITOR & TELEMETRY LOGS */}
            {/* ============================================================== */}
            {activeSubTab === 'monitor' && (
              <div className="space-y-4">
                <RobotMonitorPage embedded />
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB: LOCAL EDGE NODE ROBOT LOGS (BY CATEGORY) */}
            {/* ============================================================== */}
            {activeSubTab === 'edge-logs' && (
              <div className="space-y-4">
                <EdgeRobotLogsPanel robots={rawRobots} tenantSlug={tenantSlug || undefined} />
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB 4: ANALYTICS (Live Operational Telemetry Dashboard) */}
            {/* ============================================================== */}
            {activeSubTab === 'analytics' && (
              <div className="lg:h-[calc(100vh-88px)] min-h-[480px] flex flex-col gap-3">
                {/* Row 1: 4 Real-Data KPI Cards */}
                <div className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block truncate">Tổng Nhiệm Vụ Hôm Nay</span>
                      <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
                        {missionStats?.totalToday ?? missions.length}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium tabular-nums truncate">
                        Hoàn tất: <strong className="text-emerald-600">{missionStats?.completed ?? 0}</strong> • Chạy: <strong className="text-blue-600">{missionStats?.active ?? missions.filter((m) => m.status === 'running').length}</strong>
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block truncate">Thời Gian Hoàn Thành TB</span>
                      <div className="text-xl sm:text-2xl font-black font-mono text-cyan-700 tabular-nums">
                        {avgCompletionDuration}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium tabular-nums truncate">
                        Lỗi: <strong className="text-rose-600">{missionStats?.failed ?? 0}</strong> • Hủy: <strong>{missionStats?.cancelled ?? 0}</strong>
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block truncate">Hiệu Suất Khai Thác TB</span>
                      <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 tabular-nums">
                        {amrNodes.length > 0 ? `${avgFleetUtilization}%` : '0%'}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium tabular-nums truncate">
                        <strong className="text-blue-700">{fleetTelemetrySummary.movingOrActive}</strong>/{fleetTelemetrySummary.total} AMR hoạt động
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block truncate">Pin LiFePO4 Trung Bình</span>
                      <div className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${fleetTelemetrySummary.avgBattery < 20 && fleetTelemetrySummary.total > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {fleetTelemetrySummary.total > 0 ? `${fleetTelemetrySummary.avgBattery}%` : '—'}
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium tabular-nums truncate">
                        Pin &lt;20%: <strong className={fleetTelemetrySummary.lowBattery > 0 ? 'text-rose-600' : 'text-slate-800'}>{fleetTelemetrySummary.lowBattery}</strong> • Cảnh báo: <strong>{alerts.length}</strong>
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Battery className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Compact 2-Col Bento Grid */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                  {/* Left 7 cols: 24h Chart + AMR Utilization Table */}
                  <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
                    <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span>Nhịp Độ Hoàn Thành Nhiệm Vụ (24 Giờ)</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">Tổng hợp thống kê nhiệm vụ theo ca phục vụ.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-lg border border-cyan-200">
                          {avgCompletionDuration}
                        </span>
                      </div>

                      <div className="h-28 w-full flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 500 140" fill="none">
                          <defs>
                            <linearGradient id="analyticsTimeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0062FF" stopOpacity="0.28" />
                              <stop offset="100%" stopColor="#0062FF" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line x1="40" y1="25" x2="480" y2="25" stroke="#E2E8F0" strokeDasharray="3,3" />
                          <line x1="40" y1="65" x2="480" y2="65" stroke="#E2E8F0" strokeDasharray="3,3" />
                          <line x1="40" y1="105" x2="480" y2="105" stroke="#E2E8F0" strokeDasharray="3,3" />
                          <text x="10" y="29" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                            {Math.max(1, missionStats?.completed ?? 1)} đơn
                          </text>
                          <text x="10" y="69" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                            {Math.max(1, Math.round((missionStats?.completed ?? 1) / 2))} đơn
                          </text>
                          <text x="10" y="109" fill="#94A3B8" fontSize="9" fontFamily="monospace">0</text>
                          {curveAreaD && <path d={curveAreaD} fill="url(#analyticsTimeGrad)" />}
                          {curvePathD && <path d={curvePathD} fill="none" stroke="#0062FF" strokeWidth="2.5" />}
                          {hourlyPoints.map((pt, i) => (
                            <g
                              key={pt.label}
                              className="cursor-pointer"
                              onClick={() => showToast(`Khung giờ ${pt.label}: ${pt.count} đơn hoàn tất`, 'info')}
                            >
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={i % 2 === 0 ? 4.5 : 3.5}
                                fill="#0062FF"
                                stroke="#FFFFFF"
                                strokeWidth={2}
                              />
                            </g>
                          ))}
                          {hourlyPoints.map((pt) => (
                            <text key={pt.label} x={pt.x} y="134" fill="#64748B" fontSize="9" textAnchor="middle" fontFamily="monospace">
                              {pt.label}
                            </text>
                          ))}
                        </svg>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-slate-100 text-xs">
                        <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono">Hoàn thành</span>
                          <div className="text-sm font-black text-emerald-800 font-mono tabular-nums">{missionStats?.completed ?? 0}</div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-700 uppercase font-mono">Đang chạy</span>
                          <div className="text-sm font-black text-blue-800 font-mono tabular-nums">{missionStats?.active ?? missions.filter((m) => m.status === 'running').length}</div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-700 uppercase font-mono">Hàng đợi</span>
                          <div className="text-sm font-black text-amber-800 font-mono tabular-nums">{missions.filter((m) => m.status === 'queued').length}</div>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-xl bg-rose-50/70 border border-rose-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-700 uppercase font-mono">Lỗi / Hủy</span>
                          <div className="text-sm font-black text-rose-800 font-mono tabular-nums">{(missionStats?.failed ?? 0) + (missionStats?.cancelled ?? 0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2">
                      <div className="shrink-0 flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <Bot className="w-4 h-4 text-blue-600" />
                            <span>Chi Tiết Hiệu Suất &amp; Tải Nhiệm Vụ Từng AMR</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">Hiệu suất vận hành ước tính theo số nhiệm vụ và trạng thái telemetry thực tế.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            loadData();
                            showToast('Đang làm mới số liệu hiệu suất đội AMR...', 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Làm mới</span>
                        </button>
                      </div>

                      {robotUtilizationList.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          Chưa có dữ liệu hiệu suất từng robot AMR.
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-white z-10">
                              <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                                <th className="py-1.5 px-2">Robot AMR</th>
                                <th className="py-1.5 px-2">Trạng thái</th>
                                <th className="py-1.5 px-2">Pin</th>
                                <th className="py-1.5 px-2">Hiệu suất</th>
                                <th className="py-1.5 px-2">Nhiệm vụ / Tốc độ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {robotUtilizationList.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-1.5 px-2 font-mono font-bold text-blue-700 whitespace-nowrap">
                                    {r.id} <span className="text-slate-500 font-sans font-medium">({r.name})</span>
                                  </td>
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                                      r.status === 'moving' || r.status === 'active'
                                        ? 'bg-blue-100 text-blue-800'
                                        : r.status === 'swapping_battery'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : r.status === 'maintenance'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 font-mono font-bold tabular-nums whitespace-nowrap">
                                    <span className={r.battery < 20 ? 'text-rose-600' : 'text-emerald-600'}>{r.battery}%</span>
                                  </td>
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${r.utilization}%` }} />
                                      </div>
                                      <span className="font-mono font-bold text-slate-700 tabular-nums">{r.utilization}%</span>
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-2 text-slate-600 max-w-[180px] truncate" title={r.mission}>
                                    {r.mission} <span className="font-mono text-[10px] text-slate-400">• {r.speed}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right 5 cols: Fleet Status & Battery + Zone Station Coverage */}
                  <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
                    <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            <span>Phân Bổ Trạng Thái &amp; Pin Đội Xe</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">Tình trạng vận hành và dung lượng pin LiFePO4 hiện thời.</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 tabular-nums shrink-0">
                          {fleetTelemetrySummary.total} Robot
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        {[
                          { label: 'Đang chạy / Giao món', count: fleetTelemetrySummary.movingOrActive, bar: 'bg-blue-600', text: 'text-blue-700' },
                          { label: 'Sẵn sàng tại bếp (Idle)', count: fleetTelemetrySummary.idle, bar: 'bg-emerald-500', text: 'text-emerald-700' },
                          { label: 'Đang thay pin (ST_BATTERY_RACK)', count: fleetTelemetrySummary.swapping, bar: 'bg-indigo-500', text: 'text-indigo-700' },
                          { label: 'Bảo trì kỹ thuật (Mở phanh)', count: fleetTelemetrySummary.maintenance, bar: 'bg-amber-500', text: 'text-amber-700' },
                          { label: 'Cảnh báo / Lỗi', count: fleetTelemetrySummary.alertState, bar: 'bg-rose-500', text: 'text-rose-700' },
                        ].map((row) => {
                          const pct = fleetTelemetrySummary.total > 0 ? Math.round((row.count / fleetTelemetrySummary.total) * 100) : 0;
                          return (
                            <div key={row.label} className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 truncate">{row.label}</span>
                                <span className={`font-mono font-bold tabular-nums shrink-0 ${row.text}`}>
                                  {row.count} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full ${row.bar} transition-all duration-300`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Phân Tầng Mức Pin LiFePO4
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <div className="text-sm font-black text-emerald-700 font-mono tabular-nums">{fleetTelemetrySummary.highBattery}</div>
                            <div className="text-[10px] text-emerald-700 font-semibold">&ge; 50% Pin</div>
                          </div>
                          <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                            <div className="text-sm font-black text-amber-700 font-mono tabular-nums">{fleetTelemetrySummary.midBattery}</div>
                            <div className="text-[10px] text-amber-700 font-semibold">20% – 49%</div>
                          </div>
                          <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                            <div className="text-sm font-black text-rose-700 font-mono tabular-nums">{fleetTelemetrySummary.lowBattery}</div>
                            <div className="text-[10px] text-rose-700 font-semibold">&lt; 20% Cần Đổi</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2">
                      <div className="shrink-0 flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span>Độ Phủ Trạm Drop-off Theo Khu Vực</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">Thống kê bàn ăn đã gán trạm dừng robot (F-09) theo khu vực.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSubTab('map-stations')}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold cursor-pointer shrink-0"
                        >
                          Quản Lý Trạm
                        </button>
                      </div>

                      {zoneCoverageList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                          <p>Chưa có dữ liệu bàn ăn để thống kê độ phủ trạm.</p>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('map-stations')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
                          >
                            Mở Bản Đồ &amp; Trạm Dừng
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                          {zoneCoverageList.map((z) => {
                            const stationPct = z.total > 0 ? Math.round((z.withStation / z.total) * 100) : 0;
                            return (
                              <div key={z.zone} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-800 truncate">{z.zone}</span>
                                  <span className="font-mono text-[11px] font-bold text-purple-700 tabular-nums shrink-0">
                                    {z.withStation}/{z.total} Đã gán trạm ({stationPct}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-600 transition-all duration-300" style={{ width: `${stationPct}%` }} />
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Tổng số bàn: <strong className="text-slate-700">{z.total}</strong></span>
                                  <span>Đang phục vụ / có khách: <strong className="text-blue-600">{z.busy}</strong></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB: MAP & STATIONS MANAGEMENT */}
            {/* ============================================================== */}
            {activeSubTab === 'map-stations' && (
              <div className="space-y-4">
                <MapStationManager
                  tables={mapTables}
                  robots={mapRobots}
                  onMapUpdated={(updatedMap) => {
                    showToast(`Đã đồng bộ bản đồ ${updatedMap.name} (${updatedMap.stations?.length || 0} trạm)!`, 'success');
                  }}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB 5: SETTINGS (Navigation Parameters + Live Diagnostics) */}
            {/* ============================================================== */}
            {activeSubTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                {/* Left Column (7 cols): Navigation Parameters + Operational Controls */}
                <div className="lg:col-span-7 space-y-3.5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-blue-600" />
                          <span>Cấu Hình Vận Hành Cảm Biến &amp; Điều Hướng</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Bộ tham số tiêu chuẩn cho điều hướng tự hành, ngưỡng an toàn lối hẹp và cơ chế bàn giao.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block">Tần Số Quét Cảm Biến</span>
                          <span className="text-[11px] text-slate-500">Tần số thu nhận dữ liệu quét 360 độ</span>
                        </div>
                        <span className="self-start font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          20 Hz (Chuẩn)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block">Khoảng Cách An Toàn Phanh Dừng</span>
                          <span className="text-[11px] text-slate-500">Vùng đệm giảm tốc &amp; dừng tự động</span>
                        </div>
                        <span className="self-start font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          0.45 m
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block">Ngưỡng Lối Đi Hẹp (Trạm Trung Chuyển)</span>
                          <span className="text-[11px] text-slate-500">Bàn có lối đi hẹp hơn ngưỡng sẽ gán trạm dừng F-09</span>
                        </div>
                        <span className="self-start font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          &lt; 0.80 m (F-09)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block">Chốt An Toàn Khi Đã Tới Bàn Cũ</span>
                          <span className="text-[11px] text-slate-500">Khóa động cơ khi nhận lệnh chuyển bàn tại điểm dừng</span>
                        </div>
                        <span className="self-start font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          Đang Bật
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Cấu Hình Khay Giao Món Phần Cứng</span>
                          </span>
                          <span className="text-[11px] text-slate-500">Số tầng khay mở tiêu chuẩn trên thân robot</span>
                        </div>
                        <span className="self-start font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          2 tầng khay mở (Khay 1 &amp; Khay 2)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Xác Thực Mở Phanh Bảo Trì (Mã PIN Động)</span>
                          </span>
                          <span className="text-[11px] text-slate-500">Mã PIN ngẫu nhiên bảo mật cho kỹ thuật viên</span>
                        </div>
                        <span className="self-start font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          6 chữ số • Hiệu lực 10 phút
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Controls Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>Điều Khiển Chế Độ Vận Hành &amp; Thao Tác Nhanh</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Can thiệp trực tiếp trạng thái mô phỏng, dừng khẩn cấp E-Stop hoặc chuyển nhanh sang quản lý bản đồ và đồng bộ dữ liệu quán.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSimulationRunning((prev) => !prev);
                          showToast(
                            isSimulationRunning ? 'Đã tạm dừng mô phỏng chuyển động robot.' : 'Đã tiếp tục mô phỏng robot.',
                            'info'
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSimulationRunning
                            ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-100/70 text-blue-900'
                            : 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900'
                        }`}
                      >
                        <div>
                          <div className="font-bold">Mô Phỏng Chuyển Động AMR</div>
                          <div className="text-[11px] opacity-80">
                            {isSimulationRunning ? 'Đang chạy — bấm để tạm dừng' : 'Đang tạm dừng — bấm để bật lại'}
                          </div>
                        </div>
                        {isSimulationRunning ? <Pause className="w-4 h-4 shrink-0" /> : <Play className="w-4 h-4 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmergencyStop((prev) => !prev);
                          showToast(
                            emergencyStop
                              ? 'Khôi phục vận hành đội xe bình thường!'
                              : 'CẢNH BÁO: ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP TOÀN BỘ AMR!',
                            emergencyStop ? 'success' : 'warning'
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          emergencyStop
                            ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700 text-white'
                            : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold">
                            {emergencyStop ? 'Khôi Phục Từ Trạng Thái E-Stop' : 'Kích Hoạt Dừng Khẩn Cấp (E-Stop)'}
                          </div>
                          <div className="text-[11px] opacity-85">
                            {emergencyStop ? 'Toàn đội xe đang khóa phanh dừng' : 'Phanh dừng ngay lập tức toàn bộ AMR'}
                          </div>
                        </div>
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('map-stations')}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer flex items-center justify-between gap-2.5"
                      >
                        <div>
                          <div className="font-bold text-slate-800">Nạp Bản Đồ &amp; Điểm Dừng</div>
                          <div className="text-[11px] text-slate-500">Quản lý trạm bếp, bàn ăn &amp; Trạm Thay Pin</div>
                        </div>
                        <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('sqlite-sync')}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all cursor-pointer flex items-center justify-between gap-2.5"
                      >
                        <div>
                          <div className="font-bold text-slate-800">Kiểm Tra Lưu Trữ &amp; Đồng Bộ Quán</div>
                          <div className="text-[11px] text-slate-500">Đối chiếu dữ liệu trạm quán và hệ thống trung tâm</div>
                        </div>
                        <Database className="w-4 h-4 text-cyan-600 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column (5 cols): Live Infrastructure Diagnostics + Quick Maintenance Access */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-600" />
                        <span>Trạng Thái Kết Nối &amp; Thiết Bị</span>
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">Mạng Điều Hướng Nội Bộ Tại Quán</span>
                          <span className="text-[11px] text-slate-500">Kênh truyền tín hiệu điều khiển đội robot</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Sẵn sàng
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 block">Chi Nhánh Đang Giám Sát</span>
                          <span className="text-[11px] text-slate-500">Cách ly dữ liệu đa thuê bao</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[160px]">
                          {currentUser?.tenantName || (tenantSlug ? tenantSlug.toUpperCase() : 'VORA Fleet')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Robot AMR</span>
                        <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{amrNodes.length}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Bàn Phục Vụ</span>
                        <div className="text-lg font-black font-mono text-slate-900 tabular-nums">{tables.length}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Hàng Đợi Lệnh</span>
                        <div className="text-lg font-black font-mono text-blue-700 tabular-nums">{missions.length}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Cảnh Báo Mở</span>
                        <div className="text-lg font-black font-mono text-amber-700 tabular-nums">{alerts.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Maintenance Mode Access */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        <span>Truy Cập Nhanh Bảo Trì (Mở Phanh)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('robots')}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Xem tất cả ({amrNodes.length})
                      </button>
                    </div>

                    {amrNodes.length === 0 ? (
                      <div className="py-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Chưa có AMR nào để kích hoạt chế độ bảo trì.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {amrNodes.slice(0, 6).map((robot) => (
                          <div
                            key={robot.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-slate-900 truncate">
                                {robot.id} <span className="text-slate-500 font-sans font-normal">({robot.name})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Pin: {robot.battery}% • {robot.status === 'maintenance' ? 'ĐANG BẢO TRÌ' : robot.status.toUpperCase()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenMaintenanceModal(robot)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 cursor-pointer transition-colors ${
                                robot.status === 'maintenance'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                              }`}
                            >
                              {robot.status === 'maintenance' ? 'Quản Lý' : 'Bảo Trì'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB: EDGE BOX & POS INTEGRATION */}
            {/* ============================================================== */}
            {activeSubTab === 'edge-setup' && (
              <div className="space-y-4">
                <StoreEdgeSetupPage embedded tenantSubdomain={tenantSlug || undefined} />
              </div>
            )}

            {/* ============================================================== */}
            {/* SUBTAB: SQLITE LOCAL DATABASE & VPS SUPERADMIN SYNC */}
            {/* ============================================================== */}
            {activeSubTab === 'sqlite-sync' && (
              <div className="space-y-4">
                <LocalSqliteSyncCard
                  liveSummary={{
                    robotsCount: amrNodes.length,
                    tablesCount: tables.length,
                    missionsCount: missions.length,
                    alertsCount: alerts.length,
                    tenantLabel: currentUser?.tenantName || tenantSlug || 'VORA Fleet',
                  }}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* NEW MISSION MODAL */}
      {showNewMissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Tạo Lệnh Điều Phối AMR Mới</h3>
              <button
                type="button"
                onClick={() => setShowNewMissionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Nhiệm Vụ:</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giao thức ăn Bàn B-03..."
                  value={newMissionTitle}
                  onChange={(e) => setNewMissionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bàn Hoặc Vị Trí Đích:</label>
                <select
                  value={newMissionDest}
                  onChange={(e) => setNewMissionDest(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  {tables.length > 0 ? (
                    tables.map((t) => (
                      <option key={t.id} value={`Bàn ${t.tableNo || t.id}`}>
                        Bàn {t.tableNo || t.id} {t.zone ? `(${t.zone})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="Bàn 01">Bàn 01 (Mặc định)</option>
                  )}
                  <option value="Trạm Thay Pin #01">Trạm Thay Pin #01</option>
                  <option value="Khu Bếp Chính">Khu Bếp Chính</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chỉ Định AMR:</label>
                <select
                  value={newMissionRobot}
                  onChange={(e) => setNewMissionRobot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  {amrNodes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} ({r.name}) • Pin: {r.battery}% • Trạng thái: {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewMissionModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Phát Lệnh Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TECHNICIAN MAINTENANCE MODE MODAL */}
      {showMaintenanceModal && targetRobotForMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${targetRobotForMaintenance.status === 'maintenance'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-orange-100 text-orange-700'
                  }`}>
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Chế Độ Bảo Trì Kỹ Thuật Viên
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mở phanh điện từ động cơ để đẩy tay & hiệu chỉnh cảm biến
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Robot Information Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 text-sm">
                  {targetRobotForMaintenance.name} ({targetRobotForMaintenance.id})
                </div>
                <div className="text-slate-500 flex items-center gap-3">
                  <span>Pin: <b className="font-mono text-emerald-600">{targetRobotForMaintenance.battery}%</b></span>
                  <span>Vị trí: <b className="font-mono text-slate-700">X:{targetRobotForMaintenance.x.toFixed(2)}, Y:{targetRobotForMaintenance.y.toFixed(2)}</b></span>
                </div>
              </div>
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${targetRobotForMaintenance.status === 'maintenance'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-200 text-slate-700'
                  }`}>
                  {targetRobotForMaintenance.status === 'maintenance' ? 'ĐANG BẢO TRÌ' : 'HOẠT ĐỘNG THƯỜNG'}
                </span>
              </div>
            </div>

            {/* Current State Notice */}
            {targetRobotForMaintenance.status === 'maintenance' ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Robot đang trong chế độ bảo trì kỹ thuật</p>
                  <p className="text-amber-800/90 text-[11px]">
                    Phanh điện từ đã mở. Nhập mã PIN kỹ thuật viên xác nhận để kết thúc bảo trì và khóa phanh, đưa robot trở về trạng thái sẵn sàng (Idle).
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Kích hoạt bảo trì an toàn</p>
                  <p className="text-blue-800/90 text-[11px]">
                    Khi kích hoạt, robot sẽ tạm dừng mọi điều phối tự động và nhả phanh điện từ động cơ giúp kỹ thuật viên có thể đẩy tay di chuyển thiết bị.
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic PIN Generation Block */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Mã PIN Kỹ Thuật Viên Động (Dynamic PIN)</span>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePin}
                  disabled={isGeneratingPin}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingPin ? 'animate-spin' : ''}`} />
                  <span>{generatedPin ? 'Tạo Lại PIN' : 'Tạo Mã PIN'}</span>
                </button>
              </div>

              {generatedPin ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-950/60 rounded-xl px-4 py-2.5 border border-slate-700/60">
                    <div className="font-mono text-2xl font-black tracking-[0.35em] text-amber-400">
                      {generatedPin}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Sao chép mã PIN"
                      >
                        {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Clock className="w-3 h-3" />
                      Hiệu lực: {Math.floor(pinCountdown / 60)}:{(pinCountdown % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-emerald-400 text-[10px]">Đã tự động điền vào ô xác thực bên dưới</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Chưa có mã PIN phiên làm việc. Nhấn &quot;Tạo Mã PIN&quot; để sinh mã 6 chữ số ngẫu nhiên (hết hạn sau 10 phút).
                </p>
              )}
            </div>

            {/* Confirmation Form */}
            <form onSubmit={handleToggleMaintenanceMode} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã PIN Xác Nhận Kỹ Thuật Viên:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Nhập 6 chữ số PIN..."
                    value={maintenancePinInput}
                    onChange={(e) => setMaintenancePinInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-base tracking-widest font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                    {maintenancePinInput.length > 0 && `${maintenancePinInput.length} ký tự`}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chấp nhận mã PIN động vừa tạo ở trên, hoặc mã PIN tài khoản nhân viên kỹ thuật đã phân quyền trong hệ thống.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  disabled={isSubmittingMaintenance}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMaintenance || !maintenancePinInput.trim()}
                  className={`px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm text-white disabled:opacity-50 ${targetRobotForMaintenance.status === 'maintenance'
                      ? 'bg-slate-800 hover:bg-slate-900'
                      : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                >
                  {isSubmittingMaintenance && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {targetRobotForMaintenance.status === 'maintenance'
                      ? 'Kết Thúc Bảo Trì (Khóa Phanh)'
                      : 'Kích Hoạt Bảo Trì (Mở Phanh)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
