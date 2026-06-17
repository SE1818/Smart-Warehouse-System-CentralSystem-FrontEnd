import { useState, useEffect } from 'react';
import { robotService } from '../services/robot';
import type { Robot, MoveRequest, StatusRequest, FulfillmentRequest } from '../types/robot';

export function RobotManagementPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  useEffect(() => {
    loadRobots();
  }, []);

  const loadRobots = async () => {
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
  };

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Quản lý Robot AMR</h1>
          <button
            onClick={loadPendingOrders}
            disabled={actionLoading}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            Xử lý đơn hàng chờ
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Vị trí (X, Y)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {robots.map((robot) => (
                <tr key={robot.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {robot.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {robot.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    ({robot.x.toFixed(2)}, {robot.y.toFixed(2)})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${getBatteryColor(robot.battery)}`}
                          style={{ width: `${robot.battery}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-900">{robot.battery.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedRobot(robot);
                        setShowMoveModal(true);
                      }}
                      className="text-brand-600 hover:text-brand-900 mr-4"
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
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      {robot.status === 'Charging' ? 'Dừng sạc' : 'Bắt đầu sạc'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn cập nhật trạng thái lỗi cho robot này?')) {
                          handleStatusUpdate({ status: 'Error' });
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Đánh dấu lỗi
                    </button>
                  </td>
                </tr>
              ))}
              {robots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Chưa có robot nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  orders: any[];
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
