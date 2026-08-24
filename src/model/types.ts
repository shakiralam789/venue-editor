import type { Unit, Vec2 } from "@/model/units";

export type ObjectType =
  | "table"
  | "chair"
  | "sofa"
  | "stage"
  | "booth"
  | "counter"
  | "registration_desk"
  | "speaker"
  | "screen"
  | "light"
  | "camera"
  | "wall"
  | "aisle"
  | "corridor"
  | "stairs"
  | "zone"
  | "restroom"
  | "food_area"
  | "emergency_exit"
  | "entrance"
  | "custom";

export type ObjectCategory =
  | "Furniture"
  | "Event"
  | "Infrastructure"
  | "Navigation"
  | "Zones"
  | "Facilities"
  | "Custom";

export interface ObjectStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillOpacity: number;
  labelColor: string;
  dashed: boolean;
}

export interface VenueObject {
  id: string;
  type: ObjectType;
  position: Vec2;
  width: number;
  height: number;
  rotation: number;
  z: number;
  locked: boolean;
  hidden: boolean;
  label?: string;
  definitionId?: string;
  groupId?: string;
  properties: Record<string, unknown>;
  style: ObjectStyle;
}

export type OpeningType = "door" | "window";

export interface WallOpening {
  id: string;
  type: OpeningType;
  wallId: string;
  tOffset: number;
  width: number;
  swing: "left" | "right" | "none";
  properties: Record<string, unknown>;
  style: ObjectStyle;
}

export interface Wall {
  id: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  z: number;
  locked: boolean;
  hidden: boolean;
  openings: WallOpening[];
  properties: Record<string, unknown>;
  style: ObjectStyle;
}

export type SelectionKind = "object" | "wall" | "opening";

export interface SelectionTarget {
  kind: SelectionKind;
  id: string;
  wallId?: string;
}

export interface Venue {
  id: string;
  name: string;
  unit: Unit;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  background: string;
  objects: VenueObject[];
  walls: Wall[];
  createdAt: string;
  updatedAt: string;
}
