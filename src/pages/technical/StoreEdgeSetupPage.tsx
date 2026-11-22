import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRobotStore } from '@/stores/robotStore';
import { Bot, RefreshCw, AlertTriangle, Database, Settings, CheckCircle2 } from 'lucide-react';
import { robotMonitorService } from '@/services/robotMonitorService';
import { toast } from 'react-toastify';

interface StoreEdgeSetupPageProps {
  embedded?: boolean;
  tenantSubdomain?: string;
}

export function StoreEdgeSetupPage({ embedded = false, tenantSubdomain }: StoreEdgeSetupPageProps = {}) {
  const [searchParams] = useSearchParams();
  const subdomain = tenantSubdomain || searchParams.get('subdomain') || 'launuong-saigon';
  const pairingCode = searchParams.get('pairing') || `VORA-STORE-${subdomain.slice(0, 4).toUpperCase()}-9982`;

  // Active Tab: Robot Logs | Internal Error Center | Local DB
  const [activeTab, setActiveTab] = useState<'robots' | 'errors' | 'db'>('robots');

  // Robot Store
  const {
    robots,
    logs,
    fetchRobots,
    connect: connectRobotHub,
    disconnect: disconnectRobotHub,
    addLog,
    clearLogs,
  } = useRobotStore();

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

  const handleEmergencyStop = async (robotId: string, robotName: string) => {
    try {
      await robotMonitorService.emergencyStop(robotId);
      addLog(`[E-STOP THỦ CÔNG] Đã kích hoạt dừng khẩn cấp cho ${robotName}!`, 'error');
      toast.error(`Đã phanh dừng khẩn cấp ${robotName}`);
    } catch {
      addLog(`[E-STOP THẤT BẠI] Không thể gửi lệnh dừng khẩn cấp cho ${robotName}`, 'error');
      toast.error(`Không thể gửi lệnh dừng khẩn cấp cho ${robotName}. Vui lòng thử lại.`);
    }
  };

  const incidentLogs = logs.filter((l) => l.type === 'error' || l.type === 'warning');

  const filteredLogs = logs.filter((l) => {
    const matchesSev = severityFilter === 'ALL' ? true : l.type.toUpperCase() === severityFilter;
    const matchesSearch =
      searchQuery.trim() === '' ? true : l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  return (
    <div className={embedded ? 'text-slate-800 space-y-3 font-sans' : 'min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8 font-sans'}>
      <div className={embedded ? 'w-full space-y-3' : 'max-w-7xl mx-auto space-y-6 sm:space-y-8'}>
        {/* Header: Store Controller */}
        <div className={embedded ? 'bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3' : 'bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6'}>
          <div className={`flex items-center ${embedded ? 'space-x-3' : 'space-x-4'}`}>
            <div className={embedded ? 'w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center p-0.5 shadow-md shadow-brand-500/20 shrink-0' : 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center p-0.5 shadow-lg shadow-brand-500/20 shrink-0'}>
              <div className={`w-full h-full bg-white ${embedded ? 'rounded-[10px]' : 'rounded-[14px]'} flex items-center justify-center text-brand-600`}>
                <Bot className={embedded ? 'w-5 h-5' : 'w-6 h-6 sm:w-8 sm:h-8'} />
              </div>
            </div>

            <div className={embedded ? 'space-y-0.5' : 'space-y-1'}>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className={embedded ? 'text-base sm:text-lg font-black text-slate-900 tracking-tight' : 'text-xl sm:text-2xl font-black text-slate-900 tracking-tight'}>
                  Thiết Lập Trạm Quán & Vận Hành Robot Tại Chỗ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {subdomain}.vora.vn
                </span>
              </div>
              <p className={embedded ? 'text-[11px] text-slate-500 font-medium' : 'text-xs text-slate-500 font-medium'}>
                Trạm điều phối tại cửa hàng: Giám sát vận hành Robot theo thời gian thực, xử lý dừng khẩn cấp E-Stop và quản lý dữ liệu tại quán.
              </p>
            </div>
          </div>

          {/* Quick Indicators */}
          <div className={`flex flex-wrap items-center ${embedded ? 'gap-2' : 'gap-3'} text-xs font-mono w-full lg:w-auto shrink-0`}>
            <div className={`${embedded ? 'px-2.5 py-1.5 rounded-xl' : 'p-3 rounded-2xl'} bg-slate-50 border border-slate-200 flex items-center gap-2 flex-1 sm:flex-initial`}>
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Lưu Trữ Tại Quán:</span>
                <strong className="text-emerald-700 font-bold">Bộ Nhớ Nội Bộ</strong>
              </div>
            </div>

            <div className={`${embedded ? 'px-2.5 py-1.5 rounded-xl' : 'p-3 rounded-2xl'} bg-slate-50 border border-slate-200 flex items-center gap-2 flex-1 sm:flex-initial`}>
              <Settings className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Mã Ghép Nối Trạm:</span>
                <strong className="text-indigo-700 font-bold">{pairingCode}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className={`flex overflow-x-auto no-scrollbar whitespace-nowrap bg-slate-200/70 ${embedded ? 'p-1 rounded-xl' : 'p-1.5 rounded-2xl'} max-w-full text-xs font-bold gap-1`}>
          <button
            onClick={() => setActiveTab('robots')}
            className={`flex-1 shrink-0 ${embedded ? 'py-1.5 px-3 rounded-lg' : 'py-2.5 px-4 rounded-xl'} transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'robots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>Nhật Ký Vận Hành Robot</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 shrink-0 ${embedded ? 'py-1.5 px-3 rounded-lg' : 'py-2.5 px-4 rounded-xl'} transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'errors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Xử Lý Lỗi Khép Kín</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`flex-1 shrink-0 ${embedded ? 'py-1.5 px-3 rounded-lg' : 'py-2.5 px-4 rounded-xl'} transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'db' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Lưu Trữ & Đồng Bộ</span>
          </button>
        </div>

        {/* TAB 1: ROBOT TELEMETRY STREAM */}
        {activeTab === 'robots' && (
          <div className={embedded ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start' : 'space-y-5'}>
            <div className={embedded ? 'lg:col-span-5 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto pr-1' : ''}>
              {robots.length === 0 ? (
                <div className={embedded ? 'bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-start justify-between gap-3' : 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3'}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Chưa có thiết bị AMR nào trực tuyến tại trạm {subdomain}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Khi Robot kết nối với trạm quán, trạng thái pin, tọa độ và nút E-Stop nhanh sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchRobots()}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Quét Lại Thiết Bị</span>
                  </button>
                </div>
              ) : (
              <div className={embedded ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'}>
                {robots.map((robot) => (
                  <div
                    key={robot.id}
                    className={embedded ? 'bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5' : 'bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3'}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
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
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {robot.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block font-sans">Mức Pin:</span>
                        <strong className="text-emerald-700">{robot.batteryLevel ?? robot.battery}%</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block font-sans">Tọa Độ:</span>
                        <strong className="text-slate-800">
                          x:{robot.currentX ?? robot.x}, y:{robot.currentY ?? robot.y}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEmergencyStop(robot.id, robot.name)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Dừng Khẩn Cấp (E-STOP)</span>
                    </button>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Terminal Log Console */}
            <div className={embedded ? 'lg:col-span-7 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-3 h-[calc(100vh-250px)] min-h-[300px]' : 'bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4'}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 ${embedded ? 'pb-3 shrink-0' : 'pb-4'}`}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-brand-400" />
                    <span>Nhật Ký Vận Hành Đội Robot</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ghi nhận trực tiếp các sự kiện vị trí, thay đổi trạng thái và dừng khẩn cấp E-Stop.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsStreamPaused(!isStreamPaused)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    {isStreamPaused ? 'Tiếp Tục Cập Nhật' : 'Tạm Dừng'}
                  </button>
                  <button
                    type="button"
                    onClick={clearLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Xóa Nhật Ký
                  </button>
                </div>
              </div>

              {/* Severity filter & Search */}
              <div className={`${embedded ? 'shrink-0 ' : ''}flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs`}>
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
                  placeholder="Tìm kiếm nội dung nhật ký..."
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Log List */}
              <div className={embedded ? 'flex-1 min-h-0 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5 overflow-y-auto dark-scrollbar' : 'p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 h-80 overflow-y-auto dark-scrollbar'}>
                {filteredLogs.length === 0 ? (
                  <div className={embedded ? 'h-full flex items-center justify-center text-center text-slate-500 text-xs px-4' : 'text-center py-20 text-slate-500 text-xs'}>
                    Chưa có sự kiện nào. Hãy kết nối hoặc kích hoạt hoạt động của robot để xem nhật ký vận hành!
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
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nguyên Tắc Xử Lý Lỗi Khép Kín Nội Bộ
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
                    Khi robot gặp sự cố (kẹt đường, sụt áp pin), hệ thống tự kích hoạt quy trình dự phòng hoặc điều chuyển sang Trạm Thay Pin mà không làm gián đoạn các luồng nghiệp vụ khác.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    2. Cảnh Báo Trực Quan
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Hiển thị trực tiếp tại <strong>Màn hình KDS Bếp</strong>, <strong>Tablet trên đầu Robot AMR</strong> (phát âm thanh cảnh báo khách dọn lối đi), và <strong>Bảng điều khiển Quản Lý Quán</strong> để nhân viên chạy bàn can thiệp kịp thời.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    3. Lưu Vết Sự Cố
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Mọi sự cố được ghi vào bộ nhớ dữ liệu nội bộ của quán và đồng bộ định kỳ về hệ thống trung tâm để phân tích bảo dưỡng và hiệu suất vận hành.
                  </p>
                </div>
              </div>
            </div>

            {/* Incident Log Feed */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bảng Cảnh Báo Sự Cố Vận Hành ({incidentLogs.length})
                </h4>
              </div>

              {incidentLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa ghi nhận sự cố nào từ đội robot.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {incidentLogs.map((entry, idx) => (
                    <div
                      key={`${entry.timestamp}-${idx}`}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            entry.type === 'error' ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        />
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border inline-block ${
                              entry.type === 'error'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {entry.type === 'error' ? 'LỖI' : 'CẢNH BÁO'}
                          </span>
                          <p className="text-slate-900 font-semibold">{entry.message}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 block">{entry.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOCAL STORAGE & ON-PREMISE DELIVERY EXPLANATION */}
        {activeTab === 'db' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kiến Trúc Lưu Trữ & Vận Hành Độc Lập Tại Quán
                </h3>
                <p className="text-xs text-slate-500">
                  Thiết bị trạm tại nhà hàng vận hành ổn định ngay cả khi kết nối mạng chập chờn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Vận Hành Dữ Liệu Tại Quán</span>
                </h4>
                <p className="text-slate-600">
                  Toàn bộ dữ liệu vận hành được lưu trữ trực tiếp trên thiết bị điều phối đặt tại nhà hàng.
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Lưu bản đồ mặt bằng, tọa độ bàn ăn, Trạm Thay Pin.</li>
                  <li>Lưu hàng đợi đơn hàng phục vụ và điều phối bàn.</li>
                  <li>Lưu mã PIN nhân viên (phục vụ, bếp, quản lý).</li>
                  <li><strong>Vận hành liên tục:</strong> Quán mất kết nối mạng bên ngoài thì robot vẫn phục vụ bàn bình thường.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-brand-600" />
                  <span>2. Đồng Bộ Lên Hệ Thống Trung Tâm</span>
                </h4>
                <p className="text-slate-600">
                  Thiết bị tại quán tự động đồng bộ trạng thái vận hành với trung tâm:
                </p>
                <ul className="space-y-1.5 text-slate-500 text-[11px] list-disc pl-4">
                  <li>Cứ 3-4 giây, trạm quán gửi tín hiệu trạng thái (Pin, vị trí, cảnh báo) lên hệ thống trung tâm.</li>
                  <li>Nếu quán mất mạng, nhật ký được lưu tạm tại quán. Khi có mạng lại sẽ tự động đồng bộ bù lên hệ thống.</li>
                  <li><strong>Tối ưu băng thông:</strong> Cổng quản trị chỉ nhận gói tin trạng thái gọn nhẹ, hoạt động mượt mà.</li>
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
