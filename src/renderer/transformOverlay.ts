import { Container, Graphics, Text } from "pixi.js";
import type { Vec2 } from "@/model/units";
import type { Unit } from "@/model/units";
import { formatLength } from "@/model/units";
import type { Wall } from "@/model/types";
import { rotatePoint } from "@/lib/geometry";

export interface TransformFrame {
  center: Vec2;
  rotation: number;
  width: number;
  height: number;
}

export type HandleRole = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export interface Handle {
  role: HandleRole;
  x: number;
  y: number;
}

const ACCENT = 0x4f8cff;
const HANDLE_PX = 9;
const ROT_OFFSET_PX = 28;

export function handlePositions(frame: TransformFrame, scale: number): Handle[] {
  const { center, rotation, width: w, height: h } = frame;
  const hw = w / 2;
  const hh = h / 2;
  const local: Record<Exclude<HandleRole, "rotate">, Vec2> = {
    nw: { x: -hw, y: -hh },
    n: { x: 0, y: -hh },
    ne: { x: hw, y: -hh },
    e: { x: hw, y: 0 },
    se: { x: hw, y: hh },
    s: { x: 0, y: hh },
    sw: { x: -hw, y: hh },
    w: { x: -hw, y: 0 }
  };
  const handles: Handle[] = [];
  for (const role of Object.keys(local) as Exclude<HandleRole, "rotate">[]) {
    const p = local[role];
    const rotated = rotatePoint({ x: center.x + p.x, y: center.y + p.y }, center, rotation);
    handles.push({ role, x: rotated.x, y: rotated.y });
  }
  const topMid = rotatePoint({ x: center.x, y: center.y - hh }, center, rotation);
  const up = rotatePoint({ x: center.x, y: center.y - hh - ROT_OFFSET_PX / scale }, center, rotation);
  const dir = { x: up.x - topMid.x, y: up.y - topMid.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  handles.push({
    role: "rotate",
    x: topMid.x + (dir.x / len) * (ROT_OFFSET_PX / scale),
    y: topMid.y + (dir.y / len) * (ROT_OFFSET_PX / scale)
  });
  return handles;
}

export class TransformOverlay {
  container: Container;
  private g: Graphics;
  private measure: Text;
  private rotLabel: Text;

  constructor() {
    this.container = new Container();
    this.container.eventMode = "none";
    this.g = new Graphics();
    this.measure = new Text({ text: "", style: { fill: 0xe6e9ef, fontSize: 0.3, fontFamily: "Inter" } });
    this.measure.anchor.set(0.5, 1);
    this.rotLabel = new Text({ text: "", style: { fill: 0x4f8cff, fontSize: 0.3, fontFamily: "Inter" } });
    this.rotLabel.anchor.set(0.5, 1);
    this.container.addChild(this.g, this.measure, this.rotLabel);
  }

  clear(): void {
    this.g.clear();
    this.measure.visible = false;
    this.rotLabel.visible = false;
  }

  drawFrame(frame: TransformFrame, scale: number, unit: Unit, opts: { rotation: boolean }): void {
    this.g.clear();
    const { center, rotation, width: w, height: h } = frame;
    const corners = [
      rotatePoint({ x: center.x - w / 2, y: center.y - h / 2 }, center, rotation),
      rotatePoint({ x: center.x + w / 2, y: center.y - h / 2 }, center, rotation),
      rotatePoint({ x: center.x + w / 2, y: center.y + h / 2 }, center, rotation),
      rotatePoint({ x: center.x - w / 2, y: center.y + h / 2 }, center, rotation)
    ];
    this.g.poly(corners.flatMap((c) => [c.x, c.y]));
    this.g.stroke({ width: 1.5 / scale, color: ACCENT, alpha: 1 });

    const handles = handlePositions(frame, scale);
    const hs = HANDLE_PX / scale;
    for (const hd of handles) {
      if (hd.role === "rotate") {
        const top = rotatePoint({ x: center.x, y: center.y - h / 2 }, center, rotation);
        this.g.moveTo(top.x, top.y).lineTo(hd.x, hd.y);
        this.g.stroke({ width: 1.2 / scale, color: ACCENT, alpha: 1 });
        this.g.circle(hd.x, hd.y, hs * 0.7);
        this.g.fill({ color: 0x0f1115 });
        this.g.stroke({ width: 1.5 / scale, color: ACCENT, alpha: 1 });
      } else {
        this.g.rect(hd.x - hs / 2, hd.y - hs / 2, hs, hs);
        this.g.fill({ color: 0x0f1115 });
        this.g.stroke({ width: 1.5 / scale, color: ACCENT, alpha: 1 });
      }
    }

    this.measure.visible = true;
    this.measure.text = `${formatLength(w, unit)} × ${formatLength(h, unit)}`;
    this.measure.position.set(center.x, center.y - h / 2 - ROT_OFFSET_PX / scale - 0.4);
    this.measure.style.fontSize = 0.32;

    if (opts.rotation && rotation !== 0) {
      this.rotLabel.visible = true;
      this.rotLabel.text = `${Math.round(rotation)}°`;
      this.rotLabel.position.set(center.x, center.y + h / 2 + 0.5);
    } else {
      this.rotLabel.visible = false;
    }
  }

  drawWall(wall: Wall, scale: number): void {
    this.g.clear();
    this.measure.visible = false;
    this.rotLabel.visible = false;
    const { start, end } = wall;
    this.g.moveTo(start.x, start.y).lineTo(end.x, end.y);
    this.g.stroke({ width: 2 / scale, color: ACCENT, alpha: 1 });
    const r = 7 / scale;
    for (const p of [start, end]) {
      this.g.circle(p.x, p.y, r);
      this.g.fill({ color: 0x0f1115 });
      this.g.stroke({ width: 1.5 / scale, color: ACCENT, alpha: 1 });
    }
  }

  drawGuides(guides: { x?: number; y?: number }[], scale: number, width: number, height: number): void {
    for (const g of guides) {
      if (g.x !== undefined) {
        this.g.moveTo(g.x, 0).lineTo(g.x, height / scale);
        this.g.stroke({ width: 1 / scale, color: 0x46d18a, alpha: 0.9 });
      }
      if (g.y !== undefined) {
        this.g.moveTo(0, g.y).lineTo(width / scale, g.y);
        this.g.stroke({ width: 1 / scale, color: 0x46d18a, alpha: 0.9 });
      }
    }
  }

  drawMarquee(rect: { x: number; y: number; width: number; height: number }, scale: number): void {
    this.g.clear();
    this.g.rect(rect.x, rect.y, rect.width, rect.height);
    this.g.fill({ color: ACCENT, alpha: 0.1 });
    this.g.stroke({ width: 1 / scale, color: ACCENT, alpha: 0.8 });
  }
}
