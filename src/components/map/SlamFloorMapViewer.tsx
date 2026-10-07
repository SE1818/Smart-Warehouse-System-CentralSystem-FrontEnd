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
} from 'lucide-react';
import {
  rosToCanvasPixel,
  canvasPixelToRos,
  DEFAULT_SLAM_METADATA,
  type SlamMapMetadata,
  type WorldPoint,
} from '@/utils/rosCoordinates';

export interface MapTableNode {
  id: string;
  name: string;
  zone: string;
  status: 'occupied' | 'serving' | 'empty' | 'waiting';
  guestsCount?: number;
  currentOrders?: string[];
  assignedRobot?: string | null;
  // Tọa độ thực tế theo hệ mét của ROS (nếu chưa có trong CSDL sẽ được auto-map theo số bàn)
  worldX?: number;
  worldY?: number;
}

export interface MapRobotItem {
  id: string;
  code: string;
  name: string;
  status: 'idle' | 'delivering' | 'charging' | 'offline';
  battery: number;
  currentZone: string;
  worldX?: number;
  worldY?: number;
  yaw?: number; // Radian (-π đến π)
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
  mapImageUrl = '/maps/main.png',
  className = '',
  kitchenLocation = { x: -16.0, y: -10.0 }, // Vị trí Bếp trung tâm trong ROS (mét)
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // 1. Load SLAM background image (.png / .webp converted from .pgm)
  useEffect(() => {
    const img = new Image();
    img.src = mapImageUrl;
    img.onload = () => {
      setMapImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback: Nếu không tải được file ảnh, canvas sẽ vẽ synthetic occupancy grid
      setImageLoaded(false);
      setMapImage(null);
    };
  }, [mapImageUrl]);

  // 2. Tính toán tọa độ thế giới (mét) cho các bàn nếu chưa có sẵn
  // Quy hoạch layout bàn ăn dạng nhà hàng/kho chuẩn theo tọa độ mét thực tế
  const resolvedTables = useMemo(() => {
    return tables.map((t, idx) => {
      if (t.worldX !== undefined && t.worldY !== undefined) {
        return t;
      }
      // Auto-layout dựa trên index và zone
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      const startX = -12.0; // mét
      const startY = 8.0;   // mét
      const spacingX = 6.0; // cách nhau 6m
      const spacingY = 5.0; // cách nhau 5m
      return {
        ...t,
        worldX: startX + col * spacingX,
        worldY: startY - row * spacingY,
      };
    });
  }, [tables]);

  // 3. Tính toán vị trí robot (nếu robot đang giao hàng thì nội suy vị trí di chuyển)
  const resolvedRobots = useMemo(() => {
    return robots.map((r, idx) => {
      if (r.worldX !== undefined && r.worldY !== undefined) {
        return r;
      }
      // Vị trí mặc định tại trạm sạc hoặc gần bếp
      if (r.status === 'delivering') {
        return {
          ...r,
          worldX: -5.0 + idx * 4.0,
          worldY: 0.0,
          yaw: 0.5,
        };
      }
      return {
        ...r,
        worldX: -14.0 + idx * 3.5,
        worldY: -11.0,
        yaw: 0.0,
      };
    });
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
    if (e.button === 0) { // Chuột trái
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

    // Tọa độ trên Canvas gốc (trước khi pan/zoom)
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Quy đổi ngược về pixel ảnh gốc (unscaled)
    const rawPx = (clientX - pan.x) / zoom;
    const rawPy = (clientY - pan.y) / zoom;

    // Quy đổi ra Tọa độ thế giới ROS (World Meters)
    const world = canvasPixelToRos(rawPx, rawPy, metadata);

    setHoveredCoord({
      pixelX: Math.round(rawPx),
      pixelY: Math.round(rawPy),
      worldX: world.x,
      worldY: world.y,
    });

    // Kiểm tra xem chuột có hover vào bàn ăn nào không
    let foundTable: MapTableNode | null = null;
    const hitRadiusPixel = 22; // bán kính click nhận diện bàn

    for (const table of resolvedTables) {
      if (table.worldX !== undefined && table.worldY !== undefined) {
        const tablePx = rosToCanvasPixel(table.worldX, table.worldY, metadata);
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

  // Click on Canvas to select table
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
        const tablePx = rosToCanvasPixel(table.worldX, table.worldY, metadata);
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

    const width = metadata.width;
    const height = metadata.height;

    // Reset buffer
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Áp dụng Pan & Zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // =========================================================================
    // LAYER 1: SLAM COSTMAP / OCCUPANCY GRID (RAW SLAM BACKGROUND)
    // =========================================================================
    if (showRawSlam) {
      if (imageLoaded && mapImage) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(mapImage, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
      } else {
        // Fallback: Vẽ lưới Lidar Occupancy Grid mô phỏng thực tế
        ctx.fillStyle = '#0f172a'; // Tối màu (background)
        ctx.fillRect(0, 0, width, height);

        // Vách tường biên (Wall boundaries)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, width - 60, height - 60);

        // Các chướng ngại vật cố định (Cột nhà, tường ngăn)
        ctx.fillStyle = '#334155';
        ctx.fillRect(280, 100, 30, 180);
        ctx.fillRect(520, 320, 30, 180);

        // Lưới điểm tọa độ 1 mét một lần
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 0.5;
        const oneMeterPixels = 1.0 / metadata.resolution; // 20px nếu resolution 0.05
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
      }
    } else {
      // Clean Background (Chế độ tối giản, sáng sủa cho nhà hàng)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Viền sàn
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);
    }

    // =========================================================================
    // LAYER 2: VECTOR FLOOR PLAN (BÀN ĂN, BẾP, QUẦY GIAO NHẬN)
    // =========================================================================

    // 2.1 Vẽ Trạm Bếp Trung Tâm (Kitchen Counter)
    const kitchenPx = rosToCanvasPixel(kitchenLocation.x, kitchenLocation.y, metadata);
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(kitchenPx.x - 35, kitchenPx.y - 25, 70, 50, 8);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍳 BẾP', kitchenPx.x, kitchenPx.y);
    ctx.font = '9px sans-serif';
    ctx.fillText('XUẤT MÓN', kitchenPx.x, kitchenPx.y + 13);

    // 2.2 Vẽ Các Bàn Ăn (Tables Vector Plan)
    resolvedTables.forEach((table) => {
      if (table.worldX === undefined || table.worldY === undefined) return;
      const px = rosToCanvasPixel(table.worldX, table.worldY, metadata);
      const isSelected = table.id === selectedTableId;
      const isHovered = hoveredTable?.id === table.id;

      // Màu sắc theo trạng thái
      let fillColor = '#64748b'; // empty
      let ringColor = '#94a3b8';
      let statusText = 'Trống';

      if (table.status === 'waiting') {
        fillColor = '#f59e0b'; // Chờ món (amber)
        ringColor = '#fbbf24';
        statusText = 'Chờ';
      } else if (table.status === 'serving') {
        fillColor = '#2563eb'; // Đang phục vụ (blue)
        ringColor = '#60a5fa';
        statusText = 'Phục vụ';
      } else if (table.status === 'occupied') {
        fillColor = '#8b5cf6'; // Đang dùng bữa
        ringColor = '#c084fc';
        statusText = 'Có khách';
      }

      // Vòng tròn halo nổi bật nếu được chọn hoặc hover
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(px.x, px.y, isSelected ? 28 : 24, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(56, 189, 248, 0.2)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2563eb' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Thân bàn ăn (Rounded Table)
      ctx.beginPath();
      ctx.arc(px.x, px.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : ringColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Số bàn
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const shortName = table.name.replace(/^Bàn\s*/i, '');
      ctx.fillText(shortName, px.x, px.y - 1);

      // Nhãn trạng thái nhỏ phía dưới bàn
      ctx.font = '9px sans-serif';
      ctx.fillStyle = showRawSlam ? '#cbd5e1' : '#475569';
      ctx.fillText(statusText, px.x, px.y + 24);

      // Icon robot được phân bổ nếu có
      if (table.assignedRobot) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px.x + 14, px.y - 14, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // =========================================================================
    // LAYER 3: DYNAMIC REALTIME LAYER (ROBOT MARKERS & DISPATCH PATHS)
    // =========================================================================

    resolvedRobots.forEach((robot) => {
      if (robot.worldX === undefined || robot.worldY === undefined) return;
      const robotPx = rosToCanvasPixel(robot.worldX, robot.worldY, metadata);
      const isDelivering = robot.status === 'delivering';

      // 3.1 Vẽ vệt đường đi (Trajectory path) tới bàn mục tiêu
      if (isDelivering && showTrajectories) {
        // Tìm bàn mục tiêu
        const targetTable = resolvedTables.find(
          (t) => t.assignedRobot === robot.code || (robot.currentZone && robot.currentZone.includes(t.name))
        ) || resolvedTables[0];

        if (targetTable?.worldX !== undefined && targetTable?.worldY !== undefined) {
          const targetPx = rosToCanvasPixel(targetTable.worldX, targetTable.worldY, metadata);

          ctx.beginPath();
          ctx.setLineDash([6, 4]); // Đường nét đứt laser
          ctx.moveTo(robotPx.x, robotPx.y);
          ctx.lineTo(targetPx.x, targetPx.y);
          ctx.strokeStyle = '#22c55e'; // Màu xanh lá neon
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.setLineDash([]); // Reset
        }
      }

      // 3.2 Vẽ Robot Marker có góc xoay θ (Yaw)
      ctx.save();
      ctx.translate(robotPx.x, robotPx.y);

      // Đảo góc quay để khớp với hệ tọa độ Canvas
      const yawAngle = robot.yaw !== undefined ? -robot.yaw : 0;
      ctx.rotate(yawAngle);

      // Thân Robot AMR (Hình vuông bo góc)
      ctx.fillStyle = isDelivering ? '#16a34a' : '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-14, -14, 28, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mũi chỉ hướng di chuyển (Heading arrow)
      ctx.fillStyle = '#facc15'; // Màu vàng nổi bật
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 3.3 Nhãn Robot & Mức pin (Vẽ thẳng góc, không xoay theo robot)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(robot.code, robotPx.x, robotPx.y - 20);

      // Battery Badge
      const battColor = robot.battery > 50 ? '#22c55e' : robot.battery > 20 ? '#eab308' : '#ef4444';
      ctx.fillStyle = battColor;
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`⚡${robot.battery}%`, robotPx.x, robotPx.y + 24);
    });

    ctx.restore();
  }, [
    metadata,
    pan,
    zoom,
    showRawSlam,
    imageLoaded,
    mapImage,
    kitchenLocation,
    resolvedTables,
    resolvedRobots,
    selectedTableId,
    hoveredTable,
    showTrajectories,
  ]);

  // Request Animation Frame Loop
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
                BẢN ĐỒ SLAM MẶT BẰNG (ROS 2)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {metadata.resolution}m/px
              </span>
            </div>
            <p className="text-[11px] text-slate-450 font-medium">
              Quy đổi tọa độ Cartesian sang Canvas • Nhấp chuột vào bàn để chọn lệnh
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Raw SLAM Layer */}
          <button
            type="button"
            onClick={() => setShowRawSlam((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
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
          width={metadata.width}
          height={metadata.height}
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
          Trục Y: Đã nghịch đảo (Inverted Canvas) • Gốc tọa độ ({metadata.originX}m, {metadata.originY}m)
        </div>
      </div>
    </div>
  );
};

export default SlamFloorMapViewer;
