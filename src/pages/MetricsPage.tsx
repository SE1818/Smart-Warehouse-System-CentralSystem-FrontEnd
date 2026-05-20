import { useState, useEffect } from 'react';
import { metricsService } from '@/services';
import { MetricType } from '@/types';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: string;
  color: string;
}

function MetricCard({ title, value, unit, icon, color }: MetricCardProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
        </div>
        <div className={`text-4xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

const metricConfig: Record<string, { label: string; unit: string; icon: string; color: string; type: MetricType }> = {
  temperature: { label: 'Nhiệt độ', unit: '°C', icon: '🌡️', color: 'text-red-500', type: MetricType.Temperature },
  humidity: { label: 'Độ ẩm', unit: '%', icon: '💧', color: 'text-blue-500', type: MetricType.Humidity },
  pressure: { label: 'Áp suất', unit: 'hPa', icon: '⏲️', color: 'text-purple-500', type: MetricType.Pressure },
  lightLevel: { label: 'Ánh sáng', unit: 'lux', icon: '💡', color: 'text-yellow-500', type: MetricType.LightLevel },
  powerConsumption: { label: 'Tiêu thụ điện', unit: 'kWh', icon: '⚡', color: 'text-green-500', type: MetricType.PowerConsumption },
  inventoryCount: { label: 'Số lượng hàng', unit: 'sp', icon: '📦', color: 'text-orange-500', type: MetricType.InventoryCount },
};

export function MetricsPage() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState('WH001');

  useEffect(() => {
    let active = true;

    const fetchLatestMetrics = async () => {
      const newMetrics: Record<string, number> = {};

      for (const [key, config] of Object.entries(metricConfig)) {
        try {
          const data = await metricsService.getLatestMetric(selectedWarehouse, config.type);
          if (active) {
            newMetrics[key] = data.metricValue;
          }
        } catch (err) {
          console.error(`Error fetching ${key}:`, err);
          if (active) {
            newMetrics[key] = 0;
          }
        }
      }

      if (active) {
        setMetrics(newMetrics);
        setLoading(false);
      }
    };

    fetchLatestMetrics();

    return () => {
      active = false;
    };
  }, [selectedWarehouse]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Giám sát kho</h1>
              <p className="mt-1 text-sm text-gray-500">
                Theo dõi các chỉ số hiệu suất warehouse theo thời gian thực
              </p>
            </div>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setLoading(true);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WH001">WH001 - Kho A</option>
              <option value="WH002">WH002 - Kho B</option>
              <option value="WH003">WH003 - Kho C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(metricConfig).map(([key, config]) => (
              <MetricCard
                key={key}
                title={config.label}
                value={metrics[key]?.toFixed(2) ?? '0'}
                unit={config.unit}
                icon={config.icon}
                color={config.color}
              />
            ))}
          </div>
        )}

        {/* Recent Metrics Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dữ liệu gần đây</h2>
          </div>
          <div className="p-6 text-center text-gray-500">
            Tính năng biểu đồ sẽ được thêm trong phiên bản tiếp theo
          </div>
        </div>
      </div>
    </div>
  );
}