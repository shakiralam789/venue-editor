import { Container, Graphics } from "pixi.js";
import type { Wall } from "@/model/types";
import type { Vec2 } from "@/model/units";

function hex(color: string): number {
  return parseInt(color.replace("#", ""), 16);
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function drawWallView(container: Container, wall: Wall): void {
  container.removeChildren();
  const g = new Graphics();
  container.addChild(g);

  const { start, end } = wall;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const dir = { x: dx / len, y: dy / len };
  const normal = { x: -dir.y, y: dir.x };
  const t = wall.thickness;

  const c1 = { x: start.x + normal.x * (t / 2), y: start.y + normal.y * (t / 2) };
  const c2 = { x: end.x + normal.x * (t / 2), y: end.y + normal.y * (t / 2) };
  const c3 = { x: end.x - normal.x * (t / 2), y: end.y - normal.y * (t / 2) };
  const c4 = { x: start.x - normal.x * (t / 2), y: start.y - normal.y * (t / 2) };

  g.poly([c1.x, c1.y, c2.x, c2.y, c3.x, c3.y, c4.x, c4.y]);
  g.fill({ color: hex(wall.style.fill), alpha: wall.style.fillOpacity });
  g.stroke({ width: 0.01, color: hex(wall.style.stroke), alpha: 1 });

  const cutG = new Graphics();
  container.addChild(cutG);

  for (const op of wall.openings) {
    const center = lerp(start, end, op.tOffset);
    const half = op.width / 2;
    const p1 = { x: center.x - dir.x * half, y: center.y - dir.y * half };
    const p2 = { x: center.x + dir.x * half, y: center.y + dir.y * half };
    const o1 = { x: p1.x + normal.x * (t / 2), y: p1.y + normal.y * (t / 2) };
    const o2 = { x: p2.x + normal.x * (t / 2), y: p2.y + normal.y * (t / 2) };
    const o3 = { x: p2.x - normal.x * (t / 2), y: p2.y - normal.y * (t / 2) };
    const o4 = { x: p1.x - normal.x * (t / 2), y: p1.y - normal.y * (t / 2) };

    if (op.type === "window") {
      cutG.poly([o1.x, o1.y, o2.x, o2.y, o3.x, o3.y, o4.x, o4.y]);
      cutG.fill({ color: 0x0f1115, alpha: 0.85 });
      cutG.stroke({ width: 0.02, color: hex(op.style.stroke), alpha: 1 });
      cutG.rect(
        (o1.x + o4.x) / 2 - dir.x * half * 0.92,
        (o1.y + o4.y) / 2 - dir.y * half * 0.92,
        op.width * 0.92,
        0
      );
    } else {
      cutG.poly([o1.x, o1.y, o2.x, o2.y, o3.x, o3.y, o4.x, o4.y]);
      cutG.fill({ color: 0x0f1115, alpha: 0.9 });
      cutG.stroke({ width: 0.02, color: hex(op.style.stroke), alpha: 1 });
      const leafEnd =
        op.swing === "left"
          ? { x: p1.x - normal.x * t * 1.2, y: p1.y - normal.y * t * 1.2 }
          : { x: p2.x + normal.x * t * 1.2, y: p2.y + normal.y * t * 1.2 };
      cutG.moveTo(p1.x, p1.y).lineTo(leafEnd.x, leafEnd.y);
      cutG.stroke({ width: 0.03, color: hex(op.style.stroke), alpha: 1 });
      const arcCenter = op.swing === "left" ? p1 : p2;
      const radius = op.width;
      const a0 = Math.atan2(leafEnd.y - arcCenter.y, leafEnd.x - arcCenter.x);
      const a1 = Math.atan2(
        (op.swing === "left" ? p1 : p2).y - arcCenter.y,
        (op.swing === "left" ? p1 : p2).x - arcCenter.x
      );
      cutG.arc(arcCenter.x, arcCenter.y, radius, a0, a1);
      cutG.stroke({ width: 0.015, color: hex(op.style.stroke), alpha: 0.5 });
    }
  }

  container.alpha = wall.hidden ? 0.25 : 1;
  container.eventMode = "none";
}
