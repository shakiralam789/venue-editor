import type { Vec2 } from "@/model/units";
import type { VenueObject } from "@/model/types";
import { degToRad, rotatePoint } from "@/lib/geometry";
import type { TransformState, ObjectTransformChange } from "@/commands/history";

export const MIN_SIZE = 0.2;

interface RoleAnchor {
  ax: number;
  ay: number;
  lockX: boolean;
  lockY: boolean;
}

const ROLE_TABLE: Record<string, RoleAnchor> = {
  se: { ax: -1, ay: -1, lockX: false, lockY: false },
  nw: { ax: 1, ay: 1, lockX: false, lockY: false },
  ne: { ax: -1, ay: 1, lockX: false, lockY: false },
  sw: { ax: 1, ay: -1, lockX: false, lockY: false },
  e: { ax: -1, ay: 0, lockX: false, lockY: true },
  w: { ax: 1, ay: 0, lockX: false, lockY: true },
  s: { ax: 0, ay: -1, lockX: true, lockY: false },
  n: { ax: 0, ay: 1, lockX: true, lockY: false }
};

function rotateOffset(offset: Vec2, rotationDeg: number): Vec2 {
  const a = degToRad(rotationDeg);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: offset.x * cos - offset.y * sin, y: offset.x * sin + offset.y * cos };
}

export interface ResizeOpts {
  aspect?: boolean;
  snapAngle?: number;
}

export function resizeRect(
  center: Vec2,
  rotation: number,
  width: number,
  height: number,
  role: string,
  pointer: Vec2,
  opts: ResizeOpts = {}
): { center: Vec2; width: number; height: number } {
  const rad = degToRad(-rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;

  const t = ROLE_TABLE[role] ?? ROLE_TABLE.se;
  const ax = t.ax * (width / 2);
  const ay = t.ay * (height / 2);
  const dirX = Math.sign(lx - ax) || 1;
  const dirY = Math.sign(ly - ay) || 1;

  let halfX = width / 2;
  let halfY = height / 2;
  let cx = 0;
  let cy = 0;

  if (t.lockX) {
    halfX = width / 2;
    cx = 0;
  } else {
    halfX = Math.max(MIN_SIZE / 2, Math.abs(lx - ax) / 2);
    cx = ax + dirX * halfX;
  }
  if (t.lockY) {
    halfY = height / 2;
    cy = 0;
  } else {
    halfY = Math.max(MIN_SIZE / 2, Math.abs(ly - ay) / 2);
    cy = ay + dirY * halfY;
  }

  if (opts.aspect) {
    const scaleX = halfX / (width / 2);
    const scaleY = halfY / (height / 2);
    const scale = Math.max(scaleX, scaleY);
    halfX = (width / 2) * scale;
    halfY = (height / 2) * scale;
    cx = t.lockX ? 0 : ax + dirX * halfX;
    cy = t.lockY ? 0 : ay + dirY * halfY;
  }

  const worldCenter = {
    x: center.x + rotateOffset({ x: cx, y: cy }, rotation).x,
    y: center.y + rotateOffset({ x: cx, y: cy }, rotation).y
  };
  return { center: worldCenter, width: halfX * 2, height: halfY * 2 };
}

export function rotateAt(pointer: Vec2, center: Vec2, snapAngle?: number): number {
  const angle = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  if (snapAngle && snapAngle > 0) {
    return Math.round(angle / snapAngle) * snapAngle;
  }
  return angle;
}

export function scaleObjectsToFrame(
  objs: VenueObject[],
  oldCenter: Vec2,
  newCenter: Vec2,
  scaleX: number,
  scaleY: number
): ObjectTransformChange[] {
  return objs.map((o) => ({
    id: o.id,
    before: {
      position: { ...o.position },
      width: o.width,
      height: o.height,
      rotation: o.rotation
    },
    after: {
      position: {
        x: newCenter.x + (o.position.x - oldCenter.x) * scaleX,
        y: newCenter.y + (o.position.y - oldCenter.y) * scaleY
      },
      width: Math.max(MIN_SIZE, o.width * scaleX),
      height: Math.max(MIN_SIZE, o.height * scaleY),
      rotation: o.rotation
    }
  }));
}

export function rotateObjectsAround(
  objs: VenueObject[],
  center: Vec2,
  deltaDeg: number
): ObjectTransformChange[] {
  return objs.map((o) => {
    const np = rotatePoint(o.position, center, deltaDeg);
    return {
      id: o.id,
      before: {
        position: { ...o.position },
        width: o.width,
        height: o.height,
        rotation: o.rotation
      },
      after: {
        position: np,
        width: o.width,
        height: o.height,
        rotation: o.rotation + deltaDeg
      }
    };
  });
}
