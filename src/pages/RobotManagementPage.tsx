import { useState, useEffect, useCallback } from 'react';
import { robotService } from '../services/robot';
import type { Robot, MoveRequest, StatusRequest, FulfillmentRequest } from '../types/robot';
import { Icons } from '@/components/Icons';
import type { Order } from '../types/product';

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

  const handleMove = async (request: MoveRequest) => {
    if (!selectedRobot) return;

    try {
      setActionLoading(true);
      await robotService.moveRobot(selectedRobot.id, request);
      await loadRobots();
      setShowMoveModal(false);
    } catch (err) {
      setError('Không thể di chuyển robot');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (request: StatusRequest) => {
    if (!selectedRobot) return;

    try {
      setActionLoading(true);
      await robotService.updateRobotStatus(selectedRobot.id, request);
      await loadRobots();
    } catch (err) {
      setError('Không thể cập nhật trạng thái robot');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async (request: FulfillmentRequest) => {
    try {
      setActionLoading(true);
      await robotService.fulfillOrder(request);
      setShowFulfillmentModal(false);
      await loadRobots();
    } catch (err) {
      setError('Không thể xử lý đơn hàng');
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
        alert('Không có đơn hàng nào chờ xử lý');
      }
    } catch (err) {
      setError('Không thể tải danh sách đơn hàng chờ');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Idle: 'bg-emerald-100 text-emerald-800',
      Moving: 'bg-blue-100 text-blue-800',
      Charging: 'bg-yellow-100 text-yellow-800',
      Error: 'bg-red-100 text-red-800',
      Offline: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'bg-green-500';
    if (battery > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Icons.Spinner className="h-10 w-10 text-brand-600" />
        <p className="text-slate-505 text-xs font-semibold">Đang tải danh sách robot...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200/80 pb-6">
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Robot className="w-8 h-8 text-brand-600" />
            <span>Quản lý Robot AMR</span>
          </h1>
          <button
            onClick={loadPendingOrders}
            disabled={actionLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Xử lý đơn hàng chờ</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-4">ID</th>
                  <th className="p-4">Tên</th>
                  <th className="p-4">Vị trí (X, Y)</th>
                  <th className="p-4">Pin</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {robots.map((robot) => (
                  <tr key={robot.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{robot.id}</td>
                    <td className="p-4">{robot.name}</td>
                    <td className="p-4 font-mono text-slate-900">
                      ({robot.x.toFixed(2)}, {robot.y.toFixed(2)})
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-200/60 rounded-full h-2 overflow-hidden border border-slate-300/10">
                          <div
                            className={`h-full ${getBatteryColor(robot.battery)} transition-all duration-300`}
                            style={{ width: `${robot.battery}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-900">{robot.battery.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full border ${getStatusColor(
                          robot.status
                        )}`}
                      >
                        {robot.status === 'Idle'
                          ? 'Rảnh'
                          : robot.status === 'Moving'
                          ? 'Đang di chuyển'
                          : robot.status === 'Charging'
                          ? 'Đang sạc'
                          : robot.status === 'Error'
                          ? 'Lỗi'
                          : 'Offline'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRobot(robot);
                          setShowMoveModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={robot.status === 'Moving' || robot.status === 'Charging'}
                      >
                        Di chuyển
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRobot(robot);
                          if (robot.status === 'Idle') {
                            handleStatusUpdate({ status: 'Charging' });
                          } else if (robot.status === 'Charging') {
                            handleStatusUpdate({ status: 'Idle' });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          robot.status === 'Charging'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-705 border-amber-200/60'
                            : 'bg-blue-50 hover:bg-blue-100/80 text-blue-700 border-blue-200/60'
                        }`}
                      >
                        {robot.status === 'Charging' ? 'Dừng sạc' : 'Bắt đầu sạc'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn cập nhật trạng thái lỗi cho robot này?')) {
                            handleStatusUpdate({ status: 'Error' });
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100/80 text-red-650 text-xs font-bold rounded-lg border border-red-200/40 transition-all cursor-pointer"
                      >
                        Đánh dấu lỗi
                      </button>
                    </td>
                  </tr>
                ))}
                {robots.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Chưa có robot nào hoạt động
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Di chuyển Robot {robot.name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tọa độ X</label>
            <input
              type="number"
              step="0.01"
              value={x}
              onChange={(e) => setX(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tọa độ Y</label>
            <input
              type="number"
              step="0.01"
              value={y}
              onChange={(e) => setY(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Di chuyển
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
  onFulfill: (request: FulfillmentRequest) => Promise<void>;
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
    await onFulfill({
      orderId: selectedOrderId,
      robotId: selectedRobotId,
    });
    setSelectedOrderId('');
    setSelectedRobotId('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">Phân công Robot giao hàng</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chọn đơn hàng</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              <option value="">-- Chọn đơn hàng --</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} - {order.userId} - {(order.totalAmount as number).toLocaleString('vi-VN')}đ
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Robot</label>
            <select
              value={selectedRobotId}
              onChange={(e) => setSelectedRobotId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              <option value="">-- Chọn robot --</option>
              {robots.map((robot) => (
                <option key={robot.id} value={robot.id}>
                  {robot.name} (Pin: {robot.battery.toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Xác nhận giao
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
