import type { Venue, VenueObject } from "@/model/types";
import { rotatedRectBounds } from "@/lib/geometry";
import type { Command } from "@/commands/history";
import { clone } from "@/commands/history";

function aabb(o: VenueObject) {
  return rotatedRectBounds(
    { x: o.position.x - o.width / 2, y: o.position.y - o.height / 2, width: o.width, height: o.height },
    o.rotation,
    o.position
  );
}

export type AlignMode = "left" | "centerH" | "right" | "top" | "middleV" | "bottom";
export type ZOrderAction = "forward" | "backward" | "front" | "back";

export function alignObjects(venue: Venue, ids: string[], mode: AlignMode): Command | null {
  const objs = venue.objects.filter((o) => ids.includes(o.id));
  if (objs.length < 2) return null;
  const boxes = objs.map((o) => ({ o, b: aabb(o) }));
  let target = 0;
  if (mode === "left") target = Math.min(...boxes.map((x) => x.b.x));
  if (mode === "right") target = Math.max(...boxes.map((x) => x.b.x + x.b.width));
  if (mode === "top") target = Math.min(...boxes.map((x) => x.b.y));
  if (mode === "bottom") target = Math.max(...boxes.map((x) => x.b.y + x.b.height));
  if (mode === "centerH") target = boxes.reduce((s, x) => s + (x.b.x + x.b.width / 2), 0) / boxes.length;
  if (mode === "middleV") target = boxes.reduce((s, x) => s + (x.b.y + x.b.height / 2), 0) / boxes.length;

  const changes = boxes.map(({ o, b }) => {
    const before = { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation };
    const after = clone(before);
    if (mode === "left") after.position.x += target - b.x - o.width / 2;
    if (mode === "right") after.position.x += target - (b.x + b.width) + o.width / 2;
    if (mode === "centerH") after.position.x += target - (b.x + b.width / 2);
    if (mode === "top") after.position.y += target - b.y - o.height / 2;
    if (mode === "bottom") after.position.y += target - (b.y + b.height) + o.height / 2;
    if (mode === "middleV") after.position.y += target - (b.y + b.height / 2);
    return { id: o.id, before, after };
  });
  return { kind: "TRANSFORM_OBJECTS", changes };
}

export function distributeObjects(venue: Venue, ids: string[], axis: "h" | "v"): Command | null {
  const objs = venue.objects.filter((o) => ids.includes(o.id));
  if (objs.length < 3) return null;
  const boxes = objs.map((o) => ({ o, b: aabb(o) }));
  if (axis === "h") {
    boxes.sort((a, b) => a.b.x - b.b.x);
    const first = boxes[0].b.x + boxes[0].b.width / 2;
    const last = boxes[boxes.length - 1].b.x + boxes[boxes.length - 1].b.width / 2;
    const step = (last - first) / (boxes.length - 1);
    const changes = boxes.map(({ o, b }, i) => {
      const before = { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation };
      const after = clone(before);
      after.position.x += first + step * i - (b.x + b.width / 2);
      return { id: o.id, before, after };
    });
    return { kind: "TRANSFORM_OBJECTS", changes };
  } else {
    boxes.sort((a, b) => a.b.y - b.b.y);
    const first = boxes[0].b.y + boxes[0].b.height / 2;
    const last = boxes[boxes.length - 1].b.y + boxes[boxes.length - 1].b.height / 2;
    const step = (last - first) / (boxes.length - 1);
    const changes = boxes.map(({ o, b }, i) => {
      const before = { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation };
      const after = clone(before);
      after.position.y += first + step * i - (b.y + b.height / 2);
      return { id: o.id, before, after };
    });
    return { kind: "TRANSFORM_OBJECTS", changes };
  }
}

export function zOrder(venue: Venue, ids: string[], action: ZOrderAction): Command | null {
  if (ids.length === 0) return null;
  const maxZ = venue.objects.reduce((m, o) => Math.max(m, o.z), 0);
  const minZ = venue.objects.reduce((m, o) => Math.min(m, o.z), 0);
  const changes = venue.objects
    .filter((o) => ids.includes(o.id))
    .map((o) => {
      const beforeZ = o.z;
      let afterZ = beforeZ;
      if (action === "forward") afterZ = beforeZ + 1;
      if (action === "backward") afterZ = beforeZ - 1;
      if (action === "front") afterZ = maxZ + 1;
      if (action === "back") afterZ = minZ - 1;
      return { id: o.id, beforeZ, afterZ };
    });
  return { kind: "Z_ORDER", changes };
}
