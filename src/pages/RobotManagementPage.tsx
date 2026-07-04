import { useState, useEffect, useCallback } from 'react';
import { robotService } from '../services/robot';
import type { Robot, MoveRequest } from '../types/robot';
import { Icons } from '@/components/Icons';
import type { Order } from '../types/product';
import { toast } from 'react-toastify';
import { CustomSelect } from '@/components/CustomSelect';

export function RobotManagementPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

  const loadRobots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await robotService.listRobots();
      setRobots(data);
    } catch (err) {
      setError('Không thể tải danh sách robot');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRobots();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRobots]);

  useEffect(() => {
    const handleRefresh = () => {
      loadRobots();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [loadRobots]);

  const handleMove = async (request: MoveRequest) => {
    if (!selectedRobot) return;

    try {
      setActionLoading(true);
      await robotService.moveRobot(selectedRobot.id, request.x, request.y, selectedRobot);
      await loadRobots();
      setShowMoveModal(false);
      toast.success(`Robot ${selectedRobot.name} đang di chuyển tới (${request.x}, ${request.y})`);
    } catch (err) {
      toast.error('Không thể di chuyển robot');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (robot: Robot, status: string) => {
    try {
      setActionLoading(true);
      await robotService.updateRobotStatus(robot.id, status, robot);
      await loadRobots();
      toast.success(`Đã cập nhật trạng thái robot ${robot.name} thành ${status === 'Idle' ? 'Rảnh' : status === 'Charging' ? 'Đang sạc' : 'Lỗi'}`);
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái robot');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async (orderId: string, robotId: string) => {
    try {
      setActionLoading(true);

      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Không tìm thấy thông tin đơn hàng');
        return;
      }

      // Map deliveryNodeId to Guid
      const stationMap: Record<string, string> = {
        'ST01': '11111111-1111-1111-1111-111111111111',
        'ST02': '22222222-2222-2222-2222-222222222222',
        'ST03': '33333333-3333-3333-3333-333333333333',
        'ST04': '44444444-4444-4444-4444-444444444444',
        'ST05': '55555555-5555-5555-5555-555555555555'
      };

      const toStationId = stationMap[order.deliveryNodeId || ''] || stationMap['ST01'];
      const fromStationId = stationMap['ST05']; // Trạm E (pickup)

      await robotService.fulfillOrder(robotId, orderId, fromStationId, toStationId);
      setShowFulfillmentModal(false);
      await loadRobots();
      toast.success('Phân công robot xử lý đơn hàng thành công!');
    } catch (err) {
      toast.error('Không thể xử lý đơn hàng');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const loadPendingOrders = async () => {
    try {
      const orders = await robotService.listPendingOrders();
      setPendingOrders(orders);
      if (orders.length > 0) {
        setShowFulfillmentModal(true);
      } else {
        toast.info('Không có đơn hàng nào chờ xử lý');
      }
    } catch (err) {
      toast.error('Không thể tải danh sách đơn hàng chờ');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; dot: string; label: string }> = {
      Idle: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/50', dot: 'bg-emerald-500', label: 'Rảnh' },
      Moving: { bg: 'bg-blue-50 text-blue-700 border-blue-200/50', dot: 'bg-blue-500 animate-pulse', label: 'Đang di chuyển' },
      Charging: { bg: 'bg-amber-50 text-amber-700 border-amber-200/50', dot: 'bg-amber-500 animate-bounce', label: 'Đang sạc' },
      Error: { bg: 'bg-rose-50 text-rose-700 border-rose-200/50', dot: 'bg-rose-500 animate-ping', label: 'Lỗi hệ thống' },
      Offline: { bg: 'bg-slate-50 text-slate-600 border-slate-200/50', dot: 'bg-slate-400', label: 'Ngoại tuyến' },
    };
    const style = styles[status] || styles.Offline;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {style.label}
      </span>
    );
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    if (battery > 20) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-rose-500 to-red-500 animate-pulse';
  };

  const totalRobots = robots.length;
  const idleRobots = robots.filter(r => r.status === 'Idle').length;
  const movingRobots = robots.filter(r => r.status === 'Moving').length;
  const chargingRobots = robots.filter(r => r.status === 'Charging').length;
  const errorRobots = robots.filter(r => r.status === 'Error').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm max-w-sm w-full">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải trạng thái hệ thống robot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 shadow-sm border border-brand-100">
                <Icons.Robot className="w-7 h-7" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Quản lý Robot AMR</span>
            </h1>
            <p className="text-slate-500 text-sm">Giám sát trạng thái hoạt động, tọa độ và thời lượng pin của các Robot tự hành.</p>
          </div>
          <button
            onClick={loadPendingOrders}
            disabled={actionLoading}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Icons.CartOrder className="w-5 h-5" />
            <span>Xử lý đơn hàng chờ</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold leading-relaxed flex items-start gap-2.5 shadow-sm">
            <Icons.AlertWarning className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview Statistics (Bento Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng số Robot</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{totalRobots}</span>
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600 text-xs"><Icons.Robot className="w-4 h-4" /></span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Sẵn sàng (Rảnh)</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{idleRobots}</span>
              <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /></span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Đang hoạt động</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{movingRobots}</span>
              <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600 text-xs animate-pulse"><Icons.Truck className="w-4 h-4" /></span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Đang sạc pin</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{chargingRobots}</span>
              <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600 text-xs"><Icons.Bolt className="w-4 h-4 text-amber-500" /></span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Lỗi hệ thống</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{errorRobots}</span>
              <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600 text-xs"><Icons.AlertWarning className="w-4 h-4 text-rose-500" /></span>
            </div>
          </div>
        </div>

        {/* Robot Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {robots.map((robot) => (
            <div
              key={robot.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-955 group-hover:text-brand-600 transition-colors">
                      {robot.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 select-all">
                        {robot.id.substring(0, 8)}...{robot.id.substring(robot.id.length - 8)}
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(robot.id);
                          toast.info('Đã sao chép ID Robot!');
                        }}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Sao chép ID"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M19.5 3.562a2.25 2.25 0 0 1-2.24 2.24H6.74A2.25 2.25 0 0 1 4.5 3.562m15 0h-15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {getStatusBadge(robot.status)}
                </div>

                {/* Battery Level Widget */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Icons.Bolt className={`w-4 h-4 ${robot.status === 'Charging' ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span>Dung lượng Pin</span>
                    </span>
                    <span className="text-slate-900">{robot.battery.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBatteryColor(robot.battery)}`}
                      style={{ width: `${robot.battery}%` }}
                    />
                  </div>
                </div>

                {/* Position Coordinates Widget */}
                <div className="bg-slate-50/80 rounded-2xl p-4 flex justify-between items-center border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vị trí hiện tại</span>
                  <span className="font-mono text-sm font-extrabold text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">
                    X: {robot.x.toFixed(2)} / Y: {robot.y.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setSelectedRobot(robot);
                    setShowMoveModal(true);
                  }}
                  disabled={robot.status === 'Moving' || robot.status === 'Charging'}
                  className="flex flex-col items-center justify-center py-2.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-400 border border-slate-200 hover:border-slate-300 rounded-2xl text-[11px] font-bold shadow-xs active:scale-[0.96] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mb-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                  </svg>
                  <span>Di chuyển</span>
                </button>
                <button
                  onClick={() => {
                    if (robot.status === 'Idle') {
                      handleStatusUpdate(robot, 'Charging');
                    } else if (robot.status === 'Charging') {
                      handleStatusUpdate(robot, 'Idle');
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-2xl text-[11px] font-bold border shadow-xs active:scale-[0.96] transition-all cursor-pointer ${
                    robot.status === 'Charging'
                      ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-700 border-amber-200/50'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icons.Bolt className="w-4 h-4 mb-1" />
                  <span>{robot.status === 'Charging' ? 'Dừng sạc' : 'Sạc Pin'}</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Bạn có chắc muốn cập nhật trạng thái lỗi cho robot này?')) {
                      handleStatusUpdate(robot, 'Error');
                    }
                  }}
                  className="flex flex-col items-center justify-center py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 rounded-2xl text-[11px] font-bold shadow-xs active:scale-[0.96] transition-all cursor-pointer"
                >
                  <Icons.AlertWarning className="w-4 h-4 mb-1" />
                  <span>Báo lỗi</span>
                </button>
              </div>
            </div>
          ))}

          {robots.length === 0 && (
            <div className="col-span-3 bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 italic">
              Không có robot nào đang hoạt động trong hệ thống.
            </div>
          )}
        </div>
      </div>

      {/* Modern MoveModal */}
      {showMoveModal && selectedRobot && (
        <MoveModal
          robot={selectedRobot}
          onMove={handleMove}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedRobot(null);
          }}
        />
      )}

      {/* Modern FulfillmentModal */}
      {showFulfillmentModal && (
        <FulfillmentModal
          orders={pendingOrders}
          robots={robots.filter((r) => r.status === 'Idle')}
          onFulfill={handleFulfillOrder}
          onClose={() => {
            setShowFulfillmentModal(false);
            setPendingOrders([]);
          }}
        />
      )}
    </div>
  );
}

interface MoveModalProps {
  robot: Robot;
  onMove: (request: MoveRequest) => Promise<void>;
  onClose: () => void;
}

function MoveModal({ robot, onMove, onClose }: MoveModalProps) {
  const [x, setX] = useState(robot.x.toString());
  const [y, setY] = useState(robot.y.toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMove({
      x: parseFloat(x),
      y: parseFloat(y),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 border border-slate-100 overflow-hidden space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-brand-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
            </svg>
            <span>Di chuyển {robot.name}</span>
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tọa độ X</label>
            <input
              type="number"
              step="0.01"
              value={x}
              onChange={(e) => setX(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 focus:border-brand-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/10 transition-all font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tọa độ Y</label>
            <input
              type="number"
              step="0.01"
              value={y}
              onChange={(e) => setY(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 focus:border-brand-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/10 transition-all font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold cursor-pointer transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold cursor-pointer shadow-md shadow-brand-500/10 transition-all"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FulfillmentModalProps {
  orders: Order[];
  robots: Robot[];
  onFulfill: (orderId: string, robotId: string) => Promise<void>;
  onClose: () => void;
}

function FulfillmentModal({
  orders,
  robots,
  onFulfill,
  onClose,
}: FulfillmentModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedRobotId, setSelectedRobotId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedRobotId) {
      toast.error('Vui lòng điền đầy đủ thông tin phân công');
      return;
    }
    await onFulfill(selectedOrderId, selectedRobotId);
    setSelectedOrderId('');
    setSelectedRobotId('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 border border-slate-100 overflow-hidden space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Icons.CartOrder className="w-5 h-5 text-brand-600" />
            <span>Phân công giao hàng</span>
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <CustomSelect
            label="Chọn đơn hàng chờ"
            value={selectedOrderId}
            onChange={setSelectedOrderId}
            options={orders.map(order => ({ value: order.id, label: `Đơn ${order.id.substring(0, 8)} - ${(order.totalAmount as number).toLocaleString('vi-VN')}đ` }))}
            placeholder="-- Chọn đơn hàng --"
          />

          <CustomSelect
            label="Chọn Robot sẵn sàng"
            value={selectedRobotId}
            onChange={setSelectedRobotId}
            options={robots.map(robot => ({ value: robot.id, label: `${robot.name} (Pin: ${robot.battery.toFixed(0)}%)` }))}
            placeholder="-- Chọn robot rảnh --"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold cursor-pointer transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold cursor-pointer shadow-md shadow-brand-500/10 transition-all"
            >
              Bắt đầu giao
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
