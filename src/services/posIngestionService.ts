export interface PosOrderPacket {
  posType: 'IPOS' | 'CUKCUK' | 'KIOTVIET' | 'RAW_WEBHOOK';
  orderId: string;
  tableNumber: string;
  items: Array<{ name: string; quantity: number; station: string }>;
  totalAmount: number;
  status: 'READY_FOR_DELIVERY' | 'ORDER_CREATED' | 'PAID';
  timestamp: string;
  rawPayload?: string;
}

export const posIngestionService = {
  /**
   * Tạo gói tin đơn hàng giả lập từ máy POS thực tế (iPOS, CukCuk, KiotViet)
   * phục vụ kỹ thuật viên kiểm thử luồng bắt package tại quán
   */
  createSamplePosPacket: (posType: PosOrderPacket['posType'] = 'IPOS'): PosOrderPacket => {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const tables = ['Bàn 04', 'Bàn 08', 'Bàn 12', 'Bàn 16', 'Bàn 20', 'Phòng VIP 1'];
    const selectedTable = tables[Math.floor(Math.random() * tables.length)];

    const sampleDishes = [
      { name: 'Lẩu Nấm Bò Wagyu', quantity: 1, station: 'Bếp Nóng' },
      { name: 'Bò Tơ Cuộn Nấm Kim Châm', quantity: 2, station: 'Bếp Nóng' },
      { name: 'Khay Hải Sản Tươi Sống', quantity: 1, station: 'Bếp Lạnh' },
      { name: 'Trà Đào Cam Sả Đặc Biệt', quantity: 3, station: 'Quầy Bar' },
    ];

    const chosenDishes = sampleDishes.slice(0, Math.floor(1 + Math.random() * 3));
    const totalAmount = chosenDishes.reduce((acc, d) => acc + d.quantity * 165000, 0);

    const packet: PosOrderPacket = {
      posType,
      orderId: `ORD-${orderNum}`,
      tableNumber: selectedTable,
      items: chosenDishes,
      totalAmount,
      status: 'READY_FOR_DELIVERY',
      timestamp: new Date().toLocaleTimeString('vi-VN'),
    };

    packet.rawPayload = JSON.stringify(
      {
        header: {
          machineId: `POS-${posType}-LOCAL-01`,
          protocol: 'TCP_JSON_STREAM_V2',
          event: 'KITCHEN_ORDER_FULFILLED',
          port: 9100,
        },
        order: {
          id: packet.orderId,
          table: packet.tableNumber,
          items: packet.items,
          amount: packet.totalAmount,
          kitchenReadyTime: new Date().toISOString(),
          requiresAMRDispatch: true,
        },
      },
      null,
      2
    );

    return packet;
  },
};
export default posIngestionService;
