import { createId } from "@/lib/id";
import type { Vec2 } from "@/model/units";
import { TYPE_TO_DEFINITION } from "@/model/objectDefs";
import type { ObjectDefinition } from "@/model/objectDefs";
import type { ObjectType, OpeningType, Venue, VenueObject, Wall, WallOpening } from "@/model/types";

export function createVenue(name = "Untitled Venue"): Venue {
  const now = new Date().toISOString();
  return {
    id: createId("venue"),
    name,
    unit: "m",
    gridSize: 1,
    showGrid: true,
    snapToGrid: true,
    background: "#0f1115",
    objects: [],
    walls: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createObject(
  type: ObjectType,
  position: Vec2,
  overrides: Partial<VenueObject> = {}
): VenueObject {
  const def: ObjectDefinition = TYPE_TO_DEFINITION[type];
  const z = overrides.z ?? nextZ();
  return {
    id: createId("obj"),
    type,
    position: { ...position },
    width: overrides.width ?? def.defaultWidth,
    height: overrides.height ?? def.defaultHeight,
    rotation: overrides.rotation ?? 0,
    z,
    locked: false,
    hidden: false,
    label: overrides.label ?? def.defaultLabel,
    definitionId: def.id,
    groupId: overrides.groupId,
    properties: { ...def.properties, ...(overrides.properties ?? {}) },
    style: { ...def.defaultStyle, ...(overrides.style ?? {}) },
    ...overrides
  };
}

let zCounter = 1;
export function nextZ(): number {
  zCounter += 1;
  return zCounter;
}

export function setZSeed(maxZ: number): void {
  zCounter = Math.max(zCounter, maxZ + 1);
}

export function createWall(start: Vec2, end: Vec2, z = 0): Wall {
  return {
    id: createId("wall"),
    start: { ...start },
    end: { ...end },
    thickness: 0.15,
    height: 3,
    z,
    locked: false,
    hidden: false,
    openings: [],
    properties: {},
    style: {
      fill: "#c9d2e0",
      stroke: "#8b97ab",
      strokeWidth: 0,
      fillOpacity: 1,
      labelColor: "#0f1115",
      dashed: false
    }
  };
}

export function createOpening(
  type: OpeningType,
  wallId: string,
  tOffset: number,
  width: number
): WallOpening {
  return {
    id: createId(type),
    type,
    wallId,
    tOffset,
    width,
    swing: "right",
    properties: {},
    style: {
      fill: type === "door" ? "#46d18a" : "#9fd0ff",
      stroke: type === "door" ? "#1f8f5f" : "#4f8cff",
      strokeWidth: 0.02,
      fillOpacity: 0.85,
      labelColor: "#0f1115",
      dashed: false
    }
  };
}

export function cloneObject(obj: VenueObject, offset: Vec2 = { x: 0.5, y: 0.5 }): VenueObject {
  return {
    ...obj,
    id: createId("obj"),
    position: { x: obj.position.x + offset.x, y: obj.position.y + offset.y },
    properties: { ...obj.properties },
    style: { ...obj.style },
    label: obj.label
  };
}

export function createSampleVenue(): Venue {
  const v = createVenue("Conference Hall A");
  setZSeed(50);
  const w1 = createWall({ x: -10, y: -7 }, { x: 10, y: -7 });
  const w2 = createWall({ x: 10, y: -7 }, { x: 10, y: 7 });
  const w3 = createWall({ x: 10, y: 7 }, { x: -10, y: 7 });
  const w4 = createWall({ x: -10, y: 7 }, { x: -10, y: -7 });
  w4.openings.push(createOpening("door", w4.id, 0.5, 1.4));
  w1.openings.push(createOpening("window", w1.id, 0.5, 3));
  v.walls.push(w1, w2, w3, w4);

  const stage = createObject("stage", { x: 0, y: -4.5 }, { width: 8, height: 3, label: "Main Stage" });
  v.objects.push(stage);

  for (let i = 0; i < 6; i++) {
    const booth = createObject("booth", { x: -8 + i * 3, y: 2 }, { label: `B${i + 1}` });
    (booth.properties as Record<string, unknown>).boothNumber = String(i + 1);
    v.objects.push(booth);
  }
  const table = createObject("table", { x: 0, y: 5 }, { label: "VIP Table" });
  v.objects.push(table);
  const chairN = createObject("chair", { x: 0, y: 4.2 }, {});
  v.objects.push(chairN);
  const zone = createObject("zone", { x: 0, y: 0.5 }, { width: 14, height: 5, label: "Exhibit Floor", z: 0 });
  (zone.properties as Record<string, unknown>).zoneType = "General";
  v.objects.push(zone);
  setZSeed(0);
  return v;
}

