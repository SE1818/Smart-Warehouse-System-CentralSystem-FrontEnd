import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Navigation,
  Eye,
  EyeOff,
  Crosshair,
  RefreshCw,
} from 'lucide-react';
import {
  rosToCanvasPixel,
  canvasPixelToRos,
  DEFAULT_SLAM_METADATA,
  type SlamMapMetadata,
  type WorldPoint,
} from '@/utils/rosCoordinates';
import { robotService, type SlamMapResponse, type SlamMapStationDto } from '@/services/robot';

export interface MapTableNode {
  id: string;
  name: string;
  zone: string;
  status: 'occupied' | 'serving' | 'empty' | 'waiting';
  guestsCount?: number;
  currentOrders?: string[];
  assignedRobot?: string | null;
  worldX?: number; // Tọa độ thực mét từ ROS / CSDL
  worldY?: number;
}

export interface MapRobotItem {
  id: string;
  code: string;
  name: string;
  status: 'idle' | 'delivering' | 'charging' | 'offline';
  battery: number;
  currentZone: string;
  worldX?: number; // Tọa độ thực mét từ ROS / Telemetry
  worldY?: number;
  yaw?: number;
  targetTable?: string;
}

interface SlamFloorMapViewerProps {
  tables: MapTableNode[];
  selectedTableId?: string;
  onSelectTable?: (tableId: string) => void;
  robots: MapRobotItem[];
  metadata?: SlamMapMetadata;
  mapImageUrl?: string;
  className?: string;
  kitchenLocation?: WorldPoint;
}

export const SlamFloorMapViewer: React.FC<SlamFloorMapViewerProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  robots,
  metadata = DEFAULT_SLAM_METADATA,
  mapImageUrl = '',
  className = '',
  kitchenLocation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active SLAM map fetched from Robot Service API
  const [activeSlamMap, setActiveSlamMap] = useState<SlamMapResponse | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(false);

  // Layer toggles
  const [showRawSlam, setShowRawSlam] = useState<boolean>(true);
  const [showCoordinateOverlay, setShowCoordinateOverlay] = useState<boolean>(true);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover state
  const [hoveredCoord, setHoveredCoord] = useState<{
    pixelX: number;
    pixelY: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [hoveredTable, setHoveredTable] = useState<MapTableNode | null>(null);

  // Map Image state
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // 1. Fetch real active SLAM map from Backend Robot Service API
  const fetchActiveMap = useCallback(async () => {
    setIsLoadingMap(true);
    try {
      const data = await robotService.getActiveSlamMap();
      if (data) {
        setActiveSlamMap(data);
      }
    } catch (err) {
      console.warn('Không thể tải metadata SLAM Map từ RobotService:', err);
    } finally {
      setIsLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    void fetchActiveMap();
  }, [fetchActiveMap]);

  // Dynamic Metadata derived from real Robot Service response or passed prop
  const effectiveMetadata: SlamMapMetadata = useMemo(() => {
    if (activeSlamMap) {
      return {
        resolution: activeSlamMap.resolution > 0 ? activeSlamMap.resolution : metadata.resolution,
        originX: activeSlamMap.originX ?? metadata.originX,
        originY: activeSlamMap.originY ?? metadata.originY,
        width: activeSlamMap.width > 0 ? activeSlamMap.width : metadata.width,
        height: activeSlamMap.height > 0 ? activeSlamMap.height : metadata.height,
      };
    }
    return metadata;
  }, [activeSlamMap, metadata]);

  const effectiveMapUrl = activeSlamMap?.mapUrl || mapImageUrl;

  // 2. Load actual SLAM image (.png / .webp)
  useEffect(() => {
    if (!effectiveMapUrl) return;
    const img = new Image();
    img.src = effectiveMapUrl;
    img.onload = () => {
      setMapImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setMapImage(null);
    };
  }, [effectiveMapUrl]);

  // 3. REAL TABLES: chỉ lấy bàn có tọa độ thực từ API / CSDL
  const resolvedTables = useMemo(() => {
    const validTables = tables.filter((t) => typeof t.worldX === 'number' && typeof t.worldY === 'number');
    if (activeSlamMap?.tables && activeSlamMap.tables.length > 0) {
      const existingIds = new Set(validTables.map((t) => t.id));
      const backendTables: MapTableNode[] = activeSlamMap.tables
        .filter((st) => !existingIds.has(st.id) && !existingIds.has(st.tableNo))
        .map((st) => ({
          id: st.id || st.tableNo,
          name: st.name || `Bàn ${st.tableNo}`,
          zone: st.zone || 'Khu Trong Nhà',
          status: 'empty',
          worldX: st.worldX,
          worldY: st.worldY,
        }));
      return [...validTables, ...backendTables];
    }
    return validTables;
  }, [tables, activeSlamMap]);

  // 4. REAL STATIONS (Lấy trực tiếp từ PostgreSQL qua activeSlamMap.stations)
  const resolvedStations: SlamMapStationDto[] = useMemo(() => {
    return activeSlamMap?.stations || [];
  }, [activeSlamMap]);

  // 5. REAL ROBOTS: chỉ render robot có tọa độ thực từ Telemetry
  const resolvedRobots = useMemo(() => {
    return robots.filter((r) => typeof r.worldX === 'number' && typeof r.worldY === 'number');
  }, [robots]);

  // Handle Zoom
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.25, 3.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.25, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const rawPx = (clientX - pan.x) / zoom;
    const rawPy = (clientY - pan.y) / zoom;

    const world = canvasPixelToRos(rawPx, rawPy, effectiveMetadata);

    setHoveredCoord({
      pixelX: Math.round(rawPx),
      pixelY: Math.round(rawPy),
      worldX: world.x,
      worldY: world.y,
    });

    let foundTable: MapTableNode | null = null;
    const hitRadiusPixel = 22;

    for (const table of resolvedTables) {
      if (table.worldX !== undefined && table.worldY !== undefined) {
        const tablePx = rosToCanvasPixel(table.worldX, table.worldY, effectiveMetadata);
        const dist = Math.hypot(rawPx - tablePx.x, rawPy - tablePx.y);
        if (dist <= hitRadiusPixel) {
          foundTable = table;
          break;
        }
      }
    }
    setHoveredTable(foundTable);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const rawPx = (clientX - pan.x) / zoom;
    const rawPy = (clientY - pan.y) / zoom;

    const hitRadiusPixel = 25;
    for (const table of resolvedTables) {
      if (table.worldX !== undefined && table.worldY !== undefined) {
        const tablePx = rosToCanvasPixel(table.worldX, table.worldY, effectiveMetadata);
        const dist = Math.hypot(rawPx - tablePx.x, rawPy - tablePx.y);
        if (dist <= hitRadiusPixel) {
          if (onSelectTable) {
            onSelectTable(table.id);
          }
          break;
        }
      }
    }
  };

  // Main Canvas Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = effectiveMetadata.width;
    const height = effectiveMetadata.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // =========================================================================
    // LAYER 1: SLAM COSTMAP / RAW OCCUPANCY GRID
    // =========================================================================
    if (showRawSlam) {
      if (imageLoaded && mapImage) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(mapImage, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
      } else {
        // Vẽ lưới Descartes kỹ thuật thực địa
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        // Lưới 1m
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 0.5;
        const oneMeterPixels = 1.0 / effectiveMetadata.resolution;
        for (let x = 0; x <= width; x += oneMeterPixels) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += oneMeterPixels) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Trục tọa độ ROS World (0,0)
        const originPx = rosToCanvasPixel(0, 0, effectiveMetadata);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, originPx.y);
        ctx.lineTo(width, originPx.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(originPx.x, 0);
        ctx.lineTo(originPx.x, height);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText('Gốc ROS (0,0)', originPx.x + 6, originPx.y - 6);
      }
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
    }

    // =========================================================================
    // LAYER 2: VECTOR FLOOR PLAN (STATIONS & TABLES THỰC TẾ TỪ CSDL)
    // =========================================================================

    // 2.1 Vẽ các Trạm phục vụ thực tế (Stations từ CSDL)
    resolvedStations.forEach((st) => {
      const stPx = rosToCanvasPixel(st.worldX, st.worldY, effectiveMetadata);
      const isPickup = st.stationType.toLowerCase() === 'pickup' || st.stationType.toLowerCase() === 'kitchen';
      ctx.fillStyle = isPickup ? '#0284c7' : '#eab308';
      ctx.beginPath();
      ctx.roundRect(stPx.x - 30, stPx.y - 20, 60, 40, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.name, stPx.x, stPx.y + 3);
    });

    // 2.2 Nếu có kitchenLocation được truyền vào
    if (kitchenLocation) {
      const kPx = rosToCanvasPixel(kitchenLocation.x, kitchenLocation.y, effectiveMetadata);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(kPx.x - 30, kPx.y - 20, 60, 40, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🍳 BẾP', kPx.x, kPx.y + 3);
    }

    // 2.3 Vẽ Bàn ăn thực tế
    resolvedTables.forEach((table) => {
      if (table.worldX === undefined || table.worldY === undefined) return;
      const px = rosToCanvasPixel(table.worldX, table.worldY, effectiveMetadata);
      const isSelected = table.id === selectedTableId;
      const isHovered = hoveredTable?.id === table.id;

      let fillColor = '#64748b';
      let ringColor = '#94a3b8';

      if (table.status === 'waiting') {
        fillColor = '#f59e0b';
        ringColor = '#fbbf24';
      } else if (table.status === 'serving') {
        fillColor = '#2563eb';
        ringColor = '#60a5fa';
      } else if (table.status === 'occupied') {
        fillColor = '#8b5cf6';
        ringColor = '#c084fc';
      }

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(px.x, px.y, isSelected ? 26 : 22, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(56, 189, 248, 0.2)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2563eb' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px.x, px.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : ringColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const shortName = table.name.replace(/^Bàn\s*/i, '');
      ctx.fillText(shortName, px.x, px.y);
    });

    // =========================================================================
    // LAYER 3: DYNAMIC REALTIME LAYER (ROBOT THỰC TẾ TỪ TELEMETRY)
    // =========================================================================

    resolvedRobots.forEach((robot) => {
      if (robot.worldX === undefined || robot.worldY === undefined) return;
      const robotPx = rosToCanvasPixel(robot.worldX, robot.worldY, effectiveMetadata);
      const isDelivering = robot.status === 'delivering';

      // Laser path tới bàn mục tiêu
      if (isDelivering && showTrajectories) {
        const targetTable = resolvedTables.find(
          (t) => t.assignedRobot === robot.code || (robot.currentZone && robot.currentZone.includes(t.name))
        );

        if (targetTable?.worldX !== undefined && targetTable?.worldY !== undefined) {
          const targetPx = rosToCanvasPixel(targetTable.worldX, targetTable.worldY, effectiveMetadata);
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.moveTo(robotPx.x, robotPx.y);
          ctx.lineTo(targetPx.x, targetPx.y);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Robot Marker xoay theo Yaw
      ctx.save();
      ctx.translate(robotPx.x, robotPx.y);
      const yawAngle = robot.yaw !== undefined ? -robot.yaw : 0;
      ctx.rotate(yawAngle);

      ctx.fillStyle = isDelivering ? '#16a34a' : '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 24, 5);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(4, -5);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(robot.code, robotPx.x, robotPx.y - 16);
    });

    ctx.restore();
  }, [
    effectiveMetadata,
    pan,
    zoom,
    showRawSlam,
    imageLoaded,
    mapImage,
    kitchenLocation,
    resolvedStations,
    resolvedTables,
    resolvedRobots,
    selectedTableId,
    hoveredTable,
    showTrajectories,
  ]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden select-none shadow-xl ${className}`}
    >
      {/* Top Header / Map Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-slate-200 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                {activeSlamMap?.name || 'BẢN ĐỒ SLAM MẶT BẰNG (ROS 2)'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {effectiveMetadata.resolution}m/px
              </span>
            </div>
            <p className="text-[11px] text-slate-450 font-medium">
              Dữ liệu thực tế từ Robot Service & MQTT • Nhấp chuột vào bàn để chọn lệnh
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Refresh Map button */}
          <button
            type="button"
            onClick={fetchActiveMap}
            disabled={isLoadingMap}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Đồng bộ lại bản đồ từ Robot Service"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMap ? 'animate-spin' : ''}`} />
          </button>

          {/* Toggle Raw SLAM Layer */}
          <button
            type="button"
            onClick={() => setShowRawSlam((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              showRawSlam
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Bật/Tắt Lớp 1: SLAM Costmap gốc (Lidar)"
          >
            {showRawSlam ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Lớp 1 (SLAM)</span>
          </button>

          {/* Toggle Laser Trajectories */}
          <button
            type="button"
            onClick={() => setShowTrajectories((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              showTrajectories
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Bật/Tắt Lớp 3: Đường chạy Laser của AMR"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đường Đi</span>
          </button>

          {/* Toggle Coordinate HUD */}
          <button
            type="button"
            onClick={() => setShowCoordinateOverlay((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              showCoordinateOverlay
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Bật/Tắt HUD Tọa độ ROS 2"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tọa Độ</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Zoom Controls */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Căn giữa bản đồ"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing min-h-[460px]">
        <canvas
          ref={canvasRef}
          width={effectiveMetadata.width}
          height={effectiveMetadata.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          className="border border-slate-800/80 rounded-xl shadow-2xl transition-transform"
        />

        {/* Hover Table Tooltip Overlay */}
        {hoveredTable && (
          <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-md border border-slate-750 text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 pointer-events-none z-20">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold text-sm text-blue-400">{hoveredTable.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  hoveredTable.status === 'waiting'
                    ? 'bg-amber-500/20 text-amber-400'
                    : hoveredTable.status === 'serving'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {hoveredTable.status.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Tọa độ thực: X = {hoveredTable.worldX?.toFixed(2)}m | Y = {hoveredTable.worldY?.toFixed(2)}m
            </div>
            {hoveredTable.assignedRobot && (
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>🤖 Robot đảm nhiệm: {hoveredTable.assignedRobot}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
              👉 Nhấp chuột để chọn bàn này cho khay xuất món KDS
            </p>
          </div>
        )}

        {/* Realtime Coordinate Crosshair Display (Bottom Left) */}
        {showCoordinateOverlay && hoveredCoord && (
          <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-3 z-20">
            <span className="flex items-center gap-1 text-blue-400">
              <Crosshair className="w-3 h-3" />
              <span>
                ROS: ({hoveredCoord.worldX.toFixed(2)}m, {hoveredCoord.worldY.toFixed(2)}m)
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Pixel: ({hoveredCoord.pixelX}, {hoveredCoord.pixelY})
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">Zoom: {Math.round(zoom * 100)}%</span>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-300">Chú thích sơ đồ:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> Bàn chờ món
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang phục vụ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Bàn trống
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Robot AMR
          </span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          Trục Y: Nghịch đảo Canvas • Gốc: ({effectiveMetadata.originX}m, {effectiveMetadata.originY}m) • Trạm thực tế: {resolvedStations.length}
        </div>
      </div>
    </div>
  );
};

export default SlamFloorMapViewer;
