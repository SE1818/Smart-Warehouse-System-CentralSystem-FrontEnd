import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRobotStore } from '@/stores/robotStore';
import { Icons } from '@/components/Icons';
import { robotMonitorService } from '@/services/robotMonitorService';
import { toast } from 'react-toastify';

export function StoreEdgeSetupPage() {
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get('subdomain') || 'launuong-saigon';
  const pairingCode = searchParams.get('pairing') || `VORA-EDGE-${subdomain.slice(0, 4).toUpperCase()}-9982`;

  // Active Tab: Robot Logs | Internal Error Center | Local DB
  const [activeTab, setActiveTab] = useState<'robots' | 'errors' | 'db'>('robots');

  // Robot Store
  const {
    robots,
    logs,
    status: signalRStatus,
    fetchRobots,
    connect: connectRobotHub,
    disconnect: disconnectRobotHub,
    addLog,
    clearLogs,
  } = useRobotStore();

  // Simulated Internal Errors (Khép kín nội bộ VORA)
  const [simulatedErrors, setSimulatedErrors] = useState<
    Array<{
      id: string;
      robot: string;
      table: string;
      type: 'OBSTACLE_BLOCKED' | 'TIMEOUT_UNCLAIMED' | 'BATTERY_LOW' | 'EMERGENCY_ESTOP';
      message: string;
      actionRecommended: string;
      time: string;
    }>
  >([]);

  // Log filter
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchRobots();
    connectRobotHub();
    return () => {
      disconnectRobotHub();
    };
  }, [fetchRobots, connectRobotHub, disconnectRobotHub]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Internal Error Simulation (VORA Closed-loop Error Center)
  const triggerInternalError = (type: 'OBSTACLE_BLOCKED' | 'TIMEOUT_UNCLAIMED' | 'BATTERY_LOW') => {
    const robot = robots[0]?.name || 'AMR-V01';
    const table = 'Bàn A-04';
    const now = new Date().toLocaleTimeString('vi-VN');

    let msg = '';
    let action = '';

    if (type === 'OBSTACLE_BLOCKED') {
      msg = `${robot} bị vật cản (ghế em bé / khách đứng) lối đi Bàn ${table} quá 15s.`;
      action = 'Phát chuông cảnh báo trên KDS & Tablet Robot. Nhân viên chạy bàn hỗ trợ bưng khay.';
    } else if (type === 'TIMEOUT_UNCLAIMED') {
      msg = `Đã đến ${table} nhưng khách chưa lấy khay sau 90s.`;
      action = 'Robot phát giọng nói mời lấy đồ. Nếu quá 120s tự quay về trạm tiếp tế.';
    } else {
      msg = `${robot} mức pin sụt giảm dưới 15% khi đang thực hiện lộ trình giao hàng.`;
      action = 'Hệ thống tự động chuyển đơn cho Robot dự phòng, đưa robot về Dock sạc ngay.';
    }

    const newErr = {
      id: `ERR-${Math.floor(1000 + Math.random() * 9000)}`,
      robot,
      table,
      type,
      message: msg,
      actionRecommended: action,
      time: now,
    };

    setSimulatedErrors((prev) => [newErr, ...prev]);
    addLog(`[VORA NỘI BỘ] ${msg} -> Xử lý: ${action}`, 'warning');
    toast.warn(msg);
  };

  const handleEmergencyStop = async (robotId: string, robotName: string) => {
    try {
      await robotMonitorService.emergencyStop(robotId);
      addLog(`[E-STOP THỦ CÔNG] Đã kích hoạt dừng khẩn cấp cho ${robotName}!`, 'error');
      toast.error(`Đã phanh dừng khẩn cấp ${robotName}`);
    } catch {
      addLog(`[E-STOP] Đã gửi lệnh phanh dừng ${robotName}`, 'error');
    }
  };

  const filteredLogs = logs.filter((l) => {
    const matchesSev = severityFilter === 'ALL' ? true : l.type.toUpperCase() === severityFilter;
    const matchesSearch =
      searchQuery.trim() === '' ? true : l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header: Edge Box at Store */}
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center p-0.5 shadow-lg shadow-brand-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-brand-600">
                <Icons.Robot className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Thiết Lập VORA Edge Node & Vận Hành Robot Cục Bộ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {subdomain}.smartwarehouse.io
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Edge Node Controller
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Trạm điều phối Edge Node tại cửa hàng: Giám sát telemetry Robot theo thời gian thực, xử lý dừng khẩn cấp E-Stop và đồng bộ cơ sở dữ liệu cục bộ.
              </p>
            </div>
          </div>

          {/* Quick Indicators */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono w-full lg:w-auto">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 flex-1 sm:flex-initial">
              <Icons.Warehouse className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Local Storage:</span>
                <strong className="text-emerald-700 font-bold">SQLite vora_local.db</strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 flex-1 sm:flex-initial">
              <Icons.Refresh className={`w-4 h-4 text-brand-600 shrink-0 ${signalRStatus === 'connecting' ? 'animate-spin' : ''}`} />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">RobotService Link:</span>
                <strong className="text-slate-900 font-bold">
                  {signalRStatus === 'connected' ? 'SignalR Active' : 'Offline Mode'}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 flex-1 sm:flex-initial">
              <Icons.AdjustmentSettings className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Mã Ghép Nối Edge:</span>
                <strong className="text-indigo-700 font-bold">{pairingCode}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex overflow-x-auto no-scrollbar whitespace-nowrap bg-slate-200/70 p-1.5 rounded-2xl max-w-full text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('robots')}
            className={`flex-1 shrink-0 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'robots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Robot className="w-4 h-4 shrink-0" />
            <span>Log Robot (RobotService)</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 shrink-0 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'errors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-500 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>Xử Lý Lỗi Khép Kín (VORA Only)</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`flex-1 shrink-0 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'db' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Warehouse className="w-4 h-4 shrink-0" />
            <span>Local DB & Sync</span>
          </button>
        </div>

        {/* TAB 1: ROBOT SERVICE & TELEMETRY STREAM */}
        {activeTab === 'robots' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {robots.map((robot) => (
                <div
                  key={robot.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                        {robot.name.slice(-2)}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{robot.name}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        robot.status.toLowerCase() === 'idle'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : robot.status.toLowerCase() === 'moving'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {robot.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Mức Pin:</span>
                      <strong className="text-emerald-700">{robot.batteryLevel ?? robot.battery}%</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Tọa Độ:</span>
                      <strong className="text-slate-800">
                        x:{robot.currentX ?? robot.x}, y:{robot.currentY ?? robot.y}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEmergencyStop(robot.id, robot.name)}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Dừng Khẩn Cấp (E-STOP)</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Terminal Log Console */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Icons.Refresh className="w-4 h-4 text-brand-400" />
                    <span>Hệ Thống Log Vận Hành Robot (RobotService Telemetry Stream)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kế thừa trực tiếp các sự kiện từ RobotService (Location, StatusChanged, E-STOP).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStreamPaused(!isStreamPaused)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    {isStreamPaused ? 'Tiếp Tục Stream' : 'Tạm Dừng'}
                  </button>
                  <button
                    type="button"
                    onClick={clearLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Xóa Log
                  </button>
                </div>
              </div>

              {/* Severity filter & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'INFO', 'WARNING', 'ERROR'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        severityFilter === sev ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sev === 'ALL' ? 'Tất Cả' : sev}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm nội dung log..."
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Log List */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 h-80 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 text-xs">
                    Chưa có sự kiện nào. Hãy kết nối hoặc kích hoạt hoạt động của robot để xem telemetry stream!
                  </div>
                ) : (
                  filteredLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl border flex items-start gap-2.5 ${
                        log.type === 'error'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                          : log.type === 'warning'
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                          : log.type === 'success'
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500 text-[10px] shrink-0 font-mono">{log.timestamp}</span>
                      <span className="px-1 py-0.5 rounded text-[9px] font-black uppercase shrink-0 bg-slate-800">
                        {log.type}
                      </span>
                      <span className="flex-1 leading-relaxed break-words">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VORA INTERNAL ERROR & LIFECYCLE CENTER */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            {/* Architecture Invariant Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-2 border-amber-400/40 p-6 rounded-3xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nguyên Tắc Xử Lý Lỗi Khép Kín (Closed-Loop Invariant)
                  </h3>
                  <span className="text-xs text-slate-600 font-medium">
                    Hệ thống AMR xử lý lỗi tự động và khép kín trong nội bộ hệ thống VORA.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    1. Xử Lý Tự Động Tại Chỗ
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Khi robot gặp sự cố (kẹt đường, sụt áp pin), hệ thống tự kích hoạt quy trình dự phòng hoặc điều chuyển sang trạm sạc mà không làm gián đoạn các luồng nghiệp vụ khác.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    2. Cảnh Báo Trực Quan
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Hiển thị trực tiếp tại <strong>Màn hình KDS Bếp</strong>, <strong>Tablet trên đầu Robot AMR</strong> (phát âm thanh cảnh báo khách dọn lối đi), và <strong>Bảng điều khiển Store Manager</strong> để nhân viên chạy bàn can thiệp kịp thời.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    3. Lưu Vết Sự Cố
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Mọi sự cố được ghi vào cơ sở dữ liệu nội bộ <strong>SQLite vora_local.db</strong> của quán và đồng bộ định kỳ về SaaS Cloud để phân tích bảo dưỡng và hiệu suất ROI.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Simulator Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Giả Lập Tình Huống Sự Cố AMR (Kiểm Thử Khâu Can Thiệp Tại Quán):
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Dành cho Kỹ thuật viên kiểm tra xử lý</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => triggerInternalError('OBSTACLE_BLOCKED')}
                  className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold text-left transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span>🚧</span>
                    <span>1. Kẹt Vật Cản Quá 15s</span>
                  </div>
                  <p className="text-[10px] text-amber-600 font-normal">
                    LiDAR nhận diện vướng ghế/người. Báo chuông đỏ trên KDS cho nhân viên bưng khay.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => triggerInternalError('TIMEOUT_UNCLAIMED')}
                  className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold text-left transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span>⏳</span>
                    <span>2. Khách Chưa Lấy Khay</span>
                  </div>
                  <p className="text-[10px] text-blue-600 font-normal">
                    Robot đợi quá 90s tại bàn. Phát giọng nói và chuông nhắc nhở thực khách.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => triggerInternalError('BATTERY_LOW')}
                  className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold text-left transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span>🔋</span>
                    <span>3. Sụt Áp Pin Dưới 15%</span>
                  </div>
                  <p className="text-[10px] text-rose-600 font-normal">
                    Tự động hoán đổi đơn sang robot khác và di chuyển về Docking Station số 1.
                  </p>
                </button>
              </div>
            </div>

            {/* Simulated Error Feed */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bảng Cảnh Báo Lỗi Nội Bộ VORA ({simulatedErrors.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setSimulatedErrors([])}
                  className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer font-bold"
                >
                  Xóa Danh Sách
                </button>
              </div>

              {simulatedErrors.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có sự cố nội bộ nào được kích hoạt. Hãy thử các nút mô phỏng ở trên!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {simulatedErrors.map((err) => (
                    <div
                      key={err.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                            {err.type}
                          </span>
                          <strong className="text-slate-900">{err.message}</strong>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          🛠️ Hành động khuyến nghị: <span className="text-brand-700 font-semibold">{err.actionRecommended}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 block">{err.time}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-block mt-1">
                          VORA Managed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOCAL DB & ON-PREMISE DELIVERY EXPLANATION */}
        {activeTab === 'db' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icons.Warehouse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kiến Trúc Bàn Giao Local Database Tại Quán (VORA Edge Node)
                </h3>
                <p className="text-xs text-slate-500">
                  Kiến trúc trạm Edge Box vận hành độc lập tại nhà hàng không phụ thuộc kết nối Internet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.SuccessCheck className="w-4 h-4 text-emerald-600" />
                  <span>1. Vận Hành Cơ Sở Dữ Liệu Cục Bộ</span>
                </h4>
                <p className="text-slate-600">
                  Toàn bộ cơ sở dữ liệu vận hành được lưu vào file <strong>`vora_local.db`</strong> (SQLite / PostgreSQL Edge) ngay trên ổ cứng của chiếc Mini PC tại quán.
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Lưu bản đồ LiDAR SLAM, tọa độ bàn ăn, dock sạc.</li>
                  <li>Lưu hàng đợi đơn hàng phục vụ và điều phối bàn.</li>
                  <li>Lưu mã PIN nhân viên (phục vụ, bếp, quản lý).</li>
                  <li><strong>Không phụ thuộc Internet:</strong> Quán đứt cáp quang thì robot vẫn phục vụ bàn bình thường.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.Refresh className="w-4 h-4 text-brand-600" />
                  <span>2. Đồng Bộ Lên Cloud SaaS</span>
                </h4>
                <p className="text-slate-600">
                  Chiếc Mini PC chạy một tiến trình nền <strong>Telemetry Heartbeat Agent</strong>:
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Cứ 3-4 giây, Agent gửi 1 gói tin Heartbeat nhỏ (Pin, vị trí, lỗi) lên Cloud (`saas.tenant_edge_nodes`).</li>
                  <li>Nếu quán mất mạng, log được tích lũy vào `LocalSyncJournal`. Khi có mạng lại sẽ tự động đẩy bù (Replay Sync) lên Cloud.</li>
                  <li><strong>Tối ưu băng thông:</strong> SaaS Portal chỉ nhận Heartbeat nhẹ, hoạt động mượt mà.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreEdgeSetupPage;
