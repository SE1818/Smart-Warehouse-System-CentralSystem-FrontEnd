/**
 * VORA Universal POS Integration Layer (Adapter Pattern)
 * Solves Heterogeneous System Integration across diverse restaurant POS systems:
 * - Built-in Adapters (iPOS, MISA CukCuk, KiotViet, Toast/Square)
 * - Dynamic JSON Mapper (JSONPath / key extraction for custom POS)
 * - VORA Open Inbound API & Webhook Gateway
 * 
 * NOTE: As per architectural best practice, delivery status and errors are kept 
 * strictly internal to VORA (KDS, Edge Box, AMR Tablet, Store Dashboard) 
 * without sending noisy status callbacks back to POS registers.
 */

export interface CanonicalAmrTask {
  taskId: string;
  posOrderId: string;
  sourceSystem: 'IPOS' | 'CUKCUK' | 'KIOTVIET' | 'TOAST_SQUARE' | 'CUSTOM_MAPPER' | 'OPEN_API';
  targetTable: string;
  targetStationId?: string;
  action: 'DISPATCH_NEW' | 'CANCEL' | 'CHANGE_TABLE';
  items: Array<{
    name: string;
    quantity: number;
    station?: string;
    trayIndex?: number;
  }>;
  totalAmount: number;
  priority: 'NORMAL' | 'HIGH';
  receivedAt: string;
  rawPayload?: string;
}

export interface DynamicMapperConfig {
  orderIdPath: string; // e.g. "order.id" or "id"
  tableNumberPath: string; // e.g. "order.table" or "data.table_num"
  itemsArrayPath: string; // e.g. "order.items" or "dishes"
  itemNameField: string; // e.g. "name" or "item_name"
  itemQtyField: string; // e.g. "quantity" or "qty"
  totalAmountPath?: string; // e.g. "order.amount" or "total"
  statusConditionField?: string; // e.g. "event" or "status"
  statusExpectedValue?: string; // e.g. "READY" or "KITCHEN_DONE"
}

export type PosSystemType = 'IPOS' | 'CUKCUK' | 'KIOTVIET' | 'TOAST_SQUARE' | 'CUSTOM_MAPPER' | 'OPEN_API';

// Helper to extract nested properties via dot notation (e.g., "order.table.number")
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export const posIngestionService = {
  /**
   * Adapter 1: iPOS F&B Adapter
   * Ingests native iPOS kitchen fulfillment event
   */
  adaptIposPacket: (raw: any): CanonicalAmrTask => {
    const order = raw.order || raw;
    const orderId = String(order.id || order.orderId || `ORD-${Date.now().toString().slice(-4)}`);
    const tableNumber = String(order.table || order.tableName || 'Bàn 01');
    const items = Array.isArray(order.items)
      ? order.items.map((i: any) => ({
          name: String(i.name || i.dishName || 'Món ăn'),
          quantity: Number(i.quantity || i.qty || 1),
          station: i.station || 'Bếp Nóng',
        }))
      : [];
    const totalAmount = Number(order.amount || order.totalAmount || 0);

    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: orderId,
      sourceSystem: 'IPOS',
      targetTable: tableNumber,
      action: 'DISPATCH_NEW',
      items,
      totalAmount,
      priority: 'NORMAL',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Adapter 2: MISA CukCuk Adapter
   * Ingests CukCuk webhook format (KitchenFinishedEvent)
   */
  adaptCukCukPacket: (raw: any): CanonicalAmrTask => {
    const data = raw.data || raw;
    const orderId = String(data.RefNo || data.order_no || `CUK-${Date.now().toString().slice(-4)}`);
    const tableNumber = String(data.TableName || data.table_name || 'Bàn 02');
    const items = Array.isArray(data.OrderDetails || data.items)
      ? (data.OrderDetails || data.items).map((i: any) => ({
          name: String(i.InventoryItemName || i.name || 'Món CukCuk'),
          quantity: Number(i.Quantity || i.qty || 1),
          station: i.KitchenName || 'Bếp Chính',
        }))
      : [];
    const totalAmount = Number(data.TotalAmount || data.amount || 0);

    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: orderId,
      sourceSystem: 'CUKCUK',
      targetTable: tableNumber,
      action: 'DISPATCH_NEW',
      items,
      totalAmount,
      priority: 'NORMAL',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Adapter 3: KiotViet F&B Adapter
   * Ingests KiotViet webhook order notification
   */
  adaptKiotVietPacket: (raw: any): CanonicalAmrTask => {
    const invoice = raw.data || raw;
    const orderId = String(invoice.code || invoice.orderId || `KV-${Date.now().toString().slice(-4)}`);
    const tableNumber = String(invoice.table || invoice.tableName || 'Bàn 05');
    const items = Array.isArray(invoice.invoiceDetails || invoice.orderDetails || invoice.items)
      ? (invoice.invoiceDetails || invoice.orderDetails || invoice.items).map((i: any) => ({
          name: String(i.productName || i.name || 'Món KiotViet'),
          quantity: Number(i.quantity || 1),
          station: 'Quầy Bếp',
        }))
      : [];
    const totalAmount = Number(invoice.total || invoice.totalPayment || 0);

    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: orderId,
      sourceSystem: 'KIOTVIET',
      targetTable: tableNumber,
      action: 'DISPATCH_NEW',
      items,
      totalAmount,
      priority: 'NORMAL',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Adapter 4: Toast / Square Global POS Adapter
   */
  adaptToastSquarePacket: (raw: any): CanonicalAmrTask => {
    const payload = raw.order || raw;
    const orderId = String(payload.order_id || payload.id || `TOAST-${Date.now().toString().slice(-4)}`);
    const tableNumber = String(payload.dining_option?.table_name || payload.table_name || 'Bàn VIP');
    const items = Array.isArray(payload.line_items || payload.items)
      ? (payload.line_items || payload.items).map((i: any) => ({
          name: String(i.name || i.item_name || 'Dish'),
          quantity: Number(i.quantity || 1),
          station: 'Kitchen',
        }))
      : [];
    const totalAmount = Number(payload.pricing?.total_money?.amount || payload.total_money || 0);

    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: orderId,
      sourceSystem: 'TOAST_SQUARE',
      targetTable: tableNumber,
      action: 'DISPATCH_NEW',
      items,
      totalAmount,
      priority: 'HIGH',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Adapter 5: Dynamic JSON Mapper Adapter
   * Translates arbitrary / custom JSON based on user-configured JSON paths
   */
  adaptCustomJsonPacket: (raw: any, config: DynamicMapperConfig): CanonicalAmrTask => {
    const orderId = String(getNestedValue(raw, config.orderIdPath) || `CUSTOM-${Date.now().toString().slice(-4)}`);
    const tableNumber = String(getNestedValue(raw, config.tableNumberPath) || 'Bàn 01');

    const rawItems = getNestedValue(raw, config.itemsArrayPath);
    const items: Array<{ name: string; quantity: number; station: string }> = [];

    if (Array.isArray(rawItems)) {
      rawItems.forEach((it) => {
        items.push({
          name: String(getNestedValue(it, config.itemNameField) || 'Món Tùy Chỉnh'),
          quantity: Number(getNestedValue(it, config.itemQtyField) || 1),
          station: 'Khu Bếp',
        });
      });
    }

    const totalAmount = config.totalAmountPath ? Number(getNestedValue(raw, config.totalAmountPath) || 0) : 0;

    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: orderId,
      sourceSystem: 'CUSTOM_MAPPER',
      targetTable: tableNumber,
      action: 'DISPATCH_NEW',
      items,
      totalAmount,
      priority: 'NORMAL',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Adapter 6: VORA Open Inbound API
   * Direct standard JSON ingestion without mapping
   */
  adaptOpenApiPacket: (raw: any): CanonicalAmrTask => {
    return {
      taskId: `TSK-VORA-${Math.floor(1000 + Math.random() * 9000)}`,
      posOrderId: String(raw.orderId || `OPEN-${Date.now().toString().slice(-4)}`),
      sourceSystem: 'OPEN_API',
      targetTable: String(raw.tableNumber || 'Bàn 01'),
      targetStationId: raw.stationId,
      action: raw.action || 'DISPATCH_NEW',
      items: Array.isArray(raw.items) ? raw.items : [],
      totalAmount: Number(raw.totalAmount || 0),
      priority: raw.priority || 'NORMAL',
      receivedAt: new Date().toLocaleTimeString('vi-VN'),
      rawPayload: JSON.stringify(raw, null, 2),
    };
  },

  /**
   * Generates a sample payload matching the selected POS system format
   * for on-site live testing by technicians.
   */
  generateSamplePacketForTesting: (
    posType: PosSystemType,
    customConfig?: DynamicMapperConfig
  ): { rawJson: any; canonical: CanonicalAmrTask } => {
    const randomOrder = Math.floor(1000 + Math.random() * 9000);
    const tables = ['Bàn A-02', 'Bàn B-04', 'Bàn C-08', 'Phòng VIP 1'];
    const chosenTable = tables[Math.floor(Math.random() * tables.length)];

    let rawJson: any;

    switch (posType) {
      case 'IPOS':
        rawJson = {
          header: {
            machineId: 'POS-IPOS-TERMINAL-01',
            event: 'KITCHEN_ORDER_FULFILLED',
            timestamp: new Date().toISOString(),
          },
          order: {
            id: `IPOS-${randomOrder}`,
            table: chosenTable,
            amount: 480000,
            items: [
              { name: 'Lẩu Bò Wagyu Cao Cấp', quantity: 1, station: 'Bếp Lẩu' },
              { name: 'Nước Ngọt Coca Cola', quantity: 2, station: 'Quầy Bar' },
            ],
          },
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptIposPacket(rawJson),
        };

      case 'CUKCUK':
        rawJson = {
          EventType: 'KitchenFinishedEvent',
          data: {
            RefNo: `CC-${randomOrder}`,
            TableName: chosenTable,
            TotalAmount: 520000,
            OrderDetails: [
              { InventoryItemName: 'Sườn Cừu Nướng Thảo Mộc', Quantity: 2, KitchenName: 'Bếp Nướng' },
              { InventoryItemName: 'Salad Rong Biển Trứng Cua', Quantity: 1, KitchenName: 'Bếp Lạnh' },
            ],
          },
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptCukCukPacket(rawJson),
        };

      case 'KIOTVIET':
        rawJson = {
          action: 'order.update',
          data: {
            code: `KV-${randomOrder}`,
            tableName: chosenTable,
            totalPayment: 390000,
            invoiceDetails: [
              { productName: 'Gà Hấp Lá Chanh Nửa Con', quantity: 1 },
              { productName: 'Xôi Chiên Phồng', quantity: 1 },
            ],
          },
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptKiotVietPacket(rawJson),
        };

      case 'TOAST_SQUARE':
        rawJson = {
          event_type: 'order.fulfilled',
          order: {
            id: `TOAST-${randomOrder}`,
            dining_option: { table_name: chosenTable },
            pricing: { total_money: { amount: 650000 } },
            line_items: [
              { name: 'Tomahawk Steak 500g', quantity: 1 },
              { name: 'Vang Đỏ Chile Chai', quantity: 1 },
            ],
          },
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptToastSquarePacket(rawJson),
        };

      case 'CUSTOM_MAPPER': {
        const cfg = customConfig || {
          orderIdPath: 'data.code',
          tableNumberPath: 'data.pos_table',
          itemsArrayPath: 'data.dish_list',
          itemNameField: 'title',
          itemQtyField: 'count',
          totalAmountPath: 'data.bill_sum',
        };
        rawJson = {
          status: 'SUCCESS',
          data: {
            code: `CUSTOM-${randomOrder}`,
            pos_table: chosenTable,
            bill_sum: 420000,
            dish_list: [
              { title: 'Cá Hồi Nướng Sốt Cam', count: 1 },
              { title: 'Súp Bí Đỏ Hạnh Nhân', count: 2 },
            ],
          },
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptCustomJsonPacket(rawJson, cfg),
        };
      }

      case 'OPEN_API':
      default:
        rawJson = {
          orderId: `OPEN-${randomOrder}`,
          tableNumber: chosenTable,
          totalAmount: 310000,
          action: 'DISPATCH_NEW',
          priority: 'NORMAL',
          items: [
            { name: 'Cơm Chiên Hải Sản Hoàng Kim', quantity: 1, station: 'Bếp Cơm' },
            { name: 'Canh Chua Cá Bớp', quantity: 1, station: 'Bếp Canh' },
          ],
        };
        return {
          rawJson,
          canonical: posIngestionService.adaptOpenApiPacket(rawJson),
        };
    }
  },

  /**
   * VORA Inbound Open API Specification Documentation
   */
  getOpenApiDocs: () => ({
    title: 'VORA Edge Inbound Dispatch API v1.0',
    description: 'Endpoint RESTful để máy POS bên thứ 3 hoặc POS tự viết của quán phát lệnh điều phối AMR.',
    method: 'POST',
    endpoint: '/api/v1/inbound/order-ready',
    headers: {
      'Content-Type': 'application/json',
      'X-VORA-Store-Token': 'vora_edge_live_sec_key_sample',
    },
    samplePayload: {
      orderId: 'ORD-8899',
      tableNumber: 'Bàn A-04',
      action: 'DISPATCH_NEW',
      priority: 'NORMAL',
      totalAmount: 350000,
      items: [
        { name: 'Lẩu Thái Tomyum', quantity: 1, station: 'Bếp Lẩu' },
        { name: 'Nước Suối Lavie', quantity: 2, station: 'Quầy Bar' },
      ],
    },
    sampleCurl: `curl -X POST "http://192.168.1.120:9100/api/v1/inbound/order-ready" \\
  -H "Content-Type: application/json" \\
  -H "X-VORA-Store-Token: YOUR_STORE_TOKEN" \\
  -d '{"orderId":"ORD-8899","tableNumber":"Bàn A-04","action":"DISPATCH_NEW","items":[{"name":"Lẩu Thái Tomyum","quantity":1}]}'`,
  }),
};

export default posIngestionService;
