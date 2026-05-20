export interface WarehouseMetric {
  id: string;
  warehouseId: string;
  metricType: MetricType;
  metricValue: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const MetricType = {
  Temperature: 'temperature',
  Humidity: 'humidity',
  Pressure: 'pressure',
  LightLevel: 'lightLevel',
  MotionDetected: 'motionDetected',
  PowerConsumption: 'powerConsumption',
  InventoryCount: 'inventoryCount',
} as const;

export type MetricType = (typeof MetricType)[keyof typeof MetricType];

export interface WarehouseMetricFilters {
  warehouseId?: string;
  metricType?: MetricType;
  startDate?: string;
  endDate?: string;
}

export interface MetricChartData {
  timestamp: string;
  value: number;
}