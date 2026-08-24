import type { Vec2 } from "@/model/units";
import type { Venue } from "@/model/types";
import { snapPointToObjects, snapPointToGrid } from "@/lib/geometry";

const SNAP_PX = 8;

export interface SnapContext {
  targets: Vec2[];
  thresholdWorld: number;
  gridSize: number;
  snapToGrid: boolean;
}

export class SnapManager {
  buildContext(venue: Venue, excludeIds: Set<string>, scale: number): SnapContext {
    const targets: Vec2[] = [];
    for (const o of venue.objects) {
      if (excludeIds.has(o.id)) continue;
      targets.push({ ...o.position });
      targets.push({ x: o.position.x - o.width / 2, y: o.position.y });
      targets.push({ x: o.position.x + o.width / 2, y: o.position.y });
      targets.push({ x: o.position.x, y: o.position.y - o.height / 2 });
      targets.push({ x: o.position.x, y: o.position.y + o.height / 2 });
    }
    for (const w of venue.walls) {
      targets.push({ ...w.start }, { ...w.end });
      targets.push({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 });
    }
    return {
      targets,
      thresholdWorld: SNAP_PX / scale,
      gridSize: venue.gridSize,
      snapToGrid: venue.snapToGrid
    };
  }

  snap(point: Vec2, ctx: SnapContext): { point: Vec2; guides: { x?: number; y?: number }[] } {
    let result = { ...point };
    const guides: { x?: number; y?: number }[] = [];
    if (ctx.snapToGrid) {
      result = snapPointToGrid(result, ctx.gridSize);
    }
    const objSnap = snapPointToObjects(result, ctx.targets, ctx.thresholdWorld);
    if (objSnap.snappedX) {
      result.x = objSnap.point.x;
      guides.push({ x: objSnap.guideX });
    }
    if (objSnap.snappedY) {
      result.y = objSnap.point.y;
      guides.push({ y: objSnap.guideY });
    }
    return { point: result, guides };
  }
}
