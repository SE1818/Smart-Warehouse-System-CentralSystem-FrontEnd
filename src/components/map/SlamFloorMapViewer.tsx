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
  MapPin,
  Bell,
  BellOff,
  Layers,
} from 'lucide-react';
import {
  rosToCanvasPixel,
  canvasPixelToRos,
  DEFAULT_SLAM_METADATA,
  type SlamMapMetadata,
  type WorldPoint,
} from '@/utils/rosCoordinates';
import {
  type SlamMapResponse,
  type SlamMapStationDto,
  type SlamMapWaypointDto,
} from '@/services/robot';
import { sqliteService } from '@/services/sqliteService';
import { normalizeTableCode } from '@/utils/tableMatching';

export interface MapTableNode {
  id: string;
  name: string;
  zone: string;
  status: 'occupied' | 'serving' | 'empty' | 'waiting';
  guestsCount?: number;
  currentOrders?: string[];
  assignedRobot?: string | null;
  assignedCargoLevel?: number | null;
  isArrivedTarget?: boolean;
  worldX?: number; // Tọa độ thực mét từ ROS / CSDL
  worldY?: number;
  stationId?: string | null;
  stationName?: string | null;
}

export interface MapRobotItem {
  id: string;
  code: string;
  name: string;
  status: 'Idle' | 'Delivering' | 'Arrived' | 'SwappingBattery' | 'Offline' | string;
  battery: number;
  currentZone: string;
  worldX?: number; // Tọa độ thực mét từ ROS / Telemetry
  worldY?: number;
  yaw?: number;
  latencyMs?: number;
  targetTable?: string;
  cargoLevel?: number | null;
}

export interface MapArrivalAlert {
  taskId: string;
  robotCode: string;
  tableName: string;
  stationName?: string | null;
  cargoLevel: number;
  orderId?: string | null;
  nextTableName?: string | null;
  chimePlayed?: boolean;
}

export interface SlamFloorMapViewerProps {
  tables: MapTableNode[];
  selectedTableId?: string;
  onSelectTable?: (tableId: string) => void;
  robots: MapRobotItem[];
  selectedRobotId?: string;
  onSelectRobot?: (robotId: string) => void;
  stations?: any[];
  waypoints?: SlamMapWaypointDto[];
  metadata?: SlamMapMetadata;
  mapImageUrl?: string;
  className?: string;
  kitchenLocation?: WorldPoint;
  mode?: 'simplified' | 'technical';
  chimeEnabled?: boolean;
  onToggleChime?: () => void;
  arrivalAlert?: MapArrivalAlert | null;
}

const drawRoundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

export const SlamFloorMapViewer: React.FC<SlamFloorMapViewerProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  robots,
  selectedRobotId,
  onSelectRobot,
  stations,
  waypoints,
  metadata = DEFAULT_SLAM_METADATA,
  mapImageUrl = '',
  className = '',
  kitchenLocation,
  mode = 'technical',
  chimeEnabled,
  onToggleChime,
  arrivalAlert,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null);

  // Measure container dimensions for true responsive canvas fitting across devices
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Active SLAM map fetched from Robot Service API / SQLite
  const [activeSlamMap, setActiveSlamMap] = useState<SlamMapResponse | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(false);
  const [sqliteWaypoints, setSqliteWaypoints] = useState<SlamMapWaypointDto[]>([]);

  // Function to load waypoints saved in local SQLite
  const loadSqliteWaypoints = useCallback(async () => {
    try {
      const wps = await sqliteService.getWaypoints();
      setSqliteWaypoints(wps);
    } catch (e) {
      console.warn('Lỗi tải waypoints từ SQLite:', e);
    }
  }, []);

  // Layer toggles
  const [showRawSlam, setShowRawSlam] = useState<boolean>(true);
  const [showCoordinateOverlay, setShowCoordinateOverlay] = useState<boolean>(true);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);

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
  const [hoveredWaypoint, setHoveredWaypoint] = useState<SlamMapWaypointDto | null>(null);

  // Map Image state
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Listen for realtime SLAM map and waypoint broadcasts from SignalR
  useEffect(() => {
    const handleSlamUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SlamMapResponse>;
      if (customEvent.detail) {
        setActiveSlamMap(customEvent.detail);
        void loadSqliteWaypoints();
      }
    };
    window.addEventListener('vora:slam-map-updated', handleSlamUpdate);
    return () => window.removeEventListener('vora:slam-map-updated', handleSlamUpdate);
  }, [loadSqliteWaypoints]);

  // 1. Fetch SLAM map metadata from local SQLite cache
  const fetchActiveMap = useCallback(async () => {
    setIsLoadingMap(true);
    try {
      // Try local SQLite first
      const localMap = await sqliteService.getSlamMap();
      if (localMap) {
        setActiveSlamMap(localMap);
      }
      await loadSqliteWaypoints();
    } catch (err) {
      console.warn('Lỗi tải metadata SLAM Map từ SQLite:', err);
    } finally {
      setIsLoadingMap(false);
    }
  }, [loadSqliteWaypoints]);

  useEffect(() => {
    void fetchActiveMap();
    void loadSqliteWaypoints();
  }, [fetchActiveMap, loadSqliteWaypoints]);

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

  // 3. REAL STATIONS (Lấy trực tiếp từ prop stations hoặc qua activeSlamMap.stations)
  const resolvedStations: SlamMapStationDto[] = useMemo(() => {
    if (stations && Array.isArray(stations) && stations.length > 0) {
      return stations.map((s: any) => ({
        id: s.id?.toString() || s.stationId || '',
        name: s.name || s.stationName || `Trạm ${s.id}`,
        stationType: s.stationType || s.type || 'Dropoff',
        status: s.status || 'active',
        worldX:
          typeof s.worldX === 'number'
            ? s.worldX
            : typeof s.metricX === 'number'
              ? s.metricX
              : typeof s.metric_x === 'number'
                ? s.metric_x
                : typeof s.xCoord === 'number'
                  ? s.xCoord * effectiveMetadata.resolution
                  : typeof s.x_coord === 'number'
                    ? s.x_coord * effectiveMetadata.resolution
                    : 0,
        worldY:
          typeof s.worldY === 'number'
            ? s.worldY
            : typeof s.metricY === 'number'
              ? s.metricY
              : typeof s.metric_y === 'number'
                ? s.metric_y
                : typeof s.yCoord === 'number'
                  ? s.yCoord * effectiveMetadata.resolution
                  : typeof s.y_coord === 'number'
                    ? s.y_coord * effectiveMetadata.resolution
                    : 0,
        yaw: s.yaw ?? 0,
        areaId: s.areaId || s.area_id,
      }));
    }
    return activeSlamMap?.stations || [];
  }, [stations, activeSlamMap, effectiveMetadata.resolution]);

  // 4. REAL TABLES: Ràng buộc bất biến - Chỉ load lên bản đồ khi bàn ĐÃ ĐƯỢC GÁN TRẠM VẬT LÝ trong SQLite
  // Tuyệt đối không tự ý sinh tọa độ bàn giả lập khi chưa có trạm.
  const resolvedTables: MapTableNode[] = useMemo(() => {
    const mapped: MapTableNode[] = [];
    for (const t of tables) {
      let wx = t.worldX;
      let wy = t.worldY;

      // Nếu bàn đã được gán trạm nhưng chưa có tọa độ ROS riêng, đồng bộ tọa độ theo trạm vật lý
      if ((wx === undefined || wy === undefined || (wx === 0 && wy === 0)) && (t.stationId || t.stationName)) {
        const matchedStation = resolvedStations.find(
          (s) =>
            s.id === t.stationId ||
            s.name === t.stationName ||
            (t.stationId && s.name === t.stationId)
        );
        if (matchedStation) {
          wx = matchedStation.worldX;
          wy = matchedStation.worldY;
        }
      }

      // Chỉ hiển thị bàn nếu đã gán trạm vật lý hợp lệ
      if (typeof wx === 'number' && typeof wy === 'number' && (t.stationId || t.stationName)) {
        mapped.push({
          ...t,
          worldX: wx,
          worldY: wy,
        });
      }
    }

    if (mapped.length > 0) {
      return mapped;
    }

    // Nếu activeSlamMap có bảng bàn gắn trạm từ BE
    if (activeSlamMap?.tables && activeSlamMap.tables.length > 0) {
      return (activeSlamMap.tables as any[])
        .filter((st: any) => st.stationId || st.stationName)
        .map((st: any) => ({
          id: (st.id || st.tableNo).toString(),
          name: st.name || `Bàn ${st.tableNo}`,
          zone: st.zone || '',
          status: 'empty' as const,
          stationId: st.stationId,
          stationName: st.stationName,
          worldX: st.worldX,
          worldY: st.worldY,
        }));
    }

    return [];
  }, [tables, resolvedStations, activeSlamMap]);

  // 4b. REAL WAYPOINTS (Chỉ hiển thị khi nhận từ MQTT ROS 2 / SQLite, KHÔNG tự ý xếp waypoint giả)
  const resolvedWaypoints: SlamMapWaypointDto[] = useMemo(() => {
    if (waypoints && waypoints.length > 0) return waypoints;
    if (activeSlamMap?.waypoints && activeSlamMap.waypoints.length > 0) return activeSlamMap.waypoints;
    if (sqliteWaypoints && sqliteWaypoints.length > 0) return sqliteWaypoints;
    return [];
  }, [waypoints, activeSlamMap, sqliteWaypoints]);

  // 5. REAL ROBOTS: Chỉ render robot có tọa độ thực từ Telemetry / CSDL (ETM-36..38: không tạo tọa độ giả)
  const resolvedRobots = useMemo(() => {
    return robots.filter(
      (r) =>
        typeof r.worldX === 'number' &&
        !Number.isNaN(r.worldX) &&
        typeof r.worldY === 'number' &&
        !Number.isNaN(r.worldY)
    );
  }, [robots]);

  // Auto-fit Scale: Tự động tính hệ số tỷ lệ để vừa vặn hoàn hảo trong khung hiển thị bất kể thiết bị (Mobile/Tablet/Desktop)
  const autoScale = useMemo(() => {
    const mapW = effectiveMetadata.width || 800;
    const mapH = effectiveMetadata.height || 600;
    const availableW = containerSize.width > 32 ? containerSize.width - 24 : 860;
    const availableH = containerSize.height > 32 ? containerSize.height - 24 : 460;
    const sX = availableW / mapW;
    const sY = availableH / mapH;
    return Math.min(sX, sY);
  }, [containerSize, effectiveMetadata.width, effectiveMetadata.height]);

  const canvasDisplayWidth = Math.max(200, Math.round((effectiveMetadata.width || 800) * autoScale));
  const canvasDisplayHeight = Math.max(150, Math.round((effectiveMetadata.height || 600) * autoScale));
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  // Handle Zoom
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.25, 5.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.25, 0.2));
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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.2), 5.0));
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

    const totalScale = zoom * autoScale;
    const rawPx = (clientX - pan.x) / totalScale;
    const rawPy = (clientY - pan.y) / totalScale;

    if (mode === 'technical' && showCoordinateOverlay) {
      const nextPixelX = Math.round(rawPx);
      const nextPixelY = Math.round(rawPy);
      setHoveredCoord((prev) => {
        if (prev && prev.pixelX === nextPixelX && prev.pixelY === nextPixelY) {
          return prev;
        }
        const world = canvasPixelToRos(rawPx, rawPy, effectiveMetadata);
        return {
          pixelX: nextPixelX,
          pixelY: nextPixelY,
          worldX: world.x,
          worldY: world.y,
        };
      });
    }

    let foundTable: MapTableNode | null = null;
    const hitRadiusPixel = mode === 'simplified' ? 28 : 22;

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
    setHoveredTable((prev) => (prev?.id === foundTable?.id ? prev : foundTable));

    let foundWaypoint: SlamMapWaypointDto | null = null;
    if (mode === 'technical') {
      const wpRadiusPixel = 18;
      for (const wp of resolvedWaypoints) {
        if (typeof wp.worldX === 'number' && typeof wp.worldY === 'number') {
          const wpPx = rosToCanvasPixel(wp.worldX, wp.worldY, effectiveMetadata);
          const dist = Math.hypot(rawPx - wpPx.x, rawPy - wpPx.y);
          if (dist <= wpRadiusPixel) {
            foundWaypoint = wp;
            break;
          }
        }
      }
    }
    setHoveredWaypoint((prev) =>
      prev?.id === foundWaypoint?.id && prev?.name === foundWaypoint?.name ? prev : foundWaypoint
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Gestures: Pan & Pinch-to-Zoom Support for POS Terminals & Tablets
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    panStartX: number;
    panStartY: number;
    initialDistance: number;
    initialZoom: number;
    moved: boolean;
    startTime: number;
  }>({
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0,
    initialDistance: 0,
    initialZoom: 1,
    moved: false,
    startTime: 0,
  });

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        panStartX: pan.x,
        panStartY: pan.y,
        initialDistance: 0,
        initialZoom: zoom,
        moved: false,
        startTime: Date.now(),
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStateRef.current = {
        startX: (t1.clientX + t2.clientX) / 2,
        startY: (t1.clientY + t2.clientY) / 2,
        panStartX: pan.x,
        panStartY: pan.y,
        initialDistance: dist,
        initialZoom: zoom,
        moved: true,
        startTime: Date.now(),
      };
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.startX;
      const dy = t.clientY - touchStateRef.current.startY;
      if (Math.hypot(dx, dy) > 6) {
        touchStateRef.current.moved = true;
      }
      setPan({
        x: touchStateRef.current.panStartX + dx,
        y: touchStateRef.current.panStartY + dy,
      });
    } else if (e.touches.length === 2 && touchStateRef.current.initialDistance > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = currDist / touchStateRef.current.initialDistance;
      const newZoom = Math.min(Math.max(touchStateRef.current.initialZoom * scale, 0.2), 5.0);
      setZoom(newZoom);
    }
  };

  const hitTestCanvas = (
    clientX: number,
    clientY: number,
    hitRadiusRobot: number,
    hitRadiusTable: number
  ) => {
    const totalScale = zoom * autoScale;
    const rawPx = (clientX - pan.x) / totalScale;
    const rawPy = (clientY - pan.y) / totalScale;

    for (const robot of resolvedRobots) {
      if (robot.worldX !== undefined && robot.worldY !== undefined) {
        const robotPx = rosToCanvasPixel(robot.worldX, robot.worldY, effectiveMetadata);
        if (Math.hypot(rawPx - robotPx.x, rawPy - robotPx.y) <= hitRadiusRobot) {
          onSelectRobot?.(robot.id || robot.code);
          return;
        }
      }
    }

    for (const table of resolvedTables) {
      if (table.worldX !== undefined && table.worldY !== undefined) {
        const tablePx = rosToCanvasPixel(table.worldX, table.worldY, effectiveMetadata);
        if (Math.hypot(rawPx - tablePx.x, rawPy - tablePx.y) <= hitRadiusTable) {
          onSelectTable?.(table.id);
          break;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const wasMoved = touchStateRef.current.moved;
    const duration = Date.now() - touchStateRef.current.startTime;

    setIsDragging(false);

    // If it was a quick tap without drag on touch device, trigger hit test!
    if (!wasMoved && duration < 350 && e.changedTouches.length > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      hitTestCanvas(
        t.clientX - rect.left,
        t.clientY - rect.top,
        mode === 'simplified' ? 36 : 28,
        mode === 'simplified' ? 38 : 30
      );
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    hitTestCanvas(
      e.clientX - rect.left,
      e.clientY - rect.top,
      mode === 'simplified' ? 28 : 22,
      mode === 'simplified' ? 32 : 25
    );
  };

  const drawStaticLayers = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const width = effectiveMetadata.width;
      const height = effectiveMetadata.height;

      // =======================================================================
      // LAYER 1: BACKGROUND / SLAM OCCUPANCY GRID
      // =======================================================================
      if (mode === 'simplified') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.6;
        const gridSpacing = 40;
        for (let x = 0; x <= width; x += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        if (imageLoaded && mapImage) {
          ctx.globalAlpha = 0.25;
          ctx.drawImage(mapImage, 0, 0, width, height);
          ctx.globalAlpha = 1.0;
        }
      } else if (showRawSlam) {
        if (imageLoaded && mapImage) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(mapImage, 0, 0, width, height);
          ctx.globalAlpha = 1.0;
        } else {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, width, height);

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
          ctx.fillText('Gốc Tọa Độ (0,0)', originPx.x + 6, originPx.y - 6);
        }
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
      }

      // =======================================================================
      // LAYER 2.1 & 2.2: STATIONS & KITCHEN
      // =======================================================================
      resolvedStations.forEach((st) => {
        const stPx = rosToCanvasPixel(st.worldX, st.worldY, effectiveMetadata);
        const isPickup =
          st.stationType === 'Pickup' ||
          st.stationType === 'Kitchen' ||
          st.stationType.toLowerCase() === 'pickup' ||
          st.stationType.toLowerCase() === 'kitchen';
        ctx.fillStyle = isPickup ? '#0284c7' : '#eab308';
        drawRoundedRectPath(ctx, stPx.x - 30, stPx.y - 20, 60, 40, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(st.name, stPx.x, stPx.y + 3);
      });

      if (kitchenLocation) {
        const kPx = rosToCanvasPixel(kitchenLocation.x, kitchenLocation.y, effectiveMetadata);
        ctx.fillStyle = '#0284c7';
        drawRoundedRectPath(ctx, kPx.x - 30, kPx.y - 20, 60, 40, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QUẦY BẾP', kPx.x, kPx.y + 3);
      }
    },
    [mode, effectiveMetadata, showRawSlam, imageLoaded, mapImage, resolvedStations, kitchenLocation]
  );

  // Cache static layers onto an offscreen canvas so 5Hz telemetry / hover doesn't redraw the grid & floorplan
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const width = effectiveMetadata.width || 800;
    const height = effectiveMetadata.height || 600;
    const offscreen = staticLayerRef.current ?? document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.clearRect(0, 0, width, height);
      drawStaticLayers(offCtx);
      staticLayerRef.current = offscreen;
    } else {
      staticLayerRef.current = null;
    }
  }, [drawStaticLayers, effectiveMetadata.width, effectiveMetadata.height]);

  // Main Canvas Render Function (On-demand, HiDPI aware)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = effectiveMetadata.width;
    const height = effectiveMetadata.height;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasDisplayWidth, canvasDisplayHeight);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom * autoScale, zoom * autoScale);
    ctx.imageSmoothingEnabled = false;

    const cachedStatic = staticLayerRef.current;
    if (cachedStatic && cachedStatic.width === width && cachedStatic.height === height) {
      ctx.drawImage(cachedStatic, 0, 0, width, height);
    } else {
      drawStaticLayers(ctx);
    }

    const arrivedTargetNorm = normalizeTableCode(arrivalAlert?.tableName);

    // 2.3 Dining Tables
    resolvedTables.forEach((table) => {
      if (table.worldX === undefined || table.worldY === undefined) return;
      const px = rosToCanvasPixel(table.worldX, table.worldY, effectiveMetadata);
      const isSelected = table.id === selectedTableId;
      const isHovered = hoveredTable?.id === table.id;
      const isArrivedTarget =
        Boolean(table.isArrivedTarget) ||
        (Boolean(arrivedTargetNorm) && normalizeTableCode(table.name) === arrivedTargetNorm);

      if (mode === 'simplified') {
        const radius = isSelected ? 24 : 20;

        // Arrival Halo Ring (Amber dashed ring from Figma 6:89)
        if (isArrivedTarget) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.arc(px.x, px.y, radius + 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Selection / Hover outer glow ring
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(px.x, px.y, radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(148, 163, 184, 0.15)';
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#2563eb' : '#94a3b8';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Table body
        let statusBadgeColor = '#94a3b8';
        let tableBorder = '#cbd5e1';

        if (isArrivedTarget) {
          statusBadgeColor = '#f59e0b';
          tableBorder = '#2563eb';
        } else if (table.status === 'waiting') {
          statusBadgeColor = '#f59e0b';
          tableBorder = '#f59e0b';
        } else if (table.status === 'serving') {
          statusBadgeColor = '#2563eb';
          tableBorder = '#2563eb';
        } else if (table.status === 'occupied') {
          statusBadgeColor = '#10b981';
          tableBorder = '#10b981';
        }

        ctx.beginPath();
        ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#eff6ff' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2563eb' : tableBorder;
        ctx.lineWidth = isSelected || isArrivedTarget ? 3 : 2;
        ctx.stroke();

        // Status indicator dot
        ctx.beginPath();
        ctx.arc(px.x + radius - 4, px.y - radius + 4, 5, 0, Math.PI * 2);
        ctx.fillStyle = statusBadgeColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Table name text
        ctx.fillStyle = isSelected ? '#1d4ed8' : '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shortName = table.name.replace(/^Bàn\s*/i, '');
        ctx.fillText(`Bàn ${shortName}`, px.x, px.y);
      } else {
        // Technical mode table rendering
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
      }
    });

    // =========================================================================
    // LAYER 2.4: WAYPOINTS LAYER (NAV2 / TECHNICAL ONLY)
    // =========================================================================
    if (mode === 'technical' && showWaypoints) {
      resolvedWaypoints.forEach((wp) => {
        if (wp.worldX === undefined || wp.worldY === undefined) return;
        const wpPx = rosToCanvasPixel(wp.worldX, wp.worldY, effectiveMetadata);
        const isHovered = (hoveredWaypoint?.id && hoveredWaypoint.id === wp.id) || hoveredWaypoint?.name === wp.name;

        let nodeColor = '#06b6d4';
        let ringColor = 'rgba(6, 182, 212, 0.4)';
        const typeLower = (wp.type || '').toLowerCase();
        if (typeLower.includes('charging') || typeLower.includes('dock')) {
          nodeColor = '#10b981';
          ringColor = 'rgba(16, 185, 129, 0.4)';
        } else if (typeLower.includes('kitchen') || typeLower.includes('pickup')) {
          nodeColor = '#0284c7';
          ringColor = 'rgba(2, 132, 199, 0.4)';
        } else if (typeLower.includes('table') || typeLower.includes('dining')) {
          nodeColor = '#8b5cf6';
          ringColor = 'rgba(139, 92, 246, 0.4)';
        }

        ctx.beginPath();
        ctx.arc(wpPx.x, wpPx.y, isHovered ? 14 : 10, 0, Math.PI * 2);
        ctx.fillStyle = ringColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(wpPx.x, wpPx.y, isHovered ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (typeof wp.theta === 'number' && wp.theta !== 0) {
          ctx.save();
          ctx.translate(wpPx.x, wpPx.y);
          ctx.rotate(-wp.theta);
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(16, 0);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(16, 0);
          ctx.lineTo(12, -3);
          ctx.lineTo(12, 3);
          ctx.closePath();
          ctx.fillStyle = '#facc15';
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(wp.name, wpPx.x, wpPx.y + 12);
      });
    }

    // =========================================================================
    // LAYER 3: DYNAMIC REALTIME LAYER (ROBOTS)
    // =========================================================================
    resolvedRobots.forEach((robot) => {
      if (robot.worldX === undefined || robot.worldY === undefined) return;
      const robotPx = rosToCanvasPixel(robot.worldX, robot.worldY, effectiveMetadata);
      const normStatus = (robot.status || '').toLowerCase();
      const isArrived = normStatus === 'arrived';
      const isDelivering = normStatus === 'delivering' || normStatus === 'moving' || isArrived;

      // Laser trajectory path
      if (isDelivering && (mode === 'simplified' || showTrajectories)) {
        const targetNorm = normalizeTableCode(robot.targetTable);
        const targetTable = resolvedTables.find(
          (t) =>
            (targetNorm && normalizeTableCode(t.name) === targetNorm) ||
            t.assignedRobot === robot.code ||
            (robot.currentZone && robot.currentZone.includes(t.name))
        );

        if (targetTable?.worldX !== undefined && targetTable?.worldY !== undefined) {
          const targetPx = rosToCanvasPixel(targetTable.worldX, targetTable.worldY, effectiveMetadata);
          ctx.beginPath();
          ctx.setLineDash([5, 4]);
          ctx.moveTo(robotPx.x, robotPx.y);
          ctx.lineTo(targetPx.x, targetPx.y);
          ctx.strokeStyle = isArrived ? '#f59e0b' : mode === 'simplified' ? '#2563eb' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const isSelectedRobot = !!selectedRobotId && (robot.id === selectedRobotId || robot.code === selectedRobotId);

      if (mode === 'simplified') {
        // Simplified avatar for Staff
        if (isSelectedRobot || isArrived) {
          ctx.beginPath();
          ctx.arc(robotPx.x, robotPx.y, 22, 0, Math.PI * 2);
          ctx.fillStyle = isArrived ? 'rgba(245, 158, 11, 0.22)' : 'rgba(56, 189, 248, 0.25)';
          ctx.fill();
          ctx.strokeStyle = isArrived ? '#f59e0b' : '#0284c7';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(robotPx.x, robotPx.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = isArrived ? '#d97706' : isSelectedRobot ? '#0284c7' : '#0284c7';
        ctx.fill();
        ctx.strokeStyle = isSelectedRobot ? '#ffffff' : isArrived ? '#fef3c7' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Heading direction indicator from telemetry Yaw (F-08)
        if (typeof robot.yaw === 'number') {
          ctx.save();
          ctx.translate(robotPx.x, robotPx.y);
          ctx.rotate(-robot.yaw);
          ctx.beginPath();
          ctx.moveTo(19, 0);
          ctx.lineTo(13, -4);
          ctx.lineTo(13, 4);
          ctx.closePath();
          ctx.fillStyle = isArrived ? '#f59e0b' : '#38bdf8';
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AMR', robotPx.x, robotPx.y);

        ctx.fillStyle = isArrived ? '#b45309' : '#0284c7';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`${robot.code || robot.name} (${Math.round(robot.battery)}%)`, robotPx.x, robotPx.y + 24);

        // Target Tray Badge directly on Robot Marker (Figma 31:22)
        if (isDelivering && (robot.cargoLevel === 1 || robot.cargoLevel === 2 || robot.targetTable)) {
          const trayLabel =
            robot.cargoLevel && robot.targetTable
              ? `Khay ${robot.cargoLevel} → ${robot.targetTable}`
              : robot.cargoLevel
                ? `Khay ${robot.cargoLevel}`
                : `${robot.targetTable}`;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          const textW = ctx.measureText(trayLabel).width;
          const badgeW = Math.max(76, textW + 18);
          const badgeH = 18;
          const badgeX = robotPx.x - badgeW / 2;
          const badgeY = robotPx.y + 32;

          drawRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 9);
          ctx.fillStyle = isArrived ? '#d97706' : '#0062ff';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(trayLabel, robotPx.x, badgeY + badgeH / 2 + 0.5);
        }
      } else {
        // Technical marker with Yaw rotation
        if (isSelectedRobot) {
          ctx.beginPath();
          ctx.arc(robotPx.x, robotPx.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 210, 255, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#00d2ff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(robotPx.x, robotPx.y);
        const yawAngle = robot.yaw !== undefined ? -robot.yaw : 0;
        ctx.rotate(yawAngle);

        ctx.fillStyle = isArrived ? '#d97706' : isDelivering ? '#16a34a' : isSelectedRobot ? '#0284c7' : '#0369a1';
        drawRoundedRectPath(ctx, -12, -12, 24, 24, 5);
        ctx.fill();
        ctx.strokeStyle = isSelectedRobot ? '#00d2ff' : '#ffffff';
        ctx.lineWidth = isSelectedRobot ? 2 : 1.5;
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(4, -5);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.fillStyle = isSelectedRobot ? '#38bdf8' : '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(robot.code, robotPx.x, robotPx.y - 16);
      }
    });

    ctx.restore();
  }, [
    mode,
    effectiveMetadata,
    dpr,
    canvasDisplayWidth,
    canvasDisplayHeight,
    pan,
    zoom,
    autoScale,
    drawStaticLayers,
    resolvedTables,
    resolvedWaypoints,
    resolvedRobots,
    selectedTableId,
    selectedRobotId,
    hoveredTable,
    hoveredWaypoint,
    showTrajectories,
    showWaypoints,
    arrivalAlert?.tableName,
  ]);

  // Render on-demand when state/telemetry changes instead of an unconditional 60fps idle loop
  useEffect(() => {
    const animId = requestAnimationFrame(() => {
      render();
    });
    return () => cancelAnimationFrame(animId);
  }, [render]);

  return (
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden select-none shadow-xl ${
        mode === 'simplified' ? 'bg-white border border-slate-200 shadow-xs' : 'bg-slate-900 border border-slate-800'
      } ${className}`}
    >
      {/* Top Header / Map Toolbar */}
      {mode === 'simplified' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white border-b border-slate-200 text-slate-800 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 tracking-wider">
                  Sơ Đồ Bàn Ăn & Vị Trí Robot
                </span>
                {robots && robots.length > 0 && (() => {
                  const activeRobot = (selectedRobotId ? robots.find(r => r.id === selectedRobotId) : null)
                    || robots.find(r => r.status === 'Delivering' || r.status === 'Arrived')
                    || robots[0];
                  return (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {activeRobot.name || activeRobot.id}: {activeRobot.yaw !== undefined ? `${(activeRobot.yaw).toFixed(2)} rad` : 'Sẵn sàng'}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Nhấp vào bàn trên sơ đồ để chọn điểm giao món ăn cho AMR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(onToggleChime !== undefined || chimeEnabled !== undefined) && (
              <button
                type="button"
                onClick={onToggleChime}
                aria-pressed={chimeEnabled !== false}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                  chimeEnabled !== false
                    ? 'bg-[#fef3c7] border-[#f59e0b] text-[#92400e] hover:bg-amber-200/80'
                    : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200/70'
                }`}
                title="Bật hoặc tắt chuông báo khi robot tới bàn"
              >
                {chimeEnabled !== false ? (
                  <Bell className="w-3 h-3 text-[#b45309] shrink-0" />
                ) : (
                  <BellOff className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {chimeEnabled !== false ? 'Chuông báo: Bật' : 'Chuông báo: Tắt'}
                </span>
                <span className="sm:hidden">
                  {chimeEnabled !== false ? 'Chuông: Bật' : 'Chuông: Tắt'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchActiveMap}
              disabled={isLoadingMap}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
              title="Làm mới trạng thái sơ đồ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMap ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
              title="Căn giữa màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-slate-200 z-10 gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 shrink-0">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-100 tracking-wider truncate">
                  {activeSlamMap?.name || 'Bản Đồ Mặt Bằng Nhà Hàng'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
                  {effectiveMetadata.resolution}m/px
                </span>
                {robots && robots.length > 0 && (() => {
                  const activeRobot = (selectedRobotId ? robots.find(r => r.id === selectedRobotId) : null)
                    || robots.find(r => r.status === 'Delivering')
                    || robots[0];
                  return (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1 font-semibold shrink-0">
                      <Compass className="w-3 h-3 text-purple-400" />
                      {activeRobot.name || activeRobot.id}: {activeRobot.yaw !== undefined ? `${(activeRobot.yaw).toFixed(2)} rad` : 'Sẵn sàng'}
                    </span>
                  );
                })()}
                {resolvedWaypoints.length > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono flex items-center gap-1 font-semibold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Điểm Dừng ({resolvedWaypoints.length})
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1 font-semibold shrink-0">
                    Chưa có điểm dừng
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:block truncate mt-0.5">
                Giám sát vị trí đội robot và sơ đồ điểm dừng tại nhà hàng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-0.5">
            <button
              type="button"
              onClick={fetchActiveMap}
              disabled={isLoadingMap}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Đồng bộ lại bản đồ mặt bằng"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMap ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowRawSlam((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showRawSlam
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt lớp bản đồ mặt bằng"
            >
              {showRawSlam ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Lớp Bản Đồ</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTrajectories((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showTrajectories
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt đường đi của AMR"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Đường Đi</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWaypoints((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showWaypoints
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt hiển thị Điểm dừng"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                Điểm Dừng ({resolvedWaypoints.length > 0 ? resolvedWaypoints.length : '0'})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowCoordinateOverlay((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showCoordinateOverlay
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt hiển thị tọa độ"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tọa Độ</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Căn giữa bản đồ"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing min-h-[320px] sm:min-h-[440px] h-[360px] sm:h-[480px] lg:h-[540px] w-full ${
          mode === 'simplified' ? 'bg-slate-100/70' : 'bg-slate-950'
        }`}
      >
        {mode === 'technical' && resolvedWaypoints.length === 0 && (
          <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 bg-amber-950/90 backdrop-blur-md border border-amber-500/50 text-amber-200 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 z-20 shadow-lg pointer-events-none max-w-[92%] text-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="line-clamp-2 sm:line-clamp-none">
              Chưa có dữ liệu điểm dừng trên bản đồ mặt bằng.
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={Math.round(canvasDisplayWidth * dpr)}
          height={Math.round(canvasDisplayHeight * dpr)}
          style={{ width: `${canvasDisplayWidth}px`, height: `${canvasDisplayHeight}px` }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`rounded-xl shadow-2xl transition-transform touch-none select-none max-w-full max-h-full ${
            mode === 'simplified' ? 'border border-slate-200' : 'border border-slate-800/80'
          }`}
        />

        {/* Hover Table Tooltip Overlay */}
        {hoveredTable && (
          <div
            className={`absolute top-4 left-4 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs space-y-1.5 pointer-events-none z-20 ${
              mode === 'simplified'
                ? 'bg-white/95 border border-slate-200 text-slate-900'
                : 'bg-slate-900/95 border border-slate-750 text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`font-extrabold text-sm ${mode === 'simplified' ? 'text-blue-700' : 'text-blue-400'}`}>
                {hoveredTable.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  hoveredTable.status === 'waiting'
                    ? 'bg-amber-500/20 text-amber-600'
                    : hoveredTable.status === 'serving'
                    ? 'bg-blue-500/20 text-blue-600'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {hoveredTable.status.toUpperCase()}
              </span>
            </div>
            {mode === 'technical' && (
              <div className="text-[11px] text-slate-400 font-mono">
                Tọa độ thực: X = {hoveredTable.worldX?.toFixed(2)}m | Y = {hoveredTable.worldY?.toFixed(2)}m
              </div>
            )}
            {hoveredTable.assignedRobot && (
              <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span>
                  Robot đảm nhiệm: {hoveredTable.assignedRobot}
                  {hoveredTable.assignedCargoLevel ? ` (Khay ${hoveredTable.assignedCargoLevel})` : ''}
                </span>
              </div>
            )}
            <p className={`text-[10px] italic pt-1 ${mode === 'simplified' ? 'text-slate-500 border-t border-slate-100' : 'text-slate-400 border-t border-slate-800'}`}>
              Nhấp chuột để chọn bàn này cho khay xuất món KDS
            </p>
          </div>
        )}

        {/* AMR Arrival & Target Tray Alert Overlay (Figma 31:29 Desktop / 31:52 Tablet) */}
        {mode === 'simplified' && arrivalAlert && (
          <>
            {/* Desktop / Large Tablet Overlay Card */}
            <div className="hidden sm:flex flex-col gap-1.5 absolute bottom-3 right-3 w-[360px] max-w-[calc(100%-24px)] bg-[#fffbeb]/95 backdrop-blur-md border-[1.5px] border-[#f59e0b] rounded-xl px-3 py-2.5 shadow-[0_6px_16px_rgba(15,23,42,0.14)] z-20 pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Bell className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                  <span className="font-heading font-bold text-[11.5px] text-[#78350f] truncate">
                    {arrivalAlert.robotCode} Đã Tới {arrivalAlert.tableName}
                    {arrivalAlert.stationName ? ` (${arrivalAlert.stationName})` : ''}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border shrink-0 ${
                    arrivalAlert.chimePlayed !== false
                      ? 'bg-[#dbf9eb] border-[#10b981] text-[#064e3b]'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                >
                  {arrivalAlert.chimePlayed !== false ? 'Đã phát chuông' : 'Đã tắt chuông'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f59e0b] text-[#0f172a] font-mono font-bold text-[10px]">
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>
                    LẤY MÓN: KHAY {arrivalAlert.cargoLevel} ({arrivalAlert.cargoLevel === 1 ? 'TẦNG DƯỚI' : 'TẦNG TRÊN'})
                  </span>
                </span>
                {arrivalAlert.orderId && (
                  <span className="font-mono font-medium text-[10px] text-[#92400e]">
                    Đơn: {arrivalAlert.orderId}
                  </span>
                )}
              </div>

              <p className="text-[10px] font-medium text-[#78350f] leading-snug">
                {arrivalAlert.nextTableName
                  ? `Nhân viên lấy món ở Khay ${arrivalAlert.cargoLevel} và bấm xác nhận để đi tiếp ${arrivalAlert.nextTableName}.`
                  : `Nhân viên lấy món ở Khay ${arrivalAlert.cargoLevel} và bấm xác nhận để robot quay về Bếp.`}
              </p>
            </div>

            {/* Compact Mobile / Small Tablet Banner */}
            <div className="flex sm:hidden items-center justify-between gap-2 absolute bottom-2.5 left-2.5 right-2.5 bg-[#fffbeb]/95 backdrop-blur-md border-[1.5px] border-[#f59e0b] rounded-[10px] px-2.5 py-2 shadow-lg z-20 pointer-events-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <Bell className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
                <span className="text-[10.5px] font-bold text-[#78350f] truncate">
                  {arrivalAlert.robotCode} đã tới {arrivalAlert.tableName} • Lấy món Khay {arrivalAlert.cargoLevel}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#f59e0b] text-[#0f172a] font-mono font-bold text-[9.5px] shrink-0">
                KHAY {arrivalAlert.cargoLevel}
              </span>
            </div>
          </>
        )}

        {/* Hover Waypoint Tooltip Overlay (Technical Only) */}
        {mode === 'technical' && hoveredWaypoint && (
          <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 pointer-events-none z-20 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold text-sm text-cyan-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {hoveredWaypoint.name}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {(hoveredWaypoint.type || 'waypoint').toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Tọa độ: X = {hoveredWaypoint.worldX.toFixed(2)}m | Y = {hoveredWaypoint.worldY.toFixed(2)}m
            </div>
            {typeof hoveredWaypoint.theta === 'number' && (
              <div className="text-[10px] text-amber-300 font-mono">
                Góc xoay (θ): {(hoveredWaypoint.theta * (180 / Math.PI)).toFixed(1)}° ({hoveredWaypoint.theta.toFixed(2)} rad)
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
              Tọa độ điểm dừng điều hướng
            </p>
          </div>
        )}

        {/* Realtime Coordinate Crosshair Display (Technical Only) */}
        {mode === 'technical' && showCoordinateOverlay && hoveredCoord && (
          <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-3 z-20">
            <span className="flex items-center gap-1 text-blue-400">
              <Crosshair className="w-3 h-3" />
              <span>
                Tọa độ: ({hoveredCoord.worldX.toFixed(2)}m, {hoveredCoord.worldY.toFixed(2)}m)
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Điểm ảnh: ({hoveredCoord.pixelX}, {hoveredCoord.pixelY})
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">Zoom: {Math.round(zoom * 100)}%</span>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      {mode === 'simplified' ? (
        <div className="px-3 sm:px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 text-[10px] sm:text-[11px] text-slate-600">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-bold text-slate-700 shrink-0">Chú thích sơ đồ:</span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Chờ món
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang phục vụ
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Có khách
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Bàn trống
            </span>
            <span className="flex items-center gap-1 text-blue-700 font-bold shrink-0">
              <span className="w-2.5 h-2.5 rounded bg-blue-600" /> Robot AMR
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono truncate">
            Nhấp bàn trên sơ đồ để chọn lệnh • Tự động khớp lệnh KDS
          </span>
        </div>
      ) : (
        <div className="px-3 sm:px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 text-[10px] sm:text-[11px] text-slate-400">
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-bold text-slate-300 shrink-0">Chú thích sơ đồ:</span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Bàn chờ món
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang phục vụ
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Bàn trống
            </span>
            <span className="flex items-center gap-1 text-emerald-400 shrink-0">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Robot AMR
            </span>
            <span className="flex items-center gap-1 text-cyan-400 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Điểm dừng ({resolvedWaypoints.length})
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-mono truncate">
            Gốc: ({effectiveMetadata.originX}m, {effectiveMetadata.originY}m) • Trạm: {resolvedStations.length} • Điểm dừng: {resolvedWaypoints.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlamFloorMapViewer;
