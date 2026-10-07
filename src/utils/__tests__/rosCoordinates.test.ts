import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SLAM_METADATA,
  rosToCanvasPixel,
  canvasPixelToRos,
  rosYawToCanvasAngleRad,
  quaternionToYaw,
  calculateEuclideanDistance,
  type SlamMapMetadata,
} from '../rosCoordinates';

describe('rosCoordinates Utility Tests', () => {
  const sampleMeta: SlamMapMetadata = {
    resolution: 0.05, // 0.05 m per pixel
    originX: -10.0,
    originY: -10.0,
    width: 800,
    height: 600,
  };

  it('should correctly convert origin corner (-10, -10) to bottom-left canvas pixel (0, 600)', () => {
    const pixel = rosToCanvasPixel(-10.0, -10.0, sampleMeta);
    expect(pixel.x).toBe(0);
    expect(pixel.y).toBe(600);
  });

  it('should correctly convert center point to canvas pixel and back to world coords', () => {
    // World point
    const worldX = 2.5;
    const worldY = 4.0;

    const pixel = rosToCanvasPixel(worldX, worldY, sampleMeta);
    // pixelX = (2.5 - (-10)) / 0.05 = 12.5 / 0.05 = 250
    // pixelY = 600 - (4.0 - (-10)) / 0.05 = 600 - 14 / 0.05 = 600 - 280 = 320
    expect(pixel.x).toBe(250);
    expect(pixel.y).toBe(320);

    // Invert back
    const reconstructedWorld = canvasPixelToRos(pixel.x, pixel.y, sampleMeta);
    expect(reconstructedWorld.x).toBeCloseTo(worldX, 3);
    expect(reconstructedWorld.y).toBeCloseTo(worldY, 3);
  });

  it('should invert Y axis correctly for canvas representation', () => {
    // Top in ROS (higher Y) should result in lower canvas Y (closer to 0)
    const lowY = rosToCanvasPixel(0, 0, sampleMeta);
    const highY = rosToCanvasPixel(0, 5, sampleMeta);
    expect(highY.y).toBeLessThan(lowY.y);
  });

  it('should convert ROS Yaw angle to Canvas rotation correctly', () => {
    const rosYaw = Math.PI / 4; // 45 deg CCW
    const canvasAngle = rosYawToCanvasAngleRad(rosYaw);
    expect(canvasAngle).toBe(-Math.PI / 4);
  });

  it('should convert Quaternion to Yaw correctly', () => {
    // Identity quaternion (no rotation, yaw = 0)
    expect(quaternionToYaw({ x: 0, y: 0, z: 0, w: 1 })).toBeCloseTo(0, 5);

    // 90 degrees CCW rotation around Z axis: z = sin(pi/4), w = cos(pi/4)
    const angle = Math.PI / 2;
    const q90 = {
      x: 0,
      y: 0,
      z: Math.sin(angle / 2),
      w: Math.cos(angle / 2),
    };
    expect(quaternionToYaw(q90)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('should accurately calculate Euclidean distance in meters', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 3, y: 4 };
    expect(calculateEuclideanDistance(p1, p2)).toBe(5);
  });
});
