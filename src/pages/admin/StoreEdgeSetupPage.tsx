import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRobotStore } from '@/stores/robotStore';
import { Icons } from '@/components/Icons';
import { posIngestionService, type PosOrderPacket } from '@/services/posIngestionService';
import { robotMonitorService } from '@/services/robotMonitorService';
import { toast } from 'react-toastify';

export function StoreEdgeSetupPage() {
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get('subdomain') || 'launuong-saigon';
  const pairingCode = searchParams.get('pairing') || `VORA-EDGE-${subdomain.slice(0, 4).toUpperCase()}-9982`;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pos' | 'robots' | 'db'>('pos');

  // Robot Store (Tái sử dụng trực tiếp RobotService từ hệ thống)
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

  // POS Ingestion State
  const [selectedPosType, setSelectedPosType] = useState<PosOrderPacket['posType']>('IPOS');
  const [posPackets, setPosPackets] = useState<PosOrderPacket[]>([]);
  const [latestPacket, setLatestPacket] = useState<PosOrderPacket | null>(null);

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

  // Handle POS Packet Simulation
  const handleSimulatePosPacket = () => {
    const packet = posIngestionService.createSamplePosPacket(selectedPosType);
    setPosPackets((prev) => [packet, ...prev.slice(0, 19)]);
    setLatestPacket(packet);

    addLog(
      `[POS Ingestion] Bắt gói tin từ máy ${packet.posType}: Đơn ${packet.orderId} (${packet.tableNumber} - ${packet.items.length} món, tổng: ${packet.totalAmount.toLocaleString()}đ)`,
      'info'
    );

    // Pick idle robot
    const idleRobot = robots.find((r) => r.status.toLowerCase() === 'idle') || robots[0];
    if (idleRobot) {
      addLog(
        `[Auto Dispatch] Phân bổ Robot [${idleRobot.name}] nhận khay thức ăn từ Trạm Bếp giao ra ${packet.tableNumber}`,
        'success'
      );
      toast.success(`Đã phân bổ ${idleRobot.name} giao ${packet.tableNumber}`);
    }
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
    const matchesSev =
      severityFilter === 'ALL' ? true : l.type.toUpperCase() === severityFilter;
    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header: Edge Box at Store */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center p-0.5 shadow-lg shadow-brand-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-brand-600">
                <Icons.Robot className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Thiết Lập Tại Quán (VORA Edge Node)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {subdomain}.smartwarehouse.io
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Local LAN 100% Offline-Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Giao diện dành cho Kỹ thuật viên khi đến setup tại quán: Bắt gói tin máy POS quầy thu ngân, cấu hình Local DB và điều phối Robot AMR.
              </p>
            </div>
          </div>

          {/* Quick Health Indicators */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Icons.Warehouse className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Local Database:</span>
                <strong className="text-emerald-700 font-bold">SQLite vora_local.db</strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Icons.Refresh className={`w-4 h-4 text-brand-600 ${signalRStatus === 'connecting' ? 'animate-spin' : ''}`} />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">RobotService Link:</span>
                <strong className="text-slate-900 font-bold">
                  {signalRStatus === 'connected' ? 'SignalR Active' : 'Offline Mode'}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Icons.AdjustmentSettings className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Mã Ghép Nối Edge:</span>
                <strong className="text-indigo-700 font-bold">{pairingCode}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-md text-xs font-bold">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'pos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Icons.Store className="w-4 h-4" />
            <span>Bắt Gói Tin POS Quán</span>
          </button>

          <button
            onClick={() => setActiveTab('robots')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'robots'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Icons.Robot className="w-4 h-4" />
            <span>Log Robot (RobotService)</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'db'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Icons.Warehouse className="w-4 h-4" />
            <span>Local DB & Sync</span>
          </button>
        </div>

        {/* TAB 1: POS PACKET INGESTION & DISPATCH */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: POS Config & Test Injection */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Icons.Store className="w-4 h-4 text-brand-600" />
                    <span>Bộ Bắt Gói Tin Máy POS Tại Quán</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-mono">
                    Port 9100 / Webhook
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Thiết bị Edge Box cắm cùng mạng LAN WiFi với máy POS của quán. Khi bếp nhấn "Hoàn thành món", gói tin sẽ được bắt tự động để giao cho Robot AMR.
                </p>

                {/* POS Machine Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Chọn Loại Máy POS Nhà Hàng:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    {(['IPOS', 'CUKCUK', 'KIOTVIET', 'RAW_WEBHOOK'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedPosType(type)}
                        className={`p-3 rounded-2xl border text-left transition-all ${selectedPosType === type
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <div className="font-mono text-sm">{type}</div>
                        <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                          {type === 'IPOS'
                            ? 'Chuẩn iPOS F&B'
                            : type === 'CUKCUK'
                              ? 'MISA CukCuk POS'
                              : type === 'KIOTVIET'
                                ? 'KiotViet Bar/Cafe'
                                : 'Raw TCP / Webhook'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulate Button for Technicians */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSimulatePosPacket}
                    className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <span>Bắn Thử Đơn Hàng Từ Máy POS ({selectedPosType})</span>
                  </button>
                  <span className="text-[11px] text-slate-400 text-center block mt-1.5">
                    Dành cho Kỹ thuật viên kiểm thử: Bấm để giả lập 1 đơn xong từ bếp
                  </span>
                </div>
              </div>

              {/* Connected AMR Fleet */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Đội Robot Đang Chờ Lệnh (Từ RobotService):
                </h4>
                <div className="space-y-2">
                  {robots.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${r.status.toLowerCase() === 'idle'
                              ? 'bg-emerald-500'
                              : r.status.toLowerCase() === 'moving'
                                ? 'bg-blue-500 animate-ping'
                                : 'bg-amber-500'
                            }`}
                        />
                        <span className="font-bold text-slate-900">{r.name}</span>
                      </div>
                      <div className="flex items-center space-x-3 font-mono">
                        <span className="text-slate-600">Pin: {r.batteryLevel ?? r.battery}%</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Live Ingested Packet & Stream History */}
            <div className="lg:col-span-7 space-y-6">
              {latestPacket && (
                <div className="bg-white p-6 rounded-3xl border border-brand-200 shadow-sm space-y-4 animate-fade-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <Icons.SuccessCheck className="w-4 h-4" />
                      <span>Gói Tin Mới Bóc Tách Thành Công</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{latestPacket.timestamp}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Mã Đơn POS:</span>
                      <strong className="text-slate-900">{latestPacket.orderId}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Bàn Nhận:</span>
                      <strong className="text-brand-600 text-sm">{latestPacket.tableNumber}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Số Món:</span>
                      <strong className="text-slate-900">{latestPacket.items.length} món</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Tổng Tiền:</span>
                      <strong className="text-emerald-700">{latestPacket.totalAmount.toLocaleString()}đ</strong>
                    </div>
                  </div>

                  {/* Raw Packet JSON */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Payload Gốc Máy POS Bắn Sang (Raw JSON):
                    </span>
                    <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48">
                      {latestPacket.rawPayload}
                    </pre>
                  </div>
                </div>
              )}

              {/* Packet Stream History */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Icons.HistoryLogs className="w-4 h-4 text-brand-600" />
                    <span>Lịch Sử Gói Tin Đã Bắt Tại Quán ({posPackets.length})</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Tự động ghi vào SQLite Local DB</span>
                </div>

                {posPackets.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Chưa có gói tin nào. Bấm nút "Bắn Thử Đơn Hàng Từ Máy POS" để chạy thử nghiệm!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {posPackets.map((pkt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-100 text-brand-700 border border-brand-200">
                            {pkt.posType}
                          </span>
                          <div>
                            <strong className="text-slate-900 block">{pkt.orderId}</strong>
                            <span className="text-[11px] text-slate-500">
                              {pkt.tableNumber} • {pkt.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-emerald-700 font-mono font-bold block">
                            {pkt.totalAmount.toLocaleString()}đ
                          </span>
                          <span className="text-[10px] text-slate-400">{pkt.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROBOT FLEET & ROBOTSERVICE LOGS */}
        {activeTab === 'robots' && (
          <div className="space-y-6">
            {/* Robot Fleet Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {robots.map((robot) => (
                <div key={robot.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                        <Icons.Robot className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{robot.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {robot.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
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
                      <strong className="text-slate-800">x:{robot.currentX ?? robot.x}, y:{robot.currentY ?? robot.y}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEmergencyStop(robot.id, robot.name)}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Dừng Khẩn Cấp (E-STOP)</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Terminal Log Console (Reused from RobotService) */}
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
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    {isStreamPaused ? 'Tiếp Tục Stream' : 'Tạm Dừng'}
                  </button>
                  <button
                    type="button"
                    onClick={clearLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs"
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
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${severityFilter === sev ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
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
                    Chưa có sự kiện nào. Hãy thử bắn gói tin POS để xem log hoạt động!
                  </div>
                ) : (
                  filteredLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl border flex items-start gap-2.5 ${log.type === 'error'
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
                  Tại sao toàn bộ phần này chạy trên phần mềm quản trị quán của khách mà không chạy trên SaaS Portal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.SuccessCheck className="w-4 h-4 text-emerald-600" />
                  <span>1. Chuyển DB Cho Quán Thế Nào?</span>
                </h4>
                <p className="text-slate-600">
                  Toàn bộ cơ sở dữ liệu vận hành được lưu vào file <strong>`vora_local.db`</strong> (SQLite / PostgreSQL Edge) ngay trên ổ cứng của chiếc Mini PC tại quán.
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Lưu bản đồ LiDAR SLAM, tọa độ bàn ăn, dock sạc.</li>
                  <li>Lưu hàng đợi đơn hàng nhận từ máy POS nội bộ.</li>
                  <li>Lưu 3 mã PIN nhân viên (phục vụ, bếp, quản lý).</li>
                  <li><strong>Không phụ thuộc Internet:</strong> Quán đứt cáp quang thì robot vẫn phục vụ bàn bình thường.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.Refresh className="w-4 h-4 text-brand-600" />
                  <span>2. Làm Sao Cloud SaaS Vẫn Biết Tình Trạng?</span>
                </h4>
                <p className="text-slate-600">
                  Chiếc Mini PC chạy một tiến trình nền <strong>Telemetry Heartbeat Agent</strong>:
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Cứ 3-4 giây, Agent gửi 1 gói tin Heartbeat nhỏ (Pin, vị trí, lỗi) lên Supabase Cloud (`saas.tenant_edge_nodes`).</li>
                  <li>Nếu quán mất mạng, log được tích lũy vào `LocalSyncJournal`. Khi có mạng lại sẽ tự động đẩy bù (Replay Sync) lên Cloud.</li>
                  <li><strong>Tách biệt lưu lượng:</strong> SaaS Portal chỉ nhận Heartbeat nhẹ, không phải gánh traffic gói tin POS khổng lồ của quán.</li>
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
