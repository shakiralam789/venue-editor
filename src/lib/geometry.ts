import type { Vec2 } from "@/model/units";
import { Unit, UNIT_METERS } from "@/model/units";

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 8;
export const MAX_SCALE = 400;

export function worldToScreen(camera: Camera, p: Vec2): Vec2 {
  return {
    x: (p.x - camera.x) * camera.scale,
    y: (p.y - camera.y) * camera.scale
  };
}

export function screenToWorld(camera: Camera, p: Vec2): Vec2 {
  return {
    x: p.x / camera.scale + camera.x,
    y: p.y / camera.scale + camera.y
  };
}

export function zoomToward(camera: Camera, screenPoint: Vec2, factor: number): Camera {
  const newScale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
  const worldUnder = screenToWorld(camera, screenPoint);
  return {
    scale: newScale,
    x: worldUnder.x - screenPoint.x / newScale,
    y: worldUnder.y - screenPoint.y / newScale
  };
}

export function panCamera(camera: Camera, screenDelta: Vec2): Camera {
  return {
    ...camera,
    x: camera.x - screenDelta.x / camera.scale,
    y: camera.y - screenDelta.y / camera.scale
  };
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function rotatePoint(p: Vec2, center: Vec2, angleDeg: number): Vec2 {
  const a = degToRad(angleDeg);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectFromTwoPoints(a: Vec2, b: Vec2): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  };
}

export function rectCenter(r: Rect): Vec2 {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function rectContainsPoint(r: Rect, p: Vec2): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function cornersOfRect(r: Rect): Vec2[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height }
  ];
}

export function rotatedCorners(r: Rect, rotationDeg: number, center: Vec2): Vec2[] {
  return cornersOfRect(r).map((c) => rotatePoint(c, center, rotationDeg));
}

export function rotatedRectBounds(r: Rect, rotationDeg: number, center: Vec2): Rect {
  const pts = rotatedCorners(r, rotationDeg, center);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(p: Vec2, gridSize: number): Vec2 {
  return {
    x: snapToGrid(p.x, gridSize),
    y: snapToGrid(p.y, gridSize)
  };
}

export function snapAngle(angleDeg: number, stepDeg: number): number {
  return Math.round(angleDeg / stepDeg) * stepDeg;
}

export interface SnapResult {
  point: Vec2;
  snappedX: boolean;
  snappedY: boolean;
  guideX?: number;
  guideY?: number;
}

export function snapPointToObjects(
  p: Vec2,
  targets: Vec2[],
  thresholdWorld: number
): SnapResult {
  let best: SnapResult = { point: { ...p }, snappedX: false, snappedY: false };
  let bestDist = thresholdWorld;
  for (const t of targets) {
    const dx = Math.abs(p.x - t.x);
    const dy = Math.abs(p.y - t.y);
    if (dx < bestDist) {
      bestDist = dx;
      best = { point: { x: t.x, y: p.y }, snappedX: true, snappedY: false, guideX: t.x };
    }
    if (dy < bestDist) {
      bestDist = dy;
      best = { point: { x: p.x, y: t.y }, snappedX: false, snappedY: true, guideY: t.y };
    }
  }
  return best;
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function projectPointOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return { point: { ...a }, t: 0 };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = clamp(t, 0, 1);
  return {
    point: { x: a.x + abx * t, y: a.y + aby * t },
    t
  };
}

export function metersToUnit(meters: number, unit: Unit): number {
  return meters / UNIT_METERS[unit];
}
