import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Map as MapIcon,
  MapPin,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  FileCode,
  Layers,
  Eye,
} from 'lucide-react';
import {
  robotService,
  type SlamMapResponse,
  type SlamMapWaypointDto,
  type SlamMapStationDto,
} from '@/services/robot';
import { SlamFloorMapViewer, type MapTableNode, type MapRobotItem } from '@/components/map/SlamFloorMapViewer';

interface MapStationManagerProps {
  onClose?: () => void;
  onMapUpdated?: (map: SlamMapResponse) => void;
  tables?: MapTableNode[];
  robots?: MapRobotItem[];
}

export const MapStationManager: React.FC<MapStationManagerProps> = ({
  onClose,
  onMapUpdated,
  tables = [],
  robots = [],
}) => {
  // Navigation internal tabs
  const [activeTab, setActiveTab] = useState<'upload' | 'stations' | 'preview'>('upload');

  // Active Map State
  const [activeMap, setActiveMap] = useState<SlamMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Upload Form State
  const [mapName, setMapName] = useState<string>('Bản đồ Nhà Hàng VORA');
  const [resolution, setResolution] = useState<number>(0.05);
  const [originX, setOriginX] = useState<number>(-20.0);
  const [originY, setOriginY] = useState<number>(-15.0);
  const [selectedMapFile, setSelectedMapFile] = useState<File | null>(null);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [selectedWaypointsFile, setSelectedWaypointsFile] = useState<File | null>(null);
  const [parsedWaypointsFromFile, setParsedWaypointsFromFile] = useState<SlamMapWaypointDto[]>([]);

  // Manual Station Editor State
  const [stationList, setStationList] = useState<SlamMapWaypointDto[]>([]);
  const [newStationName, setNewStationName] = useState<string>('');
  const [newStationType, setNewStationType] = useState<'pickup' | 'dropoff' | 'charging' | 'waiting'>('dropoff');
  const [newStationX, setNewStationX] = useState<number>(0);
  const [newStationY, setNewStationY] = useState<number>(0);

  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const waypointsFileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Fetch current active map from Robot Service / SQLite
  const loadActiveMap = async () => {
    setIsLoading(true);
    try {
      const map = await robotService.getActiveSlamMap();
      if (map) {
        setActiveMap(map);
        setMapName(map.name || 'Bản đồ Nhà Hàng VORA');
        setResolution(map.resolution || 0.05);
        setOriginX(map.originX || -20.0);
        setOriginY(map.originY || -15.0);
        if (map.mapUrl) {
          setMapPreviewUrl(map.mapUrl);
        }

        // Load stations / waypoints
        const waypoints: SlamMapWaypointDto[] = (map.waypoints && map.waypoints.length > 0)
          ? map.waypoints
          : (map.stations || []).map((s: SlamMapStationDto) => ({
              id: s.id,
              name: s.name,
              type: s.stationType || 'dropoff',
              worldX: s.worldX,
              worldY: s.worldY,
            }));
        setStationList(waypoints);
      }
    } catch (err: any) {
      console.warn('Lỗi nạp bản đồ hoạt động:', err);
      showStatus('Không thể tải thông tin bản đồ hiện tại từ máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveMap();
  }, []);

  // Handle Map File Change (image)
  const handleMapFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file format
      const validExts = ['.png', '.jpg', '.jpeg', '.pgm'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExts.includes(fileExt)) {
        showStatus('Định dạng file ảnh không hợp lệ. Vui lòng chọn .png, .jpg, hoặc .pgm.', 'error');
        return;
      }
      setSelectedMapFile(file);
      const url = URL.createObjectURL(file);
      setMapPreviewUrl(url);
      showStatus(`Đã chọn ảnh bản đồ: ${file.name} (${Math.round(file.size / 1024)} KB)`, 'info');
    }
  };

  // Handle Waypoints File Change (JSON)
  const handleWaypointsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        showStatus('File waypoints phải là định dạng JSON (.json).', 'error');
        return;
      }
      setSelectedWaypointsFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          let parsed: SlamMapWaypointDto[] = [];
          if (Array.isArray(raw)) {
            parsed = raw.map((item, idx) => ({
              id: item.id || `WP-${idx + 1}`,
              name: item.name || item.stationName || `Trạm ${idx + 1}`,
              type: item.type || item.stationType || 'dropoff',
              worldX: typeof item.worldX === 'number' ? item.worldX : (typeof item.metricX === 'number' ? item.metricX : (typeof item.x === 'number' ? item.x : 0)),
              worldY: typeof item.worldY === 'number' ? item.worldY : (typeof item.metricY === 'number' ? item.metricY : (typeof item.y === 'number' ? item.y : 0)),
            }));
          } else if (raw.waypoints && Array.isArray(raw.waypoints)) {
            parsed = raw.waypoints;
          } else if (raw.stations && Array.isArray(raw.stations)) {
            parsed = raw.stations.map((s: any) => ({
              id: s.id || `ST-${s.name}`,
              name: s.name,
              type: s.stationType || 'dropoff',
              worldX: s.worldX ?? s.x ?? 0,
              worldY: s.worldY ?? s.y ?? 0,
            }));
          }
          setParsedWaypointsFromFile(parsed);
          showStatus(`Đã đọc ${parsed.length} trạm / waypoints từ file ${file.name}`, 'success');
        } catch {
          showStatus('File JSON không đúng cấu trúc danh sách waypoint.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Execute Upload Map and Waypoints to Backend
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapFile && parsedWaypointsFromFile.length === 0 && stationList.length === 0) {
      showStatus('Vui lòng chọn ít nhất file ảnh bản đồ (.png/.jpg) hoặc file trạm (.json) để tải lên.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (selectedMapFile) {
        formData.append('mapFile', selectedMapFile);
      }
      if (selectedWaypointsFile) {
        formData.append('waypointsFile', selectedWaypointsFile);
      } else if (parsedWaypointsFromFile.length > 0) {
        formData.append('waypointsJson', JSON.stringify(parsedWaypointsFromFile));
      } else if (stationList.length > 0) {
        formData.append('waypointsJson', JSON.stringify(stationList));
      }

      formData.append('mapName', mapName.trim());
      formData.append('resolution', resolution.toString());
      formData.append('originX', originX.toString());
      formData.append('originY', originY.toString());

      const result = await robotService.uploadMap(formData);
      if (result && result.success) {
        showStatus('Tải lên sơ đồ & trạm thành công! Đã lưu CSDL SQLite (m_areas / m_stations) và phát lệnh MQTT cho Robot.', 'success');
        if (result.map) {
          setActiveMap(result.map);
          if (result.map.waypoints) {
            setStationList(result.map.waypoints);
          }
          if (onMapUpdated) {
            onMapUpdated(result.map);
          }
          // Notify map viewers across the application
          window.dispatchEvent(new CustomEvent('vora:slam-map-updated', { detail: result.map }));
        }
      } else {
        showStatus(result?.message || 'Có lỗi xảy ra khi tải lên bản đồ.', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi upload bản đồ:', err);
      showStatus(err.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ để tải bản đồ.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Add a new manual Station to list
  const handleAddStation = () => {
    if (!newStationName.trim()) {
      showStatus('Vui lòng nhập tên trạm.', 'error');
      return;
    }

    const newId = `ST-${Date.now().toString(36).toUpperCase()}`;
    const newWp: SlamMapWaypointDto = {
      id: newId,
      name: newStationName.trim(),
      type: newStationType,
      worldX: newStationX,
      worldY: newStationY,
    };

    setStationList((prev) => [...prev, newWp]);
    setNewStationName('');
    showStatus(`Đã thêm trạm "${newWp.name}" vào danh sách. Nhớ nhấn "Lưu Thay Đổi Trạm" để đồng bộ.`, 'info');
  };

  // Remove a station from list
  const handleRemoveStation = (id: string) => {
    setStationList((prev) => prev.filter((s) => s.id !== id));
    showStatus('Đã xóa trạm khỏi danh sách.', 'info');
  };

  // Save modified station list to backend & SQLite
  const handleSaveStationList = async () => {
    setIsUploading(true);
    try {
      const updatedMap = await robotService.updateWaypoints(stationList);
      showStatus(`Đã lưu ${stationList.length} trạm vào CSDL SQLite (m_stations) và phát lệnh MQTT tới Robot!`, 'success');
      if (updatedMap) {
        setActiveMap(updatedMap);
        window.dispatchEvent(new CustomEvent('vora:slam-map-updated', { detail: updatedMap }));
        if (onMapUpdated) onMapUpdated(updatedMap);
      }
    } catch (err: any) {
      console.error('Lỗi lưu danh sách trạm:', err);
      showStatus('Không thể lưu danh sách trạm lên máy chủ.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Quản Lý Bản Đồ SLAM & Trạm Điều Phối</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                m_areas & m_stations
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tải lên sơ đồ ảnh LiDAR ROS2, quản lý các điểm Waypoint / Station nhận giao đồ ăn và lưu trữ SQLite cục bộ.
            </p>
          </div>
        </div>

        {/* Action / Close buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadActiveMap}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Làm mới thông tin từ SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center px-4 pt-3 border-b border-slate-200 gap-2 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'upload'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Tải Lên Sơ Đồ & File Trạm (.json)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stations')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'stations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Danh Sách Trạm ({stationList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem Trước Trực Quan</span>
        </button>
      </div>

      {/* TAB CONTENT 1: UPLOAD MAP & WAYPOINTS */}
      {activeTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Active Map Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Bản Đồ Hiện Tại</span>
              <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{activeMap?.name || 'Chưa nạp bản đồ'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Độ Phân Giải (Resolution)</span>
              <span className="text-xs font-bold text-blue-700 font-mono block mt-0.5">{activeMap?.resolution || resolution} m/pixel</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Tọa Độ Gốc (Origin)</span>
              <span className="text-xs font-bold text-slate-700 font-mono block mt-0.5">X: {activeMap?.originX || originX}m, Y: {activeMap?.originY || originY}m</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Tổng Số Trạm (SQLite)</span>
              <span className="text-xs font-bold text-emerald-700 font-mono block mt-0.5">{stationList.length} Trạm đã gán</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Map Image File Picker */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. File Ảnh Bản Đồ LiDAR (.png, .jpg, .pgm)</span>
                </span>
                {selectedMapFile && (
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    ✓ Đã chọn {Math.round(selectedMapFile.size / 1024)} KB
                  </span>
                )}
              </label>

              <input
                ref={mapFileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pgm"
                onChange={handleMapFileSelect}
                className="hidden"
              />

              <div
                onClick={() => mapFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  selectedMapFile
                    ? 'border-blue-400 bg-blue-50/30'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
                }`}
              >
                {mapPreviewUrl ? (
                  <div className="space-y-2 w-full flex flex-col items-center">
                    <img
                      src={mapPreviewUrl}
                      alt="Map Preview"
                      className="max-h-32 max-w-full rounded-lg object-contain border border-slate-200 bg-slate-900/5 p-1"
                    />
                    <span className="text-xs font-bold text-slate-700">{selectedMapFile?.name || 'Ảnh bản đồ hiện tại'}</span>
                    <span className="text-[10px] text-blue-600 font-semibold hover:underline">Nhấn để thay đổi ảnh khác</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Kéo thả ảnh bản đồ hoặc bấm để duyệt file</p>
                    <p className="text-[11px] text-slate-400">Hỗ trợ file ROS Cartographer / Gmapping: .png, .jpg, .pgm</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Waypoints JSON File Picker */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. File Điểm Trạm / Waypoints (.json) (Tùy chọn)</span>
                </span>
                {parsedWaypointsFromFile.length > 0 && (
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    ✓ {parsedWaypointsFromFile.length} trạm được tìm thấy
                  </span>
                )}
              </label>

              <input
                ref={waypointsFileInputRef}
                type="file"
                accept=".json"
                onChange={handleWaypointsFileSelect}
                className="hidden"
              />

              <div
                onClick={() => waypointsFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  selectedWaypointsFile
                    ? 'border-indigo-400 bg-indigo-50/30'
                    : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
                }`}
              >
                {selectedWaypointsFile ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">{selectedWaypointsFile.name}</p>
                    <p className="text-[11px] text-indigo-700 font-medium font-mono">
                      {parsedWaypointsFromFile.length} waypoints được nạp tự động
                    </p>
                    <span className="text-[10px] text-indigo-600 font-semibold hover:underline block pt-1">
                      Nhấn để chọn file JSON khác
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Chọn file waypoints (.json) từ robot hoặc Nav2</p>
                    <p className="text-[11px] text-slate-400">Nếu không có, bạn có thể tự thêm trạm thủ công tại tab "Danh Sách Trạm"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SLAM Metadata Config Fields */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Cấu Hình Tọa Độ & Thông Số Bản Đồ (SLAM ROS2 Metrology)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Khu Vực / Tầng:</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="VD: Tầng 1 - Sảnh Nhà Hàng"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Độ phân giải (m/pixel):</label>
                <input
                  type="number"
                  step="0.005"
                  value={resolution}
                  onChange={(e) => setResolution(parseFloat(e.target.value) || 0.05)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tọa độ gốc Origin X (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={originX}
                  onChange={(e) => setOriginX(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tọa độ gốc Origin Y (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={originY}
                  onChange={(e) => setOriginY(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Tự động lưu vào SQLite: m_areas (map) + m_stations (waypoints)</span>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>Đang tải lên & nạp CSDL...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Tải Lên & Lưu Vào CSDL SQLite + Bắn MQTT Robot</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT 2: STATIONS / WAYPOINTS MANAGEMENT */}
      {activeTab === 'stations' && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Quick Add Station Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Thêm Điểm Trạm / Waypoint Mới Vào Sơ Đồ</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Tọa độ tính bằng mét (Metric World Coordinates)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <label className="font-bold text-slate-700 block mb-1">Tên Trạm / Điểm Đích:</label>
                <input
                  type="text"
                  placeholder="VD: Bếp Trung Tâm, Bàn 05, Dock Sạc A..."
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-bold text-slate-700 block mb-1">Loại Trạm (Type):</label>
                <select
                  value={newStationType}
                  onChange={(e) => setNewStationType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                >
                  <option value="pickup">pickup (Trạm Lấy Món / Bếp)</option>
                  <option value="dropoff">dropoff (Trạm Giao Món / Bàn)</option>
                  <option value="charging">charging (Trạm Sạc Pin Docking)</option>
                  <option value="waiting">waiting (Điểm Chờ / Nghỉ)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Tọa độ X (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStationX}
                  onChange={(e) => setNewStationX(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Tọa độ Y (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStationY}
                  onChange={(e) => setNewStationY(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={handleAddStation}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center cursor-pointer shadow-sm transition-all"
                  title="Thêm trạm vào danh sách"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Danh Sách Trạm Trong Sơ Đồ ({stationList.length} Trạm)</span>
              </h3>

              <button
                type="button"
                onClick={handleSaveStationList}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                <span>Lưu Thay Đổi Xuống SQLite (m_stations)</span>
              </button>
            </div>

            {stationList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Chưa có trạm nào trong CSDL quán</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hãy thêm trạm mới bằng biểu mẫu bên trên hoặc tải lên file waypoints (.json) tại tab "Tải Lên".
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold font-mono text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Mã Trạm</th>
                        <th className="py-2.5 px-3">Tên Trạm</th>
                        <th className="py-2.5 px-3">Phân Loại</th>
                        <th className="py-2.5 px-3">Tọa Độ Metric (X, Y)</th>
                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {stationList.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-blue-700">
                            {st.id}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {st.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                                st.type === 'pickup'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : st.type === 'charging'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : st.type === 'waiting'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {st.type === 'pickup' && 'Trạm Bếp (Pickup)'}
                              {st.type === 'charging' && 'Trạm Sạc (Charging)'}
                              {st.type === 'waiting' && 'Điểm Chờ (Waiting)'}
                              {st.type === 'dropoff' && 'Trạm Bàn (Dropoff)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            X: {st.worldX.toFixed(2)}m, Y: {st.worldY.toFixed(2)}m
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveStation(st.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Xóa trạm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: INTERACTIVE VISUAL PREVIEW */}
      {activeTab === 'preview' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Xem Trước Trực Quan Tọa Độ Trạm & Bàn Ăn</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các điểm trạm được đánh dấu trực quan trên bản đồ SLAM cùng vị trí đội xe Robot hiện thời.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                {stationList.length} Điểm Trạm
              </span>
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {tables.length} Bàn Ăn
              </span>
            </div>
          </div>

          <div className="h-[460px] rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner">
            <SlamFloorMapViewer
              tables={tables}
              robots={robots}
              waypoints={stationList}
              mode="technical"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
