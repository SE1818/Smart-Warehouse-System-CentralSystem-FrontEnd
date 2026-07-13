import { useState, useEffect, useMemo } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { secureRandom } from '@/utils/crypto';
import { Icons } from '@/components/Icons';
import { robotService } from '@/services/robot';


// Grid sizes (10x10 grid)
const gridRows = 10;
const gridCols = 10;

// Shelves locations (obstacles)
const shelves = [
  { x: 2, y: 1 }, { x: 2, y: 2 },
  { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 5 },
  { x: 7, y: 7 }, { x: 7, y: 8 }, { x: 8, y: 7 }, { x: 8, y: 8 }
];

// Delivery stations positions
const deliveryStations = [
  { id: 'ST01', name: 'Trạm A', x: 0, y: 2 },
  { id: 'ST02', name: 'Trạm B', x: 9, y: 2 },
  { id: 'ST03', name: 'Trạm C', x: 0, y: 6 },
  { id: 'ST04', name: 'Trạm D', x: 9, y: 6 },
  { id: 'ST05', name: 'Trạm E', x: 5, y: 0 }
];

// Charging docks
const chargingDocks = [
  { x: 0, y: 9 }, { x: 1, y: 9 }
];

// Pre-computed Maps for O(1) coordinate lookups
const shelfMap = new Map<string, boolean>(shelves.map((s) => [`${s.x},${s.y}`, true]));
const stationMap = new Map<string, typeof deliveryStations[0]>(deliveryStations.map((s) => [`${s.x},${s.y}`, s]));
const dockMap = new Map<string, boolean>(chargingDocks.map((c) => [`${c.x},${c.y}`, true]));

export function InventoryPage() {
  const { robots, status: robotConnectionStatus, connect: connectRobotHub, disconnect: disconnectRobotHub, fetchRobots } = useRobotStore();
  const signalRConnected = robotConnectionStatus === 'connected';
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);

  // Map for active robots to avoid linear searches in the 100-cell grid
  const robotMap = useMemo(() => {
    const map = new Map<string, typeof robots[0]>();
    robots.forEach((r) => map.set(`${r.x},${r.y}`, r));
    return map;
  }, [robots]);

  useEffect(() => {
    fetchRobots();
    connectRobotHub();

    const handleRefresh = () => {
      fetchRobots();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);

    return () => {
      disconnectRobotHub();
      window.removeEventListener('smartwarehouse-notification', handleRefresh);
    };
  }, [connectRobotHub, disconnectRobotHub, fetchRobots]);

  useEffect(() => {
    // Fallback simulation timer to make the robots move around
    const interval = setInterval(() => {
      if (signalRConnected) return; // Ignore simulation if real SignalR is online
      
      useRobotStore.setState(state => ({
        robots: state.robots.map(robot => {
          if (robot.status === 'Moving') {
            let dx: number;
            let dy: number;
            if (robot.id === 'AMR-01') {
              // Target Trạm A (0,2)
              dx = Math.sign(0 - robot.x);
              dy = Math.sign(2 - robot.y);
            } else {
              // Random movement
              dx = Math.floor(secureRandom() * 3) - 1;
              dy = Math.floor(secureRandom() * 3) - 1;
            }

            let nextX = Math.max(0, Math.min(gridCols - 1, robot.x + dx));
            let nextY = Math.max(0, Math.min(gridRows - 1, robot.y + dy));

            // Check if shelf collision
            const collides = shelfMap.has(`${nextX},${nextY}`);
            if (collides) {
              nextX = robot.x;
              nextY = robot.y;
            }

            // Arrive at destination check
            let status: 'Idle' | 'Moving' | 'Error' | 'Charging' | 'Offline' = robot.status;
            let dest = robot.destination;
            if (robot.id === 'AMR-01' && nextX === 0 && nextY === 2) {
              status = 'Idle';
              dest = undefined;
            }

            const nextBattery = Math.max(0, robot.battery - 0.5);
            return { 
              ...robot, 
              x: nextX, 
              y: nextY, 
              currentX: nextX,
              currentY: nextY,
              battery: nextBattery, 
              batteryLevel: nextBattery,
              status, 
              destination: dest 
            };
          } else if (robot.status === 'Idle' && secureRandom() < 0.05) {
            // Randomly trigger wandering
            return { ...robot, status: 'Moving', destination: 'Tuần tra kho' };
          } else if (robot.status === 'Charging') {
            // Recharge battery
            const nextBattery = Math.min(100, robot.battery + 2);
            return { 
              ...robot, 
              battery: nextBattery,
              batteryLevel: nextBattery
            };
          }
          return robot;
        })
      }));
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [signalRConnected]);

  const commandRobotToMove = (stationX: number, stationY: number, label: string) => {
    if (!selectedRobot) return;
    
    // Call moveRobot API to update downstream so it propagates via SignalR
    const activeRobot = robots.find(r => r.id === selectedRobot);
    if (activeRobot) {
      robotService.moveRobot(selectedRobot, stationX, stationY, activeRobot)
        .catch(err => console.error('Error commanding robot via API:', err));
    }

    useRobotStore.setState(state => ({
      robots: state.robots.map(r => {
        if (r.id === selectedRobot) {
          return {
            ...r,
            status: 'Moving',
            destination: label,
            x: stationX,
            y: stationY,
            currentX: stationX,
            currentY: stationY
          };
        }
        return r;
      })
    }));
    setSelectedRobot(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background neon glows */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Warehouse className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Giám sát Robot & Kho hàng</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Định vị robot AMR trên sơ đồ lưới nhà kho thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs">
          <span className={`w-3 h-3 rounded-full ${signalRConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></span>
          <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">
            {signalRConnected ? 'SignalR: Trực tuyến' : 'Chế độ mô phỏng (Simulation)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2.5 text-base mb-2">
              <Icons.Dashboard className="w-5 h-5 text-brand-600" />
              <span>Sơ đồ lưới nhà kho (Grid Map 10x10)</span>
            </h3>

            {/* Grid wrapper */}
            <div className="relative border border-slate-200/60 rounded-xl p-4 bg-slate-50/50 overflow-auto flex justify-center">
              <div 
                className="grid gap-1.5"
                style={{ 
                  gridTemplateColumns: `repeat(${gridCols}, minmax(44px, 1fr))`,
                  gridTemplateRows: `repeat(${gridRows}, minmax(44px, 1fr))`
                }}
              >
                {Array.from({ length: gridRows * gridCols }).map((_, idx) => {
                  const x = idx % gridCols;
                  const y = Math.floor(idx / gridCols);
                  const coordKey = `${x},${y}`;

                  // Entity checking using fast O(1) Map lookups
                  const isShelf = shelfMap.has(coordKey);
                  const activeRobot = robotMap.get(coordKey);
                  const isCharging = dockMap.has(coordKey);
                  const station = stationMap.get(coordKey);

                  return (
                    <div
                      key={idx}
                      className={`relative w-11 h-11 rounded-lg border font-mono text-[9px] flex flex-col items-center justify-center transition-all select-none ${
                        isShelf ? 'bg-slate-200 border-slate-300 text-slate-650 font-bold' :
                        isCharging ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' :
                        station ? `bg-blue-50 border-blue-200 text-blue-700 font-bold cursor-pointer hover:bg-blue-100 ${selectedRobot ? 'ring-2 ring-blue-500/30 animate-pulse' : ''}` :
                        'bg-white border-slate-200/60 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={station ? station.name : `Tọa độ: (${x}, ${y})`}
                      onClick={() => {
                        if (station && selectedRobot) {
                          commandRobotToMove(station.x, station.y, station.name);
                        }
                      }}
                    >
                      {/* Grid index coords */}
                      {!activeRobot && !isShelf && !station && !isCharging && (
                        <span className="opacity-70">{x},{y}</span>
                      )}

                      {/* Charging dock icon */}
                      {isCharging && !activeRobot && <Icons.Bolt className="w-4 h-4 text-amber-500" />}

                      {/* Shelf label */}
                      {isShelf && <span className="text-[10px] tracking-wide text-slate-500 font-semibold">KỆ</span>}

                      {/* Station name */}
                      {station && !activeRobot && (
                        <div className="text-center font-bold text-[9px] leading-tight flex flex-col items-center">
                          <Icons.Dashboard className="w-3.5 h-3.5 text-blue-500 mb-0.5" />
                          <span className="block text-[8px] text-blue-600">{station.id}</span>
                        </div>
                      )}

                      {/* Robot overlay display */}
                      {activeRobot && (
                        <div 
                          className={`absolute inset-0.5 rounded-lg flex flex-col items-center justify-center text-white font-bold text-[9px] leading-none z-15 shadow-sm ${
                            activeRobot.status === 'Error' ? 'bg-red-650 shadow-[0_0_8px_rgba(220,38,38,0.3)] animate-pulse' :
                            activeRobot.status === 'Charging' ? 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.3)] animate-pulse' :
                            activeRobot.status === 'Moving' ? 'bg-brand-600 shadow-[0_0_8px_rgba(88,129,178,0.3)]' : 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          }`}
                        >
                          <Icons.Robot className="w-4 h-4 text-white" />
                          <span className="text-[7px] mt-0.5">{activeRobot.id}</span>
                          <span className="text-[7px] mt-0.5 opacity-90">{Math.round(activeRobot.battery)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap gap-5 pt-3 justify-center text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-200 rounded border border-slate-300"></span> Kệ hàng (Obstacle)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-50 rounded border border-blue-200"></span> Trạm giao nhận (Station)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-amber-50 rounded border border-amber-200"></span> Trạm sạc (Charging)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-brand-500 rounded flex items-center justify-center text-[8px] text-white font-extrabold"><Icons.Robot className="w-2.5 h-2.5" /></span> Robot AMR</span>
            </div>
          </div>
        </div>

        {/* Robot fleet control */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                <Icons.Robot className="w-5 h-5 text-brand-600" />
                <span>Đội Robot AMR</span>
              </h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">Chọn một Robot rảnh để phát lệnh điều phối di chuyển thủ công</p>
            </div>
            
            <div className="space-y-3.5">
              {robots.map(r => (
                <div 
                  key={r.id}
                  onClick={() => {
                    if (r.status === 'Idle') setSelectedRobot(selectedRobot === r.id ? null : r.id);
                  }}
                  className={`p-4 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    selectedRobot === r.id 
                      ? 'border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500/10' 
                      : r.status === 'Idle' 
                        ? 'border-slate-200 hover:bg-slate-50/50 cursor-pointer' 
                        : 'border-slate-200/50 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedRobot === r.id ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
                      <span>{r.name}</span>
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.status === 'Idle' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                      r.status === 'Moving' ? 'bg-brand-50 text-brand-700 border-brand-200' :
                      r.status === 'Charging' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    }`}>
                      {r.status === 'Idle' ? 'Rảnh rỗi' : r.status === 'Moving' ? 'Di chuyển' : r.status === 'Charging' ? 'Đang sạc' : 'Báo lỗi'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1">Tọa độ: <strong className="text-slate-800">({r.x}, {r.y})</strong></span>
                    <span className="flex items-center gap-1">
                      Pin: 
                      <strong className={`font-bold ${r.battery > 50 ? 'text-emerald-600' : r.battery > 20 ? 'text-amber-600' : 'text-red-655'}`}>
                        {Math.round(r.battery)}%
                      </strong>
                    </span>
                  </div>

                  {r.destination && (
                    <div className="text-[10px] bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-600 font-bold border border-slate-150 flex items-center gap-1.5">
                      <Icons.Dashboard className="w-3.5 h-3.5 text-brand-600" />
                      <span>Điểm đến:</span> 
                      <span className="text-slate-900 font-extrabold">{r.destination}</span>
                    </div>
                  )}

                  {r.status === 'Idle' && (
                    <div className="text-[10px] font-bold pt-0.5 flex items-center gap-1 text-brand-600">
                      {selectedRobot === r.id ? (
                        <>
                          <span className="animate-ping w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                          <span>Hãy chọn một Trạm giao nhận (ST) trên sơ đồ lưới</span>
                        </>
                      ) : (
                        <span>Nhấp để thiết lập lộ trình thủ công</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
