import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { secureRandom } from '@/utils/crypto';

interface Robot {
  id: string;
  name: string;
  x: number;
  y: number;
  battery: number;
  status: 'Idle' | 'Moving' | 'Error' | 'Charging';
  destination?: string;
}

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

export function InventoryPage() {
  const [robots, setRobots] = useState<Robot[]>([
    { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Moving', destination: 'Trạm A' },
    { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' },
    { id: 'AMR-03', name: 'AMR-03 (Hornet)', x: 0, y: 9, battery: 18, status: 'Charging' }
  ]);
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [signalRConnected, setSignalRConnected] = useState(false);

  useEffect(() => {
    // Attempt SignalR connection to backend AMR service
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5002/hubs/robot-tracking')
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        setSignalRConnected(true);
        console.log('SignalR connected to AMR service');
        connection.on('ReceiveRobotLocation', (updatedRobot: Robot) => {
          setRobots(prev => {
            const idx = prev.findIndex(r => r.id === updatedRobot.id);
            if (idx > -1) {
              const clone = [...prev];
              clone[idx] = { ...clone[idx], ...updatedRobot };
              return clone;
            }
            return [...prev, updatedRobot];
          });
        });
      })
      .catch((err: any) => {
        console.warn('SignalR fallback. Operating in simulation mode.', err);
      });

    // Fallback simulation timer to make the robots move around
    const interval = setInterval(() => {
      if (signalRConnected) return; // Ignore simulation if real SignalR is online
      
      setRobots(prev => prev.map(robot => {
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
          const collides = shelves.some(s => s.x === nextX && s.y === nextY);
          if (collides) {
            nextX = robot.x;
            nextY = robot.y;
          }

          // Arrive at destination check
          let status: 'Idle' | 'Moving' | 'Error' | 'Charging' = robot.status;
          let dest = robot.destination;
          if (robot.id === 'AMR-01' && nextX === 0 && nextY === 2) {
            status = 'Idle';
            dest = undefined;
          }

          return { ...robot, x: nextX, y: nextY, battery: Math.max(0, robot.battery - 0.5), status, destination: dest };
        } else if (robot.status === 'Idle' && secureRandom() < 0.05) {
          // Randomly trigger wandering
          return { ...robot, status: 'Moving', destination: 'Tuần tra kho' };
        } else if (robot.status === 'Charging') {
          // Recharge battery
          return { ...robot, battery: Math.min(100, robot.battery + 2) };
        }
        return robot;
      }));
    }, 2000);

    return () => {
      clearInterval(interval);
      connection.stop().catch(() => {});
    };
  }, [signalRConnected]);

  const commandRobotToMove = (_stationX: number, _stationY: number, label: string) => {
    if (!selectedRobot) return;
    setRobots(prev => prev.map(r => {
      if (r.id === selectedRobot) {
        return {
          ...r,
          status: 'Moving',
          destination: label,
          x: r.x, // Starts moving towards coordinates
          y: r.y
        };
      }
      return r;
    }));
    setSelectedRobot(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🗺️</span> Giám sát Robot & Kho hàng
          </h1>
          <p className="mt-1 text-sm text-slate-505">
            Định vị robot AMR trên sơ đồ lưới nhà kho thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${signalRConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {signalRConnected ? 'SignalR: Trực tuyến' : 'Chế độ mô phỏng (Simulation)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 text-base">
              <span>🗺️</span> Sơ đồ lưới nhà kho (Grid Map 10x10)
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

                  // Entity checking
                  const isShelf = shelves.some(s => s.x === x && s.y === y);
                  const activeRobot = robots.find(r => r.x === x && r.y === y);
                  const isCharging = chargingDocks.some(c => c.x === x && c.y === y);
                  const station = deliveryStations.find(s => s.x === x && s.y === y);

                  return (
                    <div
                      key={idx}
                      className={`relative w-11 h-11 rounded-lg border font-mono text-[9px] flex flex-col items-center justify-center transition-all select-none ${
                        isShelf ? 'bg-slate-200 border-slate-300 text-slate-700 font-bold' :
                        isCharging ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        station ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold cursor-pointer hover:bg-blue-100' :
                        'bg-white border-slate-200/60 text-slate-400 hover:bg-slate-105'
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
                        <span>{x},{y}</span>
                      )}

                      {/* Charging dock icon */}
                      {isCharging && !activeRobot && <span>⚡</span>}

                      {/* Shelf label */}
                      {isShelf && <span>Kệ</span>}

                      {/* Station name */}
                      {station && !activeRobot && (
                        <div className="text-center font-bold text-[9px] leading-tight">
                          <span>📍</span>
                          <span className="block text-[8px]">{station.id}</span>
                        </div>
                      )}

                      {/* Robot overlay display */}
                      {activeRobot && (
                        <div 
                          className={`absolute inset-0.5 rounded-lg flex flex-col items-center justify-center text-white font-bold text-[9px] leading-none z-15 shadow-sm animate-pulse ${
                            activeRobot.status === 'Error' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]' :
                            activeRobot.status === 'Charging' ? 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.4)]' :
                            activeRobot.status === 'Moving' ? 'bg-brand-650 shadow-[0_0_8px_rgba(88,129,178,0.4)]' : 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          }`}
                        >
                          <span>🤖</span>
                          <span className="text-[7px] mt-0.5">{activeRobot.id}</span>
                          <span className="text-[7px] mt-0.5">{Math.round(activeRobot.battery)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap gap-4 pt-2 justify-center text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-200 rounded border border-slate-300"></span> Kệ hàng (Obstacle)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-50 rounded border border-blue-200"></span> Trạm giao nhận (Station)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-amber-50 rounded border border-amber-200"></span> Trạm sạc (Charging)</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-brand-500 rounded"></span> Robot AMR</span>
            </div>
          </div>
        </div>

        {/* Robot fleet control */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-base">🤖 Đội Robot AMR</h3>
              <p className="text-slate-500 text-xs mt-1">Chọn một Robot rảnh để phát lệnh điều phối di chuyển thủ công</p>
            </div>
            
            <div className="space-y-3">
              {robots.map(r => (
                <div 
                  key={r.id}
                  onClick={() => {
                    if (r.status === 'Idle') setSelectedRobot(selectedRobot === r.id ? null : r.id);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    selectedRobot === r.id 
                      ? 'border-brand-500 bg-brand-50/40 shadow-xs' 
                      : 'border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.status === 'Idle' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                      r.status === 'Moving' ? 'bg-brand-50 text-brand-700 border-brand-200' :
                      r.status === 'Charging' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>Tọa độ: ({r.x}, {r.y})</span>
                    <span>Pin: {Math.round(r.battery)}%</span>
                  </div>

                  {r.destination && (
                    <div className="text-[10px] bg-slate-50 px-2.5 py-1 rounded-lg text-slate-505 font-bold border border-slate-200/60">
                      🎯 Điểm đến: <span className="text-slate-900">{r.destination}</span>
                    </div>
                  )}

                  {r.status === 'Idle' && (
                    <div className="text-[10px] text-brand-650 font-bold pt-1">
                      {selectedRobot === r.id ? '👉 Chọn một Trạm giao (ST) trên sơ đồ lưới' : '⚡ Click để chọn điều phối'}
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
