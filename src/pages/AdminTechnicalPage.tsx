import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
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
  Building2,
  FileText,
  Database,
  Users,
} from 'lucide-react';
import { ZaloSupportDesk } from '../components/admin/ZaloSupportDesk';
import {
  fleetService,
  missionService,
  alertService,
  tenantService,
  type Tenant,
  type Subscription,
  type Invoice,
  type TenantDatabaseInfo,
} from '../services/portalApi';

interface AMRNode {
  id: string;
  name: string;
  status: 'active' | 'moving' | 'idle' | 'charging' | 'alert';
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
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'robots' | 'missions' | 'tenants' | 'analytics' | 'settings' | 'cskh'>('dashboard');
  const [selectedFloor, setSelectedFloor] = useState<'warehouse-main' | 'restaurant-hall' | 'kitchen-zone'>('warehouse-main');
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedAmr, setSelectedAmr] = useState<AMRNode | null>(null);
  const [showLidarLayer, setShowLidarLayer] = useState(true);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [_loading, setLoading] = useState(true);

  // In-page Toast Notifications
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToastMessage({ id, text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  };

  // Live Data States - Initialized with live [] empty states
  const [amrNodes, setAmrNodes] = useState<AMRNode[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [missions, setMissions] = useState<MissionQueueItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [databases, setDatabases] = useState<TenantDatabaseInfo[]>([]);

  // Derived Battery levels from live AMR fleet
  const fleetBatteries = amrNodes.map((node) => ({
    code: node.name,
    val: node.battery,
    status: node.battery < 20 ? 'critical' : node.battery < 50 ? 'warning' : 'nominal',
  }));

  // New Mission Modal State
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDest, setNewMissionDest] = useState('Bàn A-01');
  const [newMissionRobot, setNewMissionRobot] = useState('');

  // Fetch real data from live services
  const loadData = async () => {
    try {
      const [robotsData, missionsData, alertsData, liveTenants, liveSubs, liveInvs, liveDbs] = await Promise.all([
        fleetService.getAllRobots(),
        missionService.getMissions(),
        alertService.getAlerts(),
        tenantService.getTenants(),
        tenantService.getSubscriptions(),
        tenantService.getInvoices(),
        tenantService.getDatabases(),
      ]);

      const defaultPositions = [
        { x: 220, y: 140, targetX: 420, targetY: 140 },
        { x: 610, y: 160, targetX: 610, targetY: 260 },
        { x: 480, y: 170 },
        { x: 140, y: 310 },
        { x: 270, y: 270, targetX: 440, targetY: 270 },
        { x: 420, y: 310, targetX: 610, targetY: 310 },
      ];

      const mappedNodes: AMRNode[] = robotsData.map((r, idx) => {
        const pos = defaultPositions[idx % defaultPositions.length];
        const statusMap: Record<string, 'active' | 'moving' | 'idle' | 'charging' | 'alert'> = {
          delivering: 'moving',
          charging: 'charging',
          returning: 'moving',
          idle: 'idle',
        };
        const st = statusMap[r.status] || 'idle';
        return {
          id: r.code || r.id,
          name: r.name || r.code || `AMR-${idx + 1}`,
          status: st,
          battery: r.battery,
          x: pos.x,
          y: pos.y,
          targetX: pos.targetX,
          targetY: pos.targetY,
          mission: (r as any).currentTask || r.targetTable || (st === 'charging' ? 'Đang sạc tại Docking Bay' : 'Chờ lệnh điều phối'),
          speed: r.speed || (st === 'moving' ? '1.0 m/s' : '0.0 m/s'),
          payload: `${r.payloadKg || 0} kg`,
        };
      });
      setAmrNodes(mappedNodes);
      if (mappedNodes.length > 0 && !newMissionRobot) {
        setNewMissionRobot(mappedNodes[0].id);
      }

      // Live alerts: notifications + battery alerts
      const liveAlerts: AlertItem[] = alertsData.map((a) => ({
        id: a.id,
        robot: a.robot,
        type: a.type,
        message: a.message,
        time: a.time,
      }));
      robotsData.forEach((r) => {
        if (r.battery < 20) {
          liveAlerts.push({
            id: `alt-bat-${r.id}`,
            robot: r.code || r.name,
            type: 'critical',
            message: `Mức pin yếu (${r.battery}%) - Cần điều hướng về trạm sạc Docking`,
            time: 'Vừa xong',
          });
        }
      });
      setAlerts(liveAlerts);

      setMissions(missionsData);
      setTenants(liveTenants);
      setSubscriptions(liveSubs);
      setInvoices(liveInvs);
      setDatabases(liveDbs);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu Technical Ops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Simulation coordinates update (only when active nodes exist)
  useEffect(() => {
    if (!isSimulationRunning || emergencyStop || amrNodes.length === 0) return;

    const interval = setInterval(() => {
      setAmrNodes((prev) =>
        prev.map((node) => {
          if (node.status === 'moving' || node.status === 'active') {
            const dx = (Math.random() - 0.5) * 6;
            const dy = (Math.random() - 0.5) * 4;
            return {
              ...node,
              x: Math.min(Math.max(node.x + dx, 160), 680),
              y: Math.min(Math.max(node.y + dy, 90), 340),
            };
          }
          return node;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulationRunning, emergencyStop, amrNodes.length]);

  // Action: Resolve Alert
  const handleResolveAlert = async (id: string, robot: string) => {
    await alertService.resolveAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    showToast(`Đã xử lý sự cố cho ${robot}. Trạng thái đã bình thường hóa.`, 'success');
  };

  // Action: Send to Dock
  const handleSendToDock = async (robotId: string) => {
    await fleetService.updateRobotStatus(robotId, { status: 'charging' });
    setAmrNodes((prev) =>
      prev.map((n) =>
        n.id === robotId
          ? { ...n, status: 'charging', mission: 'Đang điều hướng về Trạm Sạc Dock 02', targetX: 140, targetY: 310 }
          : n
      )
    );
    showToast(`Đã phát lệnh điều hướng ${robotId} về trạm sạc Docking!`, 'success');
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
    await missionService.cancelMission(missionId);
    setMissions((prev) => prev.filter((m) => m.id !== missionId));
    showToast(`Đã hủy lệnh điều phối ${missionId}!`, 'info');
  };

  // Action: Prioritize Mission
  const handlePrioritizeMission = async (missionId: string) => {
    await missionService.prioritizeMission(missionId);
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, priority: 'Cao', eta: '30s (Ưu tiên số 1)' } : m))
    );
    showToast(`Đã đẩy ${missionId} lên mức ưu tiên cao nhất!`, 'success');
  };

  // Action: Create New Mission
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle) return;
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
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none animate-in slide-in-from-top-2 duration-200">
          <div
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
              toastMessage.type === 'success'
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

      {/* TOP HEADER: Dark Navy Banner Matching Reference Image 1 */}
      <header className="h-16 px-4 sm:px-6 bg-[#0A192F] text-white flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-md">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0" title="Về trang chủ">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(0,98,255,0.4)]">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white font-display hidden sm:inline">
              VORA
            </span>
          </Link>

          <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2 font-mono truncate">
              <span className="truncate">FLEET COMMAND CENTER - AMR ORCHESTRATION</span>
              <span className="hidden md:inline-flex text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/40 px-2 py-0.5 rounded-full font-bold">
                LiDAR v3.4 Live
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

          {/* Simulation Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsSimulationRunning((prev) => !prev);
              showToast(isSimulationRunning ? 'Đã tạm dừng mô phỏng chuyển động robot.' : 'Đã tiếp tục mô phỏng robot.', 'info');
            }}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isSimulationRunning
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                : 'bg-amber-950/80 border-amber-600 text-amber-300'
            }`}
            title="Tạm dừng hoặc chạy tiếp mô phỏng chuyển động AMR"
          >
            {isSimulationRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-blue-400" />
                <span>Mô Phỏng: Bật</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              emergencyStop
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            title={emergencyStop ? 'Khôi phục vận hành' : 'Dừng khẩn cấp toàn bộ AMR'}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {emergencyStop ? 'Khôi Phục Vận Hành' : 'Dừng Khẩn Cấp (E-Stop)'}
            </span>
            <span className="sm:hidden">{emergencyStop ? 'Khôi Phục' : 'E-Stop'}</span>
          </button>
        </div>
      </header>

      {/* SUB-NAVIGATION TABS (Matching Image 1: Dashboard | Robots | Missions | Analytics | Settings) */}
      <div className="h-12 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between text-xs shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', desc: 'Bản Đồ & Tổng Quan' },
            { id: 'robots', label: `Robots (${amrNodes.length})`, desc: 'Chi Tiết Đội Xe' },
            { id: 'missions', label: `Missions (${missions.length})`, desc: 'Hàng Đợi Lệnh' },
            { id: 'tenants', label: `Tenants (${tenants.length})`, desc: 'Khách Hàng SaaS' },
            { id: 'analytics', label: 'Analytics', desc: 'Báo Cáo Telemetry' },
            { id: 'settings', label: 'Settings', desc: 'Cấu Hình SLAM / ROS2' },
            { id: 'cskh', label: 'CSKH Zalo OA & RAG', desc: 'Bàn Hỗ Trợ Đa Kênh' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
            <span>FMS Core: Online (14ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>ROS 2 Humble / Nav2 Sync</span>
          </div>
        </div>
      </div>

      {/* EMERGENCY STOP TOP BANNER */}
      {emergencyStop && (
        <div className="bg-rose-50 border-b border-rose-300 px-6 py-2.5 text-rose-800 text-xs font-bold flex items-center justify-between animate-pulse">
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
      <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1920px] mx-auto w-full">
        {/* ============================================================== */}
        {/* SUBTAB 1: DASHBOARD (Matching Reference Image 1) */}
        {/* ============================================================== */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-5">
            {/* TOP ROW: 2D LiDAR Map & Recent Alerts / Mission Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* 2D Real-Time AMR Locations Floorplan Map (8 COLS) */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs">
                {/* Map Toolbar Header */}
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_#0062ff] animate-pulse" />
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                      Real-Time AMR Locations
                    </h2>
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      (2D SLAM LiDAR Grid)
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFloor}
                      onChange={(e) => {
                        setSelectedFloor(e.target.value as any);
                        showToast(`Đã chuyển sang góc nhìn ${e.target.value}`, 'info');
                      }}
                      className="bg-white border border-slate-300 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                    >
                      <option value="warehouse-main">Warehouse • Floor 1</option>
                      <option value="restaurant-hall">Dining Hall • Sảnh Nhà Hàng</option>
                      <option value="kitchen-zone">Kitchen & Docking Zone</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLidarLayer((prev) => !prev);
                        showToast(showLidarLayer ? 'Đã ẩn lớp điểm quét LiDAR.' : 'Đã hiện lớp điểm quét LiDAR.', 'info');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                        showLidarLayer
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {showLidarLayer ? 'LiDAR Point Cloud: Bật' : 'LiDAR Point Cloud: Tắt'}
                    </button>
                  </div>
                </div>

                {/* SVG 2D Floorplan Canvas (Matching Reference Image 1 Layout) */}
                <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-[#F8FAFC] border-y border-slate-200 overflow-hidden select-none p-2 flex items-center justify-center">
                  <svg className="w-full h-full max-h-[460px]" viewBox="0 0 800 440" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Background Grid Pattern */}
                    <defs>
                      <pattern id="lightGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="2,2" />
                      </pattern>
                    </defs>

                    <rect width="800" height="440" fill="url(#lightGrid)" />

                    {/* Outer Boundary Floor */}
                    <rect x="40" y="30" width="720" height="380" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />

                    {/* Docking Bay Zone */}
                    <rect x="60" y="270" width="110" height="120" rx="6" fill="#F1F5F9" stroke="#94A3B8" strokeDasharray="4,4" />
                    <text x="75" y="295" fill="#475569" fontSize="11" fontFamily="monospace" fontWeight="bold">DOCKING BAY</text>
                    <rect x="75" y="310" width="34" height="18" rx="3" fill="#E2E8F0" stroke="#94A3B8" />
                    <rect x="125" y="310" width="34" height="18" rx="3" fill="#E2E8F0" stroke="#94A3B8" />

                    {/* Zone A Storage / Tables */}
                    <rect x="90" y="70" width="90" height="150" rx="6" fill="#F1F5F9" stroke="#CBD5E1" />
                    <text x="110" y="150" fill="#64748B" fontSize="12" fontWeight="bold" fontFamily="monospace">ZONE A</text>

                    {/* Center Aisles Racks Column 1 (Grey Bars matching Image 1) */}
                    <g fill="#F1F5F9" stroke="#CBD5E1">
                      <rect x="230" y="70" width="36" height="140" rx="3" />
                      <rect x="290" y="70" width="36" height="140" rx="3" />
                      <rect x="350" y="70" width="36" height="140" rx="3" />
                      <rect x="410" y="70" width="36" height="140" rx="3" />
                    </g>

                    {/* Center Aisles Racks Column 2 */}
                    <g fill="#F1F5F9" stroke="#CBD5E1">
                      <rect x="230" y="250" width="36" height="130" rx="3" />
                      <rect x="290" y="250" width="36" height="130" rx="3" />
                      <rect x="350" y="250" width="36" height="130" rx="3" />
                      <rect x="410" y="250" width="36" height="130" rx="3" />
                    </g>

                    {/* Right Partition & Zones B & C */}
                    <line x1="490" y1="30" x2="490" y2="230" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6,4" />
                    <rect x="520" y="70" width="95" height="90" rx="6" fill="#F1F5F9" stroke="#CBD5E1" />
                    <rect x="640" y="70" width="95" height="90" rx="6" fill="#F1F5F9" stroke="#CBD5E1" />
                    <text x="545" y="120" fill="#64748B" fontSize="11" fontWeight="bold" fontFamily="monospace">ZONE B</text>
                    <text x="665" y="120" fill="#64748B" fontSize="11" fontWeight="bold" fontFamily="monospace">ZONE C</text>

                    {/* Navigation Path Vectors */}
                    {/* Path 1 */}
                    <path d="M 220 140 L 420 140" stroke="#0062FF" strokeWidth="2" strokeDasharray="4,4" />
                    <polygon points="424,140 416,136 416,144" fill="#0062FF" />

                    {/* Path 2 */}
                    <path d="M 610 160 L 610 260 L 530 260" stroke="#00D2FF" strokeWidth="2" strokeDasharray="4,4" />
                    <polygon points="526,260 534,256 534,264" fill="#00D2FF" />

                    {/* Path 3 */}
                    <path d="M 270 270 L 440 270" stroke="#10B981" strokeWidth="2" strokeDasharray="4,4" />

                    {/* LiDAR Point Cloud Layer */}
                    {showLidarLayer && (
                      <g opacity="0.6">
                        <circle cx="210" cy="130" r="2" fill="#0062FF" />
                        <circle cx="215" cy="145" r="2" fill="#0062FF" />
                        <circle cx="225" cy="135" r="2" fill="#0062FF" />
                        <circle cx="605" cy="155" r="2" fill="#00D2FF" />
                        <circle cx="615" cy="165" r="2" fill="#00D2FF" />
                        <circle cx="475" cy="165" r="2" fill="#EF4444" />
                      </g>
                    )}

                    {/* Moving AMR Markers (Matching Image 1: 'AMR01 - Active', 'AMR02 - Moving', etc.) */}
                    {amrNodes.map((node) => {
                      const isSelected = selectedAmr?.id === node.id;
                      const isWarning = node.battery < 20;

                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer transition-all duration-300"
                          onClick={() => setSelectedAmr(node)}
                        >
                          {/* Animated Pulse Ring */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? "18" : "14"}
                            fill={isWarning ? "#EF4444" : "#0062FF"}
                            opacity={isSelected ? "0.35" : "0.15"}
                            className={node.status === 'moving' || node.status === 'active' ? 'animate-ping' : ''}
                          />

                          {/* Robot Marker Box */}
                          <rect
                            x={node.x - 12}
                            y={node.y - 12}
                            width="24"
                            height="24"
                            rx="5"
                            fill={isWarning ? "#FEE2E2" : "#FFFFFF"}
                            stroke={isWarning ? "#EF4444" : isSelected ? "#00D2FF" : "#0062FF"}
                            strokeWidth="2.5"
                            className="filter drop-shadow-sm"
                          />

                          {/* Center Node Dot */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="4"
                            fill={isWarning ? "#EF4444" : "#0062FF"}
                          />

                          {/* Floating Tag Label (Matching Image 1: 'AMR01 - Active') */}
                          <g transform={`translate(${node.x - 42}, ${node.y - 32})`}>
                            <rect
                              width="84"
                              height="20"
                              rx="5"
                              fill="#0A192F"
                              stroke={isSelected ? "#00D2FF" : "#1E293B"}
                              strokeWidth="1"
                            />
                            <text
                              x="42"
                              y="14"
                              textAnchor="middle"
                              fill={isWarning ? "#FCA5A5" : "#FFFFFF"}
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {node.name} • {node.status === 'active' ? 'Active' : node.status === 'moving' ? 'Moving' : node.status === 'charging' ? 'Charge' : 'Idle'}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Empty state overlay when no AMRs connected */}
                  {amrNodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/85 backdrop-blur-[1px] p-6 text-center z-10 pointer-events-none">
                      <Radio className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-700">Chưa có Robot AMR nào kết nối với Fleet Command Center</h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                        Hệ thống chưa ghi nhận telemetry từ robot nào. Hãy khởi động dịch vụ RobotService hoặc kết nối Edge Node của nhà hàng.
                      </p>
                    </div>
                  )}

                  {/* Interactive Selected AMR Telemetry Popover Modal */}
                  {selectedAmr && (
                    <div className="absolute top-4 right-4 bg-white border-2 border-blue-600 rounded-2xl p-4 shadow-2xl backdrop-blur-md w-72 space-y-3 text-xs animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-700 font-mono text-sm">{selectedAmr.id}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            selectedAmr.battery < 20 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {selectedAmr.battery}% Pin
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedAmr(null)}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nhiệm vụ:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">{selectedAmr.mission}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tốc độ:</span>
                          <span className="font-mono text-blue-600 font-bold">{selectedAmr.speed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tải trọng:</span>
                          <span className="font-mono text-slate-700">{selectedAmr.payload}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tọa độ SLAM:</span>
                          <span className="font-mono text-slate-700">X:{Math.round(selectedAmr.x)}, Y:{Math.round(selectedAmr.y)}</span>
                        </div>
                      </div>

                      {/* Working Action Buttons for Selected AMR */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendToDock(selectedAmr.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BatteryCharging className="w-3.5 h-3.5" />
                          <span>Điều Về Trạm Sạc Docking</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePauseAmr(selectedAmr.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{selectedAmr.status === 'idle' ? 'Kích Hoạt AMR' : 'Tạm Dừng AMR'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map Footer Status Bar */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Active ({amrNodes.filter(n => n.status === 'active').length})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Moving ({amrNodes.filter(n => n.status === 'moving').length})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Idle ({amrNodes.filter(n => n.status === 'idle').length})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Charging ({amrNodes.filter(n => n.status === 'charging').length})
                    </span>
                  </div>
                  <span className="hidden sm:inline text-slate-500">Tần số quét SLAM: 20 Hz • MQTT Active</span>
                </div>
              </div>

              {/* RIGHT COLUMN: Recent Alerts & Mission Queue (4 COLS) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Recent Alerts (Matching Reference Image 1) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">Recent Alerts</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                      {alerts.length} Sự cố
                    </span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[175px] pr-1">
                    {alerts.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-4">Không có cảnh báo mới</div>
                    ) : (
                      alerts.map((alt) => (
                        <div
                          key={alt.id}
                          className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all ${
                            alt.type === 'critical'
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : alt.type === 'warning'
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-blue-50 border-blue-200 text-blue-900'
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <AlertTriangle
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                alt.type === 'critical'
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
                </div>

                {/* Mission Queue (Matching Reference Image 1) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex-1 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">Mission Queue</h3>
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
                        {missions.filter((m) => m.status === 'running').length} Active
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[195px] pr-1">
                    {missions.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-8">
                        Chưa có lệnh điều phối trong hàng đợi. Bấm &quot;Tạo Lệnh&quot; để phát lệnh mới.
                      </div>
                    ) : (
                      missions.map((mission) => (
                        <div
                          key={mission.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-xs flex items-center justify-between gap-3 group transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono font-bold text-[11px] text-blue-700">{mission.id}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                  mission.priority === 'Cao'
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
                </div>
              </div>
            </div>

            {/* MIDDLE ROW: Fleet Status Summary & Battery Levels (Matching Image 1) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Fleet Status Summary</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">{amrNodes.length} AMR Units Connected</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Active AMRs Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-bold">Active AMRs:</span>
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
                  <span className="text-xs text-slate-500 font-bold">Active Missions:</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-cyan-600 font-mono">
                      {missions.filter((m) => m.status === 'running').length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">đang điều phối</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width:
                          missions.length > 0
                            ? `${Math.round(
                                (missions.filter((m) => m.status === 'running').length / missions.length) * 100
                              )}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* Fleet Health Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs text-slate-500 font-bold">Fleet Health:</span>
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
                        width: `${
                          amrNodes.length > 0
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
                    <span>Battery Levels</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {fleetBatteries.length > 0
                        ? `${fleetBatteries[0].code} - ${fleetBatteries[fleetBatteries.length - 1].code}`
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
                            className={`w-full rounded-t transition-all ${
                              b.status === 'critical'
                                ? 'bg-rose-500 animate-pulse'
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
                    <span>{fleetBatteries[0]?.code || '—'}</span>
                    <span>{fleetBatteries[Math.floor(fleetBatteries.length / 2)]?.code || '—'}</span>
                    <span>{fleetBatteries[fleetBatteries.length - 1]?.code || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: Telemetry Charts (Matching Image 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Average Mission Completion Time (Last 24h) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-600" />
                    <span>Average Mission Completion Time (Last 24h)</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    2.6 Phút (TB)
                  </span>
                </div>

                {/* SVG Line Chart */}
                <div className="h-44 w-full pt-2 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 500 140" fill="none">
                    <defs>
                      <linearGradient id="lightTimeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0062FF" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0062FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal reference lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeDasharray="3,3" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#E2E8F0" strokeDasharray="3,3" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#E2E8F0" strokeDasharray="3,3" />

                    {/* Y-axis labels */}
                    <text x="15" y="24" fill="#94A3B8" fontSize="9" fontFamily="monospace">4.0m</text>
                    <text x="15" y="64" fill="#94A3B8" fontSize="9" fontFamily="monospace">2.5m</text>
                    <text x="15" y="104" fill="#94A3B8" fontSize="9" fontFamily="monospace">1.0m</text>

                    {/* Chart Area Fill */}
                    <path
                      d="M 50 90 Q 90 70, 130 95 T 210 50 T 290 85 T 370 40 T 450 75 L 450 120 L 50 120 Z"
                      fill="url(#lightTimeGrad)"
                    />

                    {/* Chart Stroke Curve */}
                    <path
                      d="M 50 90 Q 90 70, 130 95 T 210 50 T 290 85 T 370 40 T 450 75"
                      fill="none"
                      stroke="#0062FF"
                      strokeWidth="2.5"
                    />

                    {/* Data Points */}
                    <circle cx="50" cy="90" r="3.5" fill="#0062FF" />
                    <circle cx="130" cy="95" r="3.5" fill="#0062FF" />
                    <circle cx="210" cy="50" r="4" fill="#0062FF" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="290" cy="85" r="3.5" fill="#0062FF" />
                    <circle cx="370" cy="40" r="4" fill="#0062FF" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="450" cy="75" r="3.5" fill="#0062FF" />

                    {/* X-axis time marks */}
                    <text x="50" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">04:00</text>
                    <text x="130" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">08:00</text>
                    <text x="210" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">12:00</text>
                    <text x="290" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">16:00</text>
                    <text x="370" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">20:00</text>
                    <text x="450" y="134" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">00:00</text>
                  </svg>
                </div>
              </div>

              {/* Robot Utilization (%) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Robot Utilization (%)</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {amrNodes.length > 0
                      ? `${Math.round(amrNodes.reduce((sum, n) => sum + n.battery, 0) / amrNodes.length)}% Trung Bình`
                      : '0% (Chưa có AMR)'}
                  </span>
                </div>

                {/* Utilization Bar Chart */}
                <div className="h-44 w-full pt-2 flex items-end justify-between gap-2 px-2">
                  {amrNodes.length > 0 ? (
                    amrNodes.map((item) => {
                      const utilPercent = item.battery;
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
                          <span className="text-[9px] font-mono text-slate-600 font-bold truncate max-w-[40px]">{item.name}</span>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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

            <div className="overflow-x-auto">
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
                    amrNodes.map((robot) => (
                      <tr key={robot.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{robot.id} ({robot.name})</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            robot.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            robot.status === 'moving' ? 'bg-cyan-100 text-cyan-800' :
                            robot.status === 'charging' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {robot.status.toUpperCase()}
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
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleSendToDock(robot.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 cursor-pointer text-[11px]"
                          >
                            Về Dock Sạc
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
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 3: MISSIONS (Full Missions Manager) */}
        {/* ============================================================== */}
        {activeSubTab === 'missions' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
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

            <div className="space-y-2.5">
              {missions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Hiện tại chưa có nhiệm vụ nào trong hàng đợi điều phối. Bấm &quot;Tạo Nhiệm Vụ Mới&quot; để phát lệnh điều phối.
                </div>
              ) : (
                missions.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs text-blue-700">{m.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          m.priority === 'Cao' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
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
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB: TENANTS & SAAS PLATFORM MANAGEMENT */}
        {/* ============================================================== */}
        {activeSubTab === 'tenants' && (
          <div className="space-y-6">
            {/* Header & KPI Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Quản Lý Doanh Nghiệp SaaS & Cơ Sở Hạ Tầng Đa Người Dùng</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Giám sát phân quyền Multi-tenancy, hợp đồng đăng ký, hóa đơn đối soát PayOS và Sharded Database PostgreSQL.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadData();
                    showToast('Đã làm mới dữ liệu toàn bộ khách hàng và cơ sở dữ liệu!', 'info');
                  }}
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 hover:bg-blue-100 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đồng Bộ Danh Mục Live</span>
                </button>
              </div>

              {/* 4 Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Tổng Doanh Nghiệp (Tenants)</span>
                  <div className="mt-1 text-2xl font-black font-mono text-slate-900">{tenants.length}</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">100% Phân Lập TenantId</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Hợp Đồng Kích Hoạt</span>
                  <div className="mt-1 text-2xl font-black font-mono text-blue-600">
                    {subscriptions.filter((s) => s.status === 'Active').length}
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold">B2B Monthly/Yearly</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Doanh Thu Thu Tiền</span>
                  <div className="mt-1 text-lg font-black font-mono text-emerald-700 truncate">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0)
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">{invoices.filter((i) => i.status === 'Paid').length} Hóa đơn đã thanh toán</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Cụm DB PostgreSQL Shards</span>
                  <div className="mt-1 text-2xl font-black font-mono text-indigo-700">{databases.length}</div>
                  <span className="text-[10px] text-indigo-600 font-semibold">Isolation: Schema per Tenant</span>
                </div>
              </div>
            </div>

            {/* Live Tenants Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Doanh Nghiệp (Tenants) Đang Hoạt Động</span>
                </h4>
                <span className="text-xs font-mono text-slate-500 font-bold">{tenants.length} Bản ghi</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-2 px-3">Tên Nhà Hàng / Chuỗi</th>
                      <th className="py-2 px-3">Subdomain Slug</th>
                      <th className="py-2 px-3">Gói Dịch Vụ</th>
                      <th className="py-2 px-3">Số AMR Cấp Phép</th>
                      <th className="py-2 px-3">Trạng Thái</th>
                      <th className="py-2 px-3">Thời Gian Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                          Chưa có khách hàng doanh nghiệp nào đăng ký.
                        </td>
                      </tr>
                    ) : (
                      tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">{t.name}</td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{t.slug}.vora.vn</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {t.planName || 'Pro'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">{t.robotsCount || 0} AMRs</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Invoices & Databases Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Invoices */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Hóa Đơn & Thanh Toán Đối Soát (Invoices)</span>
                  </h4>
                  <span className="text-xs font-mono text-slate-500 font-bold">{invoices.length} Bản ghi</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2 px-2.5">Số Hóa Đơn</th>
                        <th className="py-2 px-2.5">Doanh Nghiệp</th>
                        <th className="py-2 px-2.5">Số Tiền (VND)</th>
                        <th className="py-2 px-2.5">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                            Chưa có hóa đơn nào phát sinh.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">{(inv as any).invoiceNumber || inv.id}</td>
                            <td className="py-2.5 px-2.5 font-medium text-slate-700 truncate max-w-[140px]">{inv.tenantName}</td>
                            <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-700">
                              {new Intl.NumberFormat('vi-VN').format(inv.amount)} đ
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                                inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database Shards */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span>Cụm Sharded PostgreSQL Database Nodes</span>
                  </h4>
                  <span className="text-xs font-mono text-slate-500 font-bold">{databases.length} Shards</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2 px-2.5">Database Name</th>
                        <th className="py-2 px-2.5">Doanh Nghiệp</th>
                        <th className="py-2 px-2.5">Host Cluster</th>
                        <th className="py-2 px-2.5">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {databases.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                            Chưa có cơ sở dữ liệu shard nào.
                          </td>
                        </tr>
                      ) : (
                        databases.map((db) => (
                          <tr key={db.tenantId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-2.5 font-mono text-slate-800 font-bold text-[11px] truncate max-w-[150px]">{db.dbName}</td>
                            <td className="py-2.5 px-2.5 text-slate-700 truncate max-w-[120px]">{db.tenantName}</td>
                            <td className="py-2.5 px-2.5 font-mono text-slate-500 text-[10px]">{db.host}:{db.port}</td>
                            <td className="py-2.5 px-2.5">
                              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                {db.healthStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 4: ANALYTICS (Detailed Metrics) */}
        {/* ============================================================== */}
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase font-mono">Tổng Quãng Đường Di Chuyển</span>
              <div className="text-3xl font-black font-mono text-slate-900">142.8 km</div>
              <p className="text-xs text-emerald-600 font-semibold">+12% so với tuần trước</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase font-mono">Tỉ Lệ Tránh Vật Cản Thành Công</span>
              <div className="text-3xl font-black font-mono text-blue-700">99.4%</div>
              <p className="text-xs text-slate-500">Dựa trên 1,480 lần phát hiện bằng LiDAR</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase font-mono">Thời Gian Hoạt Động (Uptime)</span>
              <div className="text-3xl font-black font-mono text-emerald-600">99.92%</div>
              <p className="text-xs text-slate-500">Chu kỳ sạc BMS LifePO4 đạt chuẩn</p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 5: SETTINGS (SLAM & ROS 2 Parameters) */}
        {/* ============================================================== */}
        {activeSubTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl space-y-5">
            <h3 className="text-base font-extrabold text-slate-900">Cấu Hình Vận Hành LiDAR & SLAM ROS 2</h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Tần Số Quét LiDAR (LiDAR Scan Rate)</span>
                  <span className="text-slate-500">Tần số thu nhận đám mây điểm 360 độ</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-200">20 Hz (Chuẩn)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Khoảng Cách An Toàn Phanh Dừng</span>
                  <span className="text-slate-500">Vùng đệm laser giảm tốc tự động</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-200">0.45 m</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Giao Thức Đồng Bộ MQTT Broker</span>
                  <span className="text-slate-500">Cổng kết nối nội bộ Edge Node LAN</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">192.168.1.120:1883</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 6: CSKH ZALO OA & RAG AI (SaaS Admin Center) */}
        {/* ============================================================== */}
        {activeSubTab === 'cskh' && (
          <div className="space-y-4">
            <ZaloSupportDesk />
          </div>
        )}
      </main>

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
                ✕
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
                  <option value="Bàn A-01">Bàn A-01 (Khu Trong Nhà)</option>
                  <option value="Bàn A-02">Bàn A-02 (Khu Trong Nhà)</option>
                  <option value="Bàn B-02">Bàn B-02 (Khu Sân Vườn VIP)</option>
                  <option value="Bàn C-01">Bàn C-01 (Tầng 1 Lẩu Nướng)</option>
                  <option value="Dock Sạc #01">Trạm Sạc Docking #01</option>
                  <option value="Khu Bếp Chính">Khu Bếp Chính (Kitchen Station)</option>
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
    </div>
  );
};
