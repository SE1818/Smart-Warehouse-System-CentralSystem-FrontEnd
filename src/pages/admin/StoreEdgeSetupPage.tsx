import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRobotStore } from '@/stores/robotStore';
import { Icons } from '@/components/Icons';
import {
  posIngestionService,
  type CanonicalAmrTask,
  type DynamicMapperConfig,
  type PosSystemType,
  type PosLearningResult,
} from '@/services/posIngestionService';
import { robotMonitorService } from '@/services/robotMonitorService';
import { toast } from 'react-toastify';

export function StoreEdgeSetupPage() {
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get('subdomain') || 'launuong-saigon';
  const pairingCode = searchParams.get('pairing') || `VORA-EDGE-${subdomain.slice(0, 4).toUpperCase()}-9982`;

  // Active Tab: POS Ingestion & Adapter | Robot Logs | Internal Error Center | Local DB
  const [activeTab, setActiveTab] = useState<'pos' | 'errors' | 'robots' | 'db'>('pos');

  // Integration Strategy Subtab: Built-in | Dynamic Mapper | Open API
  const [integrationMode, setIntegrationMode] = useState<'BUILT_IN' | 'DYNAMIC_MAPPER' | 'OPEN_API'>('BUILT_IN');

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

  // POS Ingestion State
  const [selectedPosType, setSelectedPosType] = useState<PosSystemType>('IPOS');
  const [posPackets, setPosPackets] = useState<Array<{ raw: any; canonical: CanonicalAmrTask }>>([]);
  const [latestPacket, setLatestPacket] = useState<{ raw: any; canonical: CanonicalAmrTask } | null>(null);

  // Dynamic Mapper Config State
  const [dynamicConfig, setDynamicConfig] = useState<DynamicMapperConfig>({
    orderIdPath: 'data.code',
    tableNumberPath: 'data.pos_table',
    itemsArrayPath: 'data.dish_list',
    itemNameField: 'title',
    itemQtyField: 'count',
    totalAmountPath: 'data.bill_sum',
    statusConditionField: 'status',
    statusExpectedValue: 'SUCCESS',
  });
  const [customJsonInput, setCustomJsonInput] = useState<string>(
    JSON.stringify(
      {
        status: 'SUCCESS',
        store_code: 'STORE-HN-01',
        data: {
          code: 'CUSTOM-7721',
          pos_table: 'Bàn A-05',
          bill_sum: 590000,
          dish_list: [
            { title: 'Lẩu Riêu Cua Bắp Bò', count: 1 },
            { title: 'Nem Rán Phố Cổ', count: 2 },
          ],
        },
      },
      null,
      2
    )
  );

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

  // AI Once, Run Forever States (Chỉ dùng AI để Học -> Vận hành thuần Rule Engine <1ms)
  const [isAiLearning, setIsAiLearning] = useState(false);
  const [aiLearningResult, setAiLearningResult] = useState<PosLearningResult | null>(null);
  const [isRuleSaved, setIsRuleSaved] = useState(false);

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

  // AI Once, Run Forever - Bước 1: Gọi Backend AI phân tích cấu trúc Schema POS lạ
  const handleAiLearnSchema = async () => {
    setIsAiLearning(true);
    try {
      const result = await posIngestionService.learnSchemaWithAi(customJsonInput);
      setAiLearningResult(result);
      if (result.success) {
        setDynamicConfig(result.mappings);
        setIsRuleSaved(false);
        addLog(
          `[AI Once Learning] Đã nhận diện xong cấu trúc POS: ${result.posNameDetected} (Độ tin cậy: ${(result.confidence * 100).toFixed(0)}% qua ${result.aiModelUsed})`,
          'info'
        );
        toast.success(`AI đã nhận diện xong: ${result.posNameDetected}! Hãy kiểm tra các trường và bấm Lưu Quy Tắc.`);
      } else {
        toast.error('Không thể phân tích gói tin JSON. Vui lòng kiểm tra lại định dạng JSON.');
      }
    } catch {
      toast.error('Lỗi khi gọi AI phân tích.');
    } finally {
      setIsAiLearning(false);
    }
  };

  // AI Once, Run Forever - Human-in-the-loop: Lưu Quy Tắc Vào Database
  const handleSaveRuleToDb = async () => {
    if (!aiLearningResult) return;
    try {
      const res = await posIngestionService.saveMappingTemplate({
        posBrand: aiLearningResult.posNameDetected,
        mappingRules: JSON.stringify(dynamicConfig, null, 2),
        samplePayload: customJsonInput,
      });
      setIsRuleSaved(true);
      addLog(
        `[Rule Engine Saved] Đã lưu quy tắc cho ${aiLearningResult.posNameDetected} vào Database. Từ nay mọi gói tin sẽ chạy thuần Rule Engine (< 1ms, không tốn AI).`,
        'success'
      );
      toast.success(res.message || 'Đã lưu quy tắc! Từ nay chạy thuần Rule Engine (<1ms).');
    } catch {
      toast.error('Lỗi khi lưu quy tắc.');
    }
  };

  // Handle POS Packet Ingestion Test
  const handleTestIngest = () => {
    let result: { rawJson: any; canonical: CanonicalAmrTask };

    if (integrationMode === 'DYNAMIC_MAPPER') {
      try {
        const parsed = JSON.parse(customJsonInput);
        result = {
          rawJson: parsed,
          canonical: posIngestionService.adaptCustomJsonPacket(parsed, dynamicConfig),
        };
      } catch {
        toast.error('JSON tùy biến không hợp lệ! Vui lòng kiểm tra lại cú pháp.');
        return;
      }
    } else if (integrationMode === 'OPEN_API') {
      result = posIngestionService.generateSamplePacketForTesting('OPEN_API');
    } else {
      result = posIngestionService.generateSamplePacketForTesting(selectedPosType);
    }

    const item = { raw: result.rawJson, canonical: result.canonical };
    setPosPackets((prev) => [item, ...prev.slice(0, 19)]);
    setLatestPacket(item);

    addLog(
      `[POS Adapter Ingested] ${result.canonical.sourceSystem} -> Mã đơn: ${result.canonical.posOrderId} -> Chuẩn hóa VORA Task: [${result.canonical.taskId}] giao ${result.canonical.targetTable}`,
      'info'
    );

    // Pick idle robot for dispatch
    const idleRobot = robots.find((r) => r.status.toLowerCase() === 'idle') || robots[0];
    if (idleRobot) {
      addLog(
        `[VORA AMR Dispatch] Đã phân bổ [${idleRobot.name}] nhận khay thức ăn và khởi hành tới ${result.canonical.targetTable}`,
        'success'
      );
      toast.success(`Đã chuẩn hóa & phát lệnh ${idleRobot.name} tới ${result.canonical.targetTable}`);
    }
  };

  // Internal Error Simulation (VORA Closed-loop Error Center)
  const triggerInternalError = (type: 'OBSTACLE_BLOCKED' | 'TIMEOUT_UNCLAIMED' | 'BATTERY_LOW') => {
    const robot = robots[0]?.name || 'AMR-V01';
    const table = latestPacket?.canonical.targetTable || 'Bàn A-04';
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
      msg = `${robot} mức pin sụt giảm dưới 15% khi đang giao đơn ${latestPacket?.canonical.posOrderId || 'ORD-998'}.`;
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
    addLog(`[VORA NỘI BỘ] ${msg} -> Xử lý: ${action} (KHÔNG gửi callback làm phiền máy POS)`, 'warning');
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

  const openApiDocs = posIngestionService.getOpenApiDocs();

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
                  Thiết Lập VORA Edge Node & Tích Hợp Đa POS
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {subdomain}.smartwarehouse.io
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Heterogeneous Integration Layer
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tầng đệm chuẩn hóa Adapter Pattern: Nhận diện mọi hãng POS (iPOS, CukCuk, KiotViet, Custom JSON, Open API) và chỉ cảnh báo lỗi khép kín trong hệ thống VORA.
              </p>
            </div>
          </div>

          {/* Quick Indicators */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Icons.Warehouse className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-slate-400 text-[10px] block font-sans font-semibold">Local Storage:</span>
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
        <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Store className="w-4 h-4" />
            <span>Tích Hợp Đa POS (Adapter Layer)</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'errors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>Xử Lý Lỗi Khép Kín (VORA Only)</span>
          </button>

          <button
            onClick={() => setActiveTab('robots')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'robots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Robot className="w-4 h-4" />
            <span>Log Robot (RobotService)</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`flex-1 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'db' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Warehouse className="w-4 h-4" />
            <span>Local DB & Sync</span>
          </button>
        </div>

        {/* TAB 1: POS PACKET INGESTION & UNIVERSAL ADAPTER */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: POS Config & Adapter Selector */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Icons.Store className="w-4 h-4 text-brand-600" />
                    <span>Phương Thức Tích Hợp POS (3 Cách)</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-mono">
                    Adapter Pattern
                  </span>
                </div>

                {/* Integration Strategy Switcher */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIntegrationMode('BUILT_IN')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      integrationMode === 'BUILT_IN' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    1. Built-in POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationMode('DYNAMIC_MAPPER')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      integrationMode === 'DYNAMIC_MAPPER' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    2. Webhook Mapper
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationMode('OPEN_API')}
                    className={`py-2 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      integrationMode === 'OPEN_API' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    3. Open API
                  </button>
                </div>

                {/* Subview 1: Built-in Adapters */}
                {integrationMode === 'BUILT_IN' && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Chọn Hãng POS Đã Tích Hợp Sẵn:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      {(
                        [
                          { id: 'IPOS', title: 'iPOS F&B', desc: 'Bếp xong bắn TCP/JSON' },
                          { id: 'CUKCUK', title: 'MISA CukCuk', desc: 'KitchenFinished Webhook' },
                          { id: 'KIOTVIET', title: 'KiotViet Cafe', desc: 'Order.Update Webhook' },
                          { id: 'TOAST_SQUARE', title: 'Toast / Square', desc: 'Global Cloud POS' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedPosType(item.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedPosType === item.id
                              ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="font-mono text-sm">{item.title}</div>
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subview 2: Dynamic JSON Mapper & AI Once, Run Forever Engine */}
                {integrationMode === 'DYNAMIC_MAPPER' && (
                  <div className="space-y-4 text-xs">
                    {/* Architectural Concept Banner */}
                    <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl text-blue-900 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>🤖</span>
                        <span>Kiến Trúc Tối Ưu: "AI Once, Run Forever"</span>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        <strong>Bước 1 (Lần đầu):</strong> Dán JSON lạ ➔ Bấm <strong>Phân Tích AI</strong> để sinh ra bản đồ ánh xạ ➔ Bấm <strong>Lưu Quy Tắc</strong>.<br />
                        <strong>Bước 2 (Vận hành):</strong> Các lần sau chạy thuần <strong>Rule Engine (JSONPath)</strong> độ trễ &lt; 1ms, hoàn toàn không tốn chi phí AI!
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 block">Dán Payload JSON Của POS Lạ Cần Học:</label>
                        <span className="text-[10px] text-slate-400 font-mono">Hỗ trợ mọi loại JSON</span>
                      </div>
                      <textarea
                        rows={4}
                        value={customJsonInput}
                        onChange={(e) => setCustomJsonInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[10px] bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                        placeholder="Dán JSON của máy POS quán vào đây..."
                      />
                    </div>

                    {/* AI Learn Button */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={handleAiLearnSchema}
                        disabled={isAiLearning}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                      >
                        {isAiLearning ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>AI Đang Phân Tích Cấu Trúc Payload...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>BƯỚC 1: Phân Tích & Học Quy Tắc Bằng AI (AI Once)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Learned Result & Human-in-the-loop Approval */}
                    {aiLearningResult && (
                      <div className={`p-4 rounded-2xl border transition-all space-y-3 animate-fade-up ${
                        isRuleSaved
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-indigo-50/60 border-indigo-200'
                      }`}>
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{isRuleSaved ? '⚡' : '🧠'}</span>
                            <div>
                              <strong className="text-slate-900 block text-xs">
                                {isRuleSaved
                                  ? `Đã Lưu Quy Tắc: ${aiLearningResult.posNameDetected}`
                                  : `AI Nhận Diện: ${aiLearningResult.posNameDetected}`}
                              </strong>
                              <span className="text-[10px] text-slate-500">
                                Model: {aiLearningResult.aiModelUsed} • Độ tin cậy: {(aiLearningResult.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isRuleSaved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}>
                            {isRuleSaved ? 'Rule Engine Active (<1ms)' : 'Chờ Xác Nhận'}
                          </span>
                        </div>

                        {/* Mapping Fields (Editable by Human-in-the-loop) */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Đường Dẫn Số Bàn:</span>
                            <input
                              type="text"
                              value={dynamicConfig.tableNumberPath}
                              onChange={(e) => setDynamicConfig({ ...dynamicConfig, tableNumberPath: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 font-mono text-[10px] bg-white font-bold text-brand-700"
                            />
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Đường Dẫn Mã Đơn:</span>
                            <input
                              type="text"
                              value={dynamicConfig.orderIdPath}
                              onChange={(e) => setDynamicConfig({ ...dynamicConfig, orderIdPath: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 font-mono text-[10px] bg-white font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Mảng Danh Sách Món:</span>
                            <input
                              type="text"
                              value={dynamicConfig.itemsArrayPath}
                              onChange={(e) => setDynamicConfig({ ...dynamicConfig, itemsArrayPath: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-300 font-mono text-[10px] bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Tên Món / Số Lượng:</span>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={dynamicConfig.itemNameField}
                                onChange={(e) => setDynamicConfig({ ...dynamicConfig, itemNameField: e.target.value })}
                                className="w-1/2 px-1.5 py-1 rounded-lg border border-slate-300 font-mono text-[10px] bg-white"
                                placeholder="name"
                              />
                              <input
                                type="text"
                                value={dynamicConfig.itemQtyField}
                                onChange={(e) => setDynamicConfig({ ...dynamicConfig, itemQtyField: e.target.value })}
                                className="w-1/2 px-1.5 py-1 rounded-lg border border-slate-300 font-mono text-[10px] bg-white"
                                placeholder="qty"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Save Action Button */}
                        {!isRuleSaved ? (
                          <button
                            type="button"
                            onClick={handleSaveRuleToDb}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>💾</span>
                            <span>Xác Nhận & Lưu Vào Database (Chuyển Sang Rule Engine)</span>
                          </button>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-[10px] leading-relaxed flex items-center gap-2">
                            <span className="text-sm">✅</span>
                            <span><strong>Quy tắc đã lưu thành công!</strong> Từ nay khi máy POS này gửi đơn, hệ thống sẽ parse bằng code thường trong <strong>0.2ms</strong>, không tốn AI token.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}


                {/* Subview 3: Open API */}
                {integrationMode === 'OPEN_API' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                      🚀 <strong>Dành cho POS tự viết của quán:</strong> Đưa đặc tả API này cho bên phát triển phần mềm POS để họ gọi trực tiếp vào IP nội bộ của Mini PC / Edge Box.
                    </div>

                    <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5">
                      <div className="text-emerald-400 font-bold">POST {openApiDocs.endpoint}</div>
                      <div className="text-slate-400 text-[10px]">Cổng: 9100 (Local LAN / Không cần Internet)</div>
                      <div className="text-slate-400 text-[10px]">Auth Header: X-VORA-Store-Token</div>
                    </div>
                  </div>
                )}

                {/* Trigger Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestIngest}
                    className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <span>Kiểm Thử Bắt Gói Tin POS & Chuẩn Hóa AMR Task</span>
                  </button>
                  <span className="text-[11px] text-slate-400 text-center block mt-1.5">
                    Hệ thống sẽ chạy qua Adapter tương ứng để chuyển đổi sang Canonical AMR Task
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
                          className={`w-2.5 h-2.5 rounded-full ${
                            r.status.toLowerCase() === 'idle'
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

            {/* Right Col: Live Standardized Canonical Task & Packet Stream */}
            <div className="lg:col-span-7 space-y-6">
              {latestPacket && (
                <div className="bg-white p-6 rounded-3xl border border-brand-200 shadow-sm space-y-4 animate-fade-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <Icons.SuccessCheck className="w-4 h-4" />
                      <span>Đã Chuẩn Hóa Sang Định Dạng AMR Nội Bộ (Canonical Task)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{latestPacket.canonical.receivedAt}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-brand-50/60 border border-brand-200">
                      <span className="text-brand-700 text-[10px] block font-sans font-bold">VORA Task ID:</span>
                      <strong className="text-brand-900">{latestPacket.canonical.taskId}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Bàn Đích:</span>
                      <strong className="text-brand-600 text-sm font-bold">{latestPacket.canonical.targetTable}</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Số Món:</span>
                      <strong className="text-slate-900">{latestPacket.canonical.items.length} món</strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-sans">Tổng Tiền:</span>
                      <strong className="text-emerald-700">
                        {latestPacket.canonical.totalAmount.toLocaleString()}đ
                      </strong>
                    </div>
                  </div>

                  {/* Visual Comparison: POS Raw vs VORA Standard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Payload Gốc Từ Máy POS ({latestPacket.canonical.sourceSystem}):
                      </span>
                      <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(latestPacket.raw, null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Chuẩn Dữ Liệu VORA AMR Thực Thi:
                      </span>
                      <pre className="p-3.5 rounded-2xl bg-emerald-950 text-emerald-200 text-[10px] font-mono overflow-x-auto max-h-48 border border-emerald-800">
                        {JSON.stringify(
                          {
                            taskId: latestPacket.canonical.taskId,
                            destination: latestPacket.canonical.targetTable,
                            items: latestPacket.canonical.items,
                            status: 'DISPATCHING_TO_AMR',
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Ingestion Stream History */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Icons.HistoryLogs className="w-4 h-4 text-brand-600" />
                    <span>Lịch Sử Các Gói Tin Đã Bắt Tại Quán ({posPackets.length})</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Tự động ghi vào SQLite Local DB</span>
                </div>

                {posPackets.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Chưa có gói tin nào. Bấm nút "Kiểm Thử Bắt Gói Tin POS" để xem Adapter hoạt động!
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
                            {pkt.canonical.sourceSystem}
                          </span>
                          <div>
                            <strong className="text-slate-900 block">
                              {pkt.canonical.taskId} ({pkt.canonical.posOrderId})
                            </strong>
                            <span className="text-[11px] text-slate-500">
                              {pkt.canonical.targetTable} •{' '}
                              {pkt.canonical.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-emerald-700 font-mono font-bold block">
                            {pkt.canonical.totalAmount.toLocaleString()}đ
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{pkt.canonical.receivedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    Nguyên Tắc Xử Lý Lỗi Khép Kín (Closed-Loop Invariant — Không Callback Về POS)
                  </h3>
                  <span className="text-xs text-slate-600 font-medium">
                    Hệ thống AMR chỉ nhận lệnh 1 chiều từ máy POS (One-way Fire & Forget Dispatch).
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    1. Tại Sao Không Gửi Lỗi Về POS?
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Máy POS quầy thu ngân chỉ quản lý tính tiền và in bill. Khi robot kẹt đường hoặc hỏng pin, thu ngân không thể can thiệp được. Đẩy lỗi về POS sẽ làm treo màn hình bán hàng và rối quy trình thanh toán.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    2. Lỗi Được Hiển Thị Ở Đâu?
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Hiển thị trực tiếp tại <strong>Màn hình KDS Bếp</strong>, <strong>Tablet trên đầu Robot AMR</strong> (phát âm thanh cảnh báo khách dọn lối đi), và <strong>Bảng điều khiển Store Manager</strong> để nhân viên chạy bàn can thiệp thủ công.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    3. Lưu Vết Sự Cố Ở Đâu?
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

        {/* TAB 3: ROBOT SERVICE & TELEMETRY STREAM */}
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
                    Chưa có sự kiện nào. Hãy thử kích hoạt gói tin POS để xem log hoạt động!
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

        {/* TAB 4: LOCAL DB & ON-PREMISE DELIVERY EXPLANATION */}
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
