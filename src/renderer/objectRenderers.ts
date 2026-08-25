import { Container, Graphics, Text, Sprite, Texture } from "pixi.js";
import type { VenueObject } from "@/model/types";
import { assetIdForType } from "@/model/objectDefs";
import { AssetManager } from "@/renderer/assets/AssetManager";

const LABEL_FILL = 0xe6e9ef;

function hex(color: string): number {
  return parseInt(color.replace("#", ""), 16);
}

function getOrCreateChild<T extends Container>(parent: Container, label: string, ctor: () => T): T {
  const existing = parent.children.find((c) => c.label === label);
  if (existing) return existing as T;
  const child = ctor();
  child.label = label;
  parent.addChild(child);
  return child;
}

function drawDashedRect(g: Graphics, x: number, y: number, w: number, h: number, dash = 0.15) {
  const edges = [
    [
      { x, y },
      { x: x + w, y }
    ],
    [
      { x: x + w, y },
      { x: x + w, y: y + h }
    ],
    [
      { x: x + w, y: y + h },
      { x, y: y + h }
    ],
    [
      { x, y: y + h },
      { x, y }
    ]
  ];
  for (const [a, b] of edges) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(len / dash));
    for (let i = 0; i < steps; i += 2) {
      const t0 = i / steps;
      const t1 = Math.min(1, (i + 1) / steps);
      g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
      g.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
    }
  }
}

function baseFill(obj: VenueObject, g: Graphics, w: number, h: number) {
  const s = obj.style;
  g.roundRect(-w / 2, -h / 2, w, h, Math.min(0.1, w / 10, h / 10));
  g.fill({ color: hex(s.fill), alpha: s.fillOpacity });
  if (s.dashed) {
    drawDashedRect(g, -w / 2, -h / 2, w, h);
    g.stroke({ width: s.strokeWidth, color: hex(s.stroke), alpha: 1 });
  } else {
    g.stroke({ width: s.strokeWidth, color: hex(s.stroke), alpha: 1 });
  }
}

const TYPE_DRAW: Record<string, (g: Graphics, obj: VenueObject, w: number, h: number) => void> = {
  table(g, obj, w, h) {
    baseFill(obj, g, w, h);
    const seats = Number(obj.properties.seats ?? 4);
    const r = Math.min(w, h) * 0.18;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      g.circle(Math.cos(a) * w * 0.32, Math.sin(a) * h * 0.32, r);
    }
    g.fill({ color: 0x000000, alpha: 0.18 });
  },
  chair(g, obj, w, h) {
    g.roundRect(-w / 2, -h / 2, w, h, 0.06);
    g.fill({ color: hex(obj.style.fill), alpha: obj.style.fillOpacity });
    g.stroke({ width: obj.style.strokeWidth, color: hex(obj.style.stroke) });
    g.roundRect(-w / 2 + w * 0.15, -h / 2, w * 0.25, h * 0.9, 0.04);
    g.fill({ color: 0x000000, alpha: 0.22 });
  },
  sofa(g, obj, w, h) {
    baseFill(obj, g, w, h);
    g.roundRect(-w / 2 + 0.1, -h / 2 + 0.1, w - 0.2, h * 0.35, 0.08);
    g.fill({ color: 0x000000, alpha: 0.15 });
  },
  stage(g, obj, w, h) {
    baseFill(obj, g, w, h);
    g.moveTo(-w / 2 + 0.2, -h / 2 + 0.2);
    g.lineTo(w / 2 - 0.2, h / 2 - 0.2);
    g.moveTo(w / 2 - 0.2, -h / 2 + 0.2);
    g.lineTo(-w / 2 + 0.2, h / 2 - 0.2);
    g.stroke({ width: 0.03, color: 0xa08a4a, alpha: 0.6 });
  },
  booth(g, obj, w, h) {
    baseFill(obj, g, w, h);
    g.rect(-w / 2, -h / 2, w, h * 0.12);
    g.fill({ color: hex(obj.style.stroke), alpha: 0.5 });
  },
  counter(g, obj, w, h) {
    baseFill(obj, g, w, h);
  },
  registration_desk(g, obj, w, h) {
    baseFill(obj, g, w, h);
  },
  speaker(g, obj, w, h) {
    g.circle(0, 0, Math.min(w, h) / 2);
    g.fill({ color: hex(obj.style.fill) });
    g.stroke({ width: obj.style.strokeWidth, color: hex(obj.style.stroke) });
    g.circle(0, 0, Math.min(w, h) / 6);
    g.fill({ color: 0x000000, alpha: 0.4 });
  },
  screen(g, obj, w, h) {
    g.rect(-w / 2, -h / 2, w, h);
    g.fill({ color: hex(obj.style.fill) });
    g.stroke({ width: obj.style.strokeWidth, color: hex(obj.style.stroke) });
    g.rect(-w / 2 + 0.1, -h / 2 + 0.02, w - 0.2, h - 0.04);
    g.fill({ color: 0x4f8cff, alpha: 0.6 });
  },
  light(g, obj, w, h) {
    g.circle(0, 0, Math.min(w, h) / 2);
    g.fill({ color: hex(obj.style.fill) });
    g.stroke({ width: obj.style.strokeWidth, color: hex(obj.style.stroke) });
  },
  camera(g, obj, w, h) {
    g.roundRect(-w / 2, -h / 2, w, h, 0.08);
    g.fill({ color: hex(obj.style.fill) });
    g.stroke({ width: obj.style.strokeWidth, color: hex(obj.style.stroke) });
    g.circle(w / 4, 0, Math.min(w, h) * 0.25);
    g.fill({ color: 0x000000, alpha: 0.5 });
  },
  aisle: (g, obj, w, h) => baseFill(obj, g, w, h),
  corridor: (g, obj, w, h) => baseFill(obj, g, w, h),
  stairs(g, obj, w, h) {
    baseFill(obj, g, w, h);
    const n = 5;
    for (let i = 1; i < n; i++) {
      const y = -h / 2 + (h / n) * i;
      g.moveTo(-w / 2 + 0.1, y);
      g.lineTo(w / 2 - 0.1, y);
    }
    g.stroke({ width: 0.02, color: 0x000000, alpha: 0.4 });
  },
  zone(g, obj, w, h) {
    g.rect(-w / 2, -h / 2, w, h);
    g.fill({ color: hex(obj.style.fill), alpha: obj.style.fillOpacity });
    drawDashedRect(g, -w / 2, -h / 2, w, h, 0.3);
    g.stroke({ width: obj.style.strokeWidth + 0.02, color: hex(obj.style.stroke), alpha: 1 });
  },
  restroom: (g, obj, w, h) => baseFill(obj, g, w, h),
  food_area: (g, obj, w, h) => baseFill(obj, g, w, h),
  emergency_exit(g, obj, w, h) {
    baseFill(obj, g, w, h);
    g.poly([0, -h / 4, w / 4, h / 6, -w / 4, h / 6]);
    g.fill({ color: 0xff5d5d, alpha: 0.9 });
  },
  entrance(g, obj, w, h) {
    baseFill(obj, g, w, h);
    g.poly([0, -h / 4, w / 4, h / 6, -w / 4, h / 6]);
    g.fill({ color: 0x46d18a, alpha: 0.9 });
  },
  custom: (g, obj, w, h) => baseFill(obj, g, w, h)
};

function drawFallback(g: Graphics, obj: VenueObject, w: number, h: number) {
  g.clear();
  const draw = TYPE_DRAW[obj.type] ?? ((gg: Graphics, o: VenueObject, ww: number, hh: number) => baseFill(o, gg, ww, hh));
  draw(g, obj, w, h);
}

export function drawObjectView(container: Container, obj: VenueObject, worldScale = 1): void {
  const w = obj.width;
  const h = obj.height;
  const shape = getOrCreateChild(container, "shape", () => new Graphics());

  const assetId = assetIdForType(obj.type);

  if (assetId) {
    let sprite = container.children.find((c) => c.label === "asset") as Sprite | undefined;
    if (!sprite) {
      sprite = new Sprite(Texture.EMPTY);
      sprite.label = "asset";
      sprite.anchor.set(0.5);
      container.addChild(sprite);
    }
    const loaded = (sprite as unknown as { __assetId?: string }).__assetId === assetId && sprite.texture !== Texture.EMPTY;
    if (loaded) {
      sprite.width = w;
      sprite.height = h;
      sprite.visible = true;
      shape.visible = false;
    } else {
      shape.visible = true;
      drawFallback(shape, obj, w, h);
      const target = sprite;
      AssetManager.get(assetId)
        .then((tex) => {
          if (target.destroyed) return;
          (target as unknown as { __assetId?: string }).__assetId = assetId;
          target.texture = tex;
          target.width = w;
          target.height = h;
          target.visible = true;
          shape.visible = false;
        })
        .catch(() => {
          /* keep geometric fallback */
        });
    }
  } else {
    const existing = container.children.find((c) => c.label === "asset") as Sprite | undefined;
    if (existing) existing.destroy();
    shape.visible = true;
    drawFallback(shape, obj, w, h);
  }

  container.position.set(obj.position.x, obj.position.y);
  container.rotation = (obj.rotation * Math.PI) / 180;
  container.alpha = obj.hidden ? 0.25 : 1;
  container.eventMode = "none";

  const existing = container.children.find((c) => c.label === "label");
  if (existing) existing.destroy();
  const existingBg = container.children.find((c) => c.label === "labelBg");
  if (existingBg) existingBg.destroy();
}
