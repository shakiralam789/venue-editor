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
    thickness: 0.50,
    height: 6,
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
  const v = createVenue("Grand Expo Center");
  setZSeed(300);
  
  // Bigger venue: 60x40
  const w1 = createWall({ x: -30, y: -20 }, { x: 30, y: -20 });
  const w2 = createWall({ x: 30, y: -20 }, { x: 30, y: 20 });
  const w3 = createWall({ x: 30, y: 20 }, { x: -30, y: 20 });
  const w4 = createWall({ x: -30, y: 20 }, { x: -30, y: -20 });
  
  // Entrances and exits
  w4.openings.push(createOpening("door", w4.id, 0.3, 3));
  w4.openings.push(createOpening("door", w4.id, 0.7, 3));
  w2.openings.push(createOpening("door", w2.id, 0.5, 3)); 
  w1.openings.push(createOpening("window", w1.id, 0.2, 8));
  w1.openings.push(createOpening("window", w1.id, 0.5, 8));
  w1.openings.push(createOpening("window", w1.id, 0.8, 8));
  v.walls.push(w1, w2, w3, w4);

  // Main Stage
  const stage = createObject("stage", { x: 0, y: -15 }, { width: 16, height: 6, label: "Main Stage" });
  v.objects.push(stage);

  // Screen behind stage
  const screen = createObject("screen", { x: 0, y: -17.5 }, { width: 12, height: 0.5, label: "LED Wall" });
  v.objects.push(screen);

  // Speaker area (lectern)
  const lectern = createObject("counter", { x: -3, y: -13 }, { width: 1.5, height: 0.8, label: "Lectern" });
  v.objects.push(lectern);

  // VIP Zone
  const vipZone = createObject("zone", { x: -22, y: -12 }, { width: 14, height: 12, label: "VIP Area", z: 0 });
  (vipZone.properties as Record<string, unknown>).zoneType = "VIP";
  v.objects.push(vipZone);

  // VIP seating (Tables and Chairs)
  for (let i = 0; i < 4; i++) {
    const tx = -24 + (i % 2) * 5;
    const ty = -14 + Math.floor(i / 2) * 5;
    const vt = createObject("table", { x: tx, y: ty }, { label: `VIP T${i+1}` });
    v.objects.push(vt);
    v.objects.push(createObject("chair", { x: tx, y: ty - 1.2 }, { rotation: 0 }));
    v.objects.push(createObject("chair", { x: tx, y: ty + 1.2 }, { rotation: 180 }));
    v.objects.push(createObject("chair", { x: tx - 1.2, y: ty }, { rotation: -90 }));
    v.objects.push(createObject("chair", { x: tx + 1.2, y: ty }, { rotation: 90 }));
  }

  // General Seating Array
  const seatingZone = createObject("zone", { x: 0, y: -3 }, { width: 24, height: 12, label: "Audience Seating", z: 0 });
  v.objects.push(seatingZone);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 14; c++) {
      const chair = createObject("chair", { x: -9.75 + c * 1.5, y: -7.5 + r * 1.5 }, { label: `Row ${r+1} Seat ${c+1}` });
      v.objects.push(chair);
    }
  }

  // Exhibit Hall (Booths)
  const exhibitZone = createObject("zone", { x: 0, y: 12 }, { width: 56, height: 14, label: "Exhibit Hall", z: 0 });
  v.objects.push(exhibitZone);
  
  let boothNum = 1;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 16; i++) {
      const booth = createObject("booth", { x: -22.5 + i * 3, y: 9 + r * 6 }, { label: `B${boothNum}` });
      (booth.properties as Record<string, unknown>).boothNumber = String(boothNum);
      v.objects.push(booth);
      boothNum++;
    }
  }

  // Food Area
  const foodZone = createObject("food_area", { x: 22, y: -12 }, { width: 14, height: 12, label: "Catering", z: 0 });
  v.objects.push(foodZone);
  const foodCounter1 = createObject("counter", { x: 22, y: -16 }, { width: 6, height: 1, label: "Buffet" });
  const foodCounter2 = createObject("counter", { x: 27, y: -12 }, { width: 1, height: 6, label: "Drinks" });
  v.objects.push(foodCounter1, foodCounter2);

  // Aisles
  const aisle = createObject("aisle", { x: 0, y: 4.5 }, { width: 58, height: 2, label: "Main Aisle", z: 1 });
  v.objects.push(aisle);

  setZSeed(0);
  return v;
}

