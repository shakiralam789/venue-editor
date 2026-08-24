import { Graphics } from "pixi.js";
import type { Camera } from "@/lib/geometry";

export const MAJOR_EVERY = 5;

export function drawGrid(
  g: Graphics,
  camera: Camera,
  width: number,
  height: number,
  gridSize: number,
  showGrid: boolean,
  background: string
): void {
  g.clear();
  if (!showGrid || gridSize <= 0) return;
  const scale = camera.scale;
  const worldLeft = camera.x;
  const worldTop = camera.y;
  const worldRight = camera.x + width / scale;
  const worldBottom = camera.y + height / scale;

  const startX = Math.floor(worldLeft / gridSize) * gridSize;
  const startY = Math.floor(worldTop / gridSize) * gridSize;

  const minorColor = background === "#0f1115" ? 0x232838 : 0x2a2f3a;
  const majorColor = background === "#0f1115" ? 0x333a4d : 0x3a4150;

  for (let x = startX; x <= worldRight; x += gridSize) {
    const sx = (x - camera.x) * scale;
    const isMajor = Math.round(x / gridSize) % MAJOR_EVERY === 0;
    g.moveTo(sx, 0).lineTo(sx, height);
    g.stroke({ width: 1, color: isMajor ? majorColor : minorColor, alpha: 1 });
  }
  for (let y = startY; y <= worldBottom; y += gridSize) {
    const sy = (y - camera.y) * scale;
    const isMajor = Math.round(y / gridSize) % MAJOR_EVERY === 0;
    g.moveTo(0, sy).lineTo(width, sy);
    g.stroke({ width: 1, color: isMajor ? majorColor : minorColor, alpha: 1 });
  }
}
