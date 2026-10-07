/**
 * ==============================================================================
 *  VORA ROBOTICS - ROS 2 & SLAM COORDINATE TRANSFORMATION UTILITIES
 * ==============================================================================
 *  Quy đổi tọa độ giữa Hệ tọa độ Thế giới ROS 2 (World Frame / Mét)
 *  và Hệ tọa độ Màn hình HTML5 Canvas / SVG (Pixel).
 *
 *  Invariants:
 *  - ROS 2: Gốc (0,0) ở giữa hoặc góc theo metadata, trục Y hướng LÊN TRÊN (+Y).
 *           Góc quay θ (Yaw) tính ngược chiều kim đồng hồ (CCW) bằng Radian.
 *  - Canvas: Gốc (0,0) ở GÓC TRÊN TRÁI, trục Y hướng XUỐNG DƯỚI (+Y).
 *            Góc quay tính theo chiều kim đồng hồ (CW).
 * ==============================================================================
 */

export interface SlamMapMetadata {
  resolution: number; // mét / pixel (ví dụ: 0.05m = 5cm/pixel)
  originX: number;    // Tọa độ X của pixel (0,0) góc trái-dưới của map trong ROS (mét)
  originY: number;    // Tọa độ Y của pixel (0,0) góc trái-dưới của map trong ROS (mét)
  width: number;      // Chiều rộng bản đồ (pixel)
  height: number;     // Chiều cao bản đồ (pixel)
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Metadata mặc định cho bản đồ SLAM mặt bằng nhà hàng tiêu chuẩn
 * Kích thước: 800 x 600 px (40m x 30m với resolution 0.05m/px)
 */
export const DEFAULT_SLAM_METADATA: SlamMapMetadata = {
  resolution: 0.05,
  originX: -20.0,
  originY: -15.0,
  width: 800,
  height: 600,
};

/**
 * Quy đổi từ Tọa độ Thế giới ROS 2 (World meters) sang Tọa độ Pixel Canvas
 *
 * Công thức:
 *   pixelX = (worldX - originX) / resolution
 *   pixelY = height - (worldY - originY) / resolution   (đảo trục Y)
 */
export function rosToCanvasPixel(
  worldX: number,
  worldY: number,
  meta: SlamMapMetadata = DEFAULT_SLAM_METADATA
): PixelPoint {
  const pixelX = (worldX - meta.originX) / meta.resolution;
  const pixelY = meta.height - (worldY - meta.originY) / meta.resolution;
  return {
    x: Math.round(pixelX * 100) / 100,
    y: Math.round(pixelY * 100) / 100,
  };
}

/**
 * Quy đổi từ Tọa độ Pixel Canvas (khi Click chuột trên bản đồ) sang Tọa độ Thế giới ROS 2 (World meters)
 *
 * Công thức:
 *   worldX = originX + pixelX * resolution
 *   worldY = originY + (height - pixelY) * resolution
 */
export function canvasPixelToRos(
  pixelX: number,
  pixelY: number,
  meta: SlamMapMetadata = DEFAULT_SLAM_METADATA
): WorldPoint {
  const worldX = meta.originX + pixelX * meta.resolution;
  const worldY = meta.originY + (meta.height - pixelY) * meta.resolution;
  return {
    x: Math.round(worldX * 1000) / 1000,
    y: Math.round(worldY * 1000) / 1000,
  };
}

/**
 * Quy đổi góc Yaw từ ROS 2 (Radian, ngược chiều kim đồng hồ)
 * sang góc xoay Canvas (Radian, cùng chiều kim đồng hồ để dùng với ctx.rotate)
 */
export function rosYawToCanvasAngleRad(yawRad: number): number {
  return -yawRad;
}

/**
 * Chuyển đổi ROS Quaternion (geometry_msgs/Quaternion) sang góc Yaw (Radian)
 */
export function quaternionToYaw(q: Quaternion): number {
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return Math.atan2(siny_cosp, cosy_cosp);
}

/**
 * Tính khoảng cách Euclid giữa 2 điểm trong thế giới thực (mét)
 */
export function calculateEuclideanDistance(p1: WorldPoint, p2: WorldPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
