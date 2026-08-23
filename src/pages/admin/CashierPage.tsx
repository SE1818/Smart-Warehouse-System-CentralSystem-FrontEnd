import React, { useState, useEffect } from 'react';

interface OrderItem {
  id: string;
  productId: string;
  variantName?: string;
  skuCode?: string;
  quantity: number;
  price: number;
}

interface TableOrder {
  id: string;
  tableId?: string;
  tableNo: string;
  shippingAddress: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface DiningTable {
  id: string;
  storeId: string;
  tableNo: string;
  tableName: string;
  capacity: number;
  status: string;
  stationId?: string;
  currentOrder?: TableOrder;
}

export const CashierPage: React.FC = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);

  // Settlement states
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'PAYOS' | 'Card'>('Cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Transfer Order states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [targetTransferTableId, setTargetTransferTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('Khách yêu cầu chuyển bàn');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const storeId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetchRealTablesAndOrders();
  }, []);

  const fetchRealTablesAndOrders = async () => {
    setLoading(true);
    try {
      // 1. Fetch real dining tables from OrderingPayment DB
      const tablesRes = await fetch(`/api/v1/tables?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const tableData = tablesRes.ok ? await tablesRes.json() : [];

      // 2. Fetch real active orders from OrderingPayment DB
      const ordersRes = await fetch(`/api/v1/orders/search?status=Pending&pageSize=100`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const ordersData = ordersRes.ok ? await ordersRes.json() : { items: [] };
      const activeOrders: TableOrder[] = Array.isArray(ordersData) ? ordersData : ordersData.items || [];

      // 3. Map orders to their respective tables in real time
      const mappedTables: DiningTable[] = tableData.map((t: any) => {
        const orderForTable = activeOrders.find(
          o => o.tableNo === t.tableNo || o.tableId === t.id
        );

        return {
          id: t.id,
          storeId: t.storeId,
          tableNo: t.tableNo,
          tableName: t.tableName || `Bàn ${t.tableNo}`,
          capacity: t.capacity || 4,
          status: orderForTable ? 'Occupied' : (t.status || 'Available'),
          stationId: t.stationId,
          currentOrder: orderForTable
        };
      });

      setTables(mappedTables);
      
      // Update selectedTable reference if open
      if (selectedTable) {
        const updatedSelected = mappedTables.find(t => t.id === selectedTable.id);
        setSelectedTable(updatedSelected || null);
      }
    } catch (err) {
      console.error('Failed to load cashier data from backend', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = () => {
    if (!selectedTable?.currentOrder) return 0;
    const given = parseFloat(cashGiven) || 0;
    return Math.max(0, given - selectedTable.currentOrder.totalAmount);
  };

  const handleSettleOrder = async () => {
    if (!selectedTable?.currentOrder) return;
    setIsProcessing(true);

    try {
      // Real API Call: Update order status to Completed in OrderingPayment microservice
      const res = await fetch(`/api/v1/orders/${selectedTable.currentOrder.id}/status?status=Completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        alert(`✅ Thanh toán thành công cho ${selectedTable.tableNo}! Hóa đơn đã đóng trên hệ thống.`);
        fetchRealTablesAndOrders();
        setSelectedTable(null);
        setCashGiven('');
      } else {
        alert('Lỗi cập nhật thanh toán trên máy chủ.');
      }
    } catch (err) {
      console.error('Error settling order', err);
      alert('Có lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable?.currentOrder || !targetTransferTableId) {
      alert('Vui lòng chọn bàn đích để chuyển đơn.');
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch(`/api/v1/tables/${targetTransferTableId}/transfer-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: selectedTable.currentOrder.id,
          reason: transferReason
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`✅ Đã chuyển đơn ${selectedTable.currentOrder.id.substring(0, 8)} sang bàn ${result.newTableNo}! Robot AMR sẽ tự động đổi lộ trình nếu đang giao hàng.`);
        setIsTransferModalOpen(false);
        setTargetTransferTableId('');
        setSelectedTable(null);
        await fetchRealTablesAndOrders();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi khi chuyển bàn.');
      }
    } catch (err) {
      console.error('Error transferring order to new table', err);
      alert('Có lỗi kết nối máy chủ.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Cashier Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-xl border border-indigo-500/30">
            💵
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight">Màn Hình Thu Ngân POS & AMR Dispatch</h1>
            <p className="text-xs text-slate-400">Quản lý hóa đơn bàn ăn, chuyển bàn và điều phối robot giao hàng tự động.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchRealTablesAndOrders}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-sm font-semibold transition"
          >
            ↻ Làm Mới Sơ Đồ
          </button>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Ca làm việc</span>
            <span className="text-sm font-bold text-emerald-400">Quầy Thu Ngân #01</span>
          </div>
        </div>
      </header>

      {/* Main Cashier Workspace */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Left Section: Table Layout Grid */}
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="flex gap-2">
              <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
                Tổng bàn: {tables.length}
              </span>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30">
                Có khách / Chờ tính tiền: {tables.filter(t => t.status === 'Occupied').length}
              </span>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                Bàn trống: {tables.filter(t => t.status === 'Available').length}
              </span>
            </div>
            <p className="text-xs text-slate-400 italic">Bấm vào bàn đang có khách để mở hóa đơn hoặc chuyển bàn</p>
          </div>

          {/* Table Cards */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-36 bg-slate-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Chưa có sơ đồ bàn ăn. Vui lòng vào mục <span className="text-indigo-400 font-semibold">"Sơ đồ Bàn & Mã QR"</span> để tạo bàn mới.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-1">
              {tables.map(table => {
                const isOccupied = table.status === 'Occupied';
                const isSelected = selectedTable?.id === table.id;
                return (
                  <div
                    key={table.id}
                    onClick={() => isOccupied && setSelectedTable(table)}
                    className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                      isOccupied ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                    } ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : isOccupied
                        ? 'bg-slate-900 border-amber-500/40 hover:border-amber-500'
                        : 'bg-slate-900/50 border-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-black text-xl text-white">{table.tableNo}</span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            isOccupied
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isOccupied ? 'Đang Phục Vụ' : 'Trống'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{table.tableName}</p>
                    </div>

                    {isOccupied && table.currentOrder ? (
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Trạng thái:</span>
                          <span className="font-bold text-indigo-400">{table.currentOrder.status}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Tổng tiền:</span>
                          <span className="font-extrabold text-emerald-400">
                            {table.currentOrder.totalAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-1">
                        👥 {table.capacity} chỗ ngồi
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Bill Details & Payment / Transfer Actions */}
        <div className="w-96 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col p-5">
          {selectedTable?.currentOrder ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="font-extrabold text-lg text-white">Hóa Đơn {selectedTable.tableNo}</h2>
                    <p className="text-xs text-slate-400">Mã đơn: {selectedTable.currentOrder.id.substring(0, 8)}</p>
                  </div>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="flex items-center gap-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold transition"
                  >
                    🔄 Chuyển Bàn
                  </button>
                </div>
              </div>

              {/* Order Items List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {selectedTable.currentOrder.items && selectedTable.currentOrder.items.length > 0 ? (
                  selectedTable.currentOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-slate-800/50 p-2.5 rounded-xl">
                      <div>
                        <p className="font-semibold text-white">{item.variantName || item.skuCode || item.productId}</p>
                        <p className="text-xs text-slate-400">{item.price.toLocaleString('vi-VN')} đ x {item.quantity}</p>
                      </div>
                      <span className="font-bold text-slate-200">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Đơn hàng tổng: {selectedTable.currentOrder.totalAmount.toLocaleString('vi-VN')} đ</p>
                )}
              </div>

              {/* Payment Methods & Cash Calculator */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-semibold">Hình Thức Thanh Toán</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === 'Cash'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      💵 Tiền Mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAYOS')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === 'PAYOS'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      📱 VietQR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Card')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === 'Card'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      💳 Quẹt Thẻ
                    </button>
                  </div>
                </div>

                {/* If Cash Method: Show Cash Calculator */}
                {paymentMethod === 'Cash' && (
                  <div className="space-y-2 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Tiền khách đưa:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        className="w-32 bg-slate-900 border border-slate-700 text-right px-3 py-1.5 rounded-xl font-bold text-white text-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-slate-300">Tiền thừa trả khách:</span>
                      <span className="font-extrabold text-amber-400">
                        {calculateChange().toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                )}

                {/* Total & Confirm Button */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-slate-300">Cần thanh toán:</span>
                  <span className="text-emerald-400 text-xl font-black">
                    {selectedTable.currentOrder.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  onClick={handleSettleOrder}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/20"
                >
                  {isProcessing ? 'Đang cập nhật CSDL...' : '🖨️ Xác Nhận Thanh Toán & Đóng Hóa Đơn'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
                🧾
              </div>
              <h3 className="font-bold text-slate-300">Chưa Chọn Bàn</h3>
              <p className="text-xs text-slate-500">Bấm vào bất kỳ bàn ăn nào đang có đơn hàng bên trái để xem chi tiết, chuyển bàn hoặc thanh toán.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Order Modal */}
      {isTransferModalOpen && selectedTable?.currentOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-1">🔄 Chuyển Bàn Phục Vụ</h2>
            <p className="text-xs text-slate-400 mb-4">
              Chuyển đơn từ <span className="text-amber-400 font-bold">{selectedTable.tableNo}</span> sang bàn khác.
            </p>

            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 mb-4 text-xs text-indigo-300">
              💡 <strong>Cơ chế tự động điều hướng Robot AMR:</strong> Nếu robot đang vận chuyển đơn hàng này, hệ thống sẽ tự động cập nhật trạm đích tới tọa độ bàn mới.
            </div>

            <form onSubmit={handleTransferOrder} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Chọn Bàn Đích</label>
                <select
                  required
                  value={targetTransferTableId}
                  onChange={(e) => setTargetTransferTableId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="">-- Chọn bàn chuyển đến --</option>
                  {tables.filter(t => t.id !== selectedTable.id).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tableNo} - {t.tableName} ({t.status === 'Available' ? 'Bàn trống' : 'Có khách'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Lý Do Chuyển Bàn</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="Khách muốn đổi chỗ ngồi..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="flex-1 bg-amber-600 text-white font-bold py-2.5 rounded-xl hover:bg-amber-500 disabled:opacity-50"
                >
                  {isTransferring ? 'Đang chuyển...' : 'Xác Nhận Chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
