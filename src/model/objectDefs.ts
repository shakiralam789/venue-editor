import type { ObjectCategory, ObjectStyle, ObjectType } from "@/model/types";

export interface Object3DDefinition {
  model?: string;
  height: number;
  depth?: number;
  material?: string;
  scale?: number;
  anchor?: { x: number; y: number };
}

export interface ObjectDefinition {
  id: string;
  type: ObjectType;
  category: ObjectCategory;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  rotate: boolean;
  resizable: boolean;
  defaultLabel?: string;
  defaultStyle: ObjectStyle;
  properties?: Record<string, unknown>;
  threeD?: Object3DDefinition;
  /** Optional 2D top-down asset used by the renderer instead of primitives. */
  assetId?: string;
}

export const DEFAULT_STYLE: ObjectStyle = {
  fill: "#2b3340",
  stroke: "#5b6b80",
  strokeWidth: 0.04,
  fillOpacity: 0.9,
  labelColor: "#e6e9ef",
  dashed: false
};

function style(partial: Partial<ObjectStyle>): ObjectStyle {
  return { ...DEFAULT_STYLE, ...partial };
}

export const OBJECT_DEFINITIONS: ObjectDefinition[] = [
  {
    id: "def_table",
    type: "table",
    category: "Furniture",
    name: "Table",
    defaultWidth: 1.8,
    defaultHeight: 0.9,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#3a4a5a", stroke: "#6f8aa6" }),
    properties: { seats: 4, shape: "rectangle" },
    threeD: { model: "table", height: 0.75, material: "wood" }
  },
  {
    id: "def_chair",
    type: "chair",
    category: "Furniture",
    name: "Chair",
    defaultWidth: 0.5,
    defaultHeight: 0.5,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#46566a", stroke: "#7d93ab" }),
    properties: { seatHeight: 0.45 },
    threeD: { model: "chair", height: 0.9, material: "fabric" }
  },
  {
    id: "def_sofa",
    type: "sofa",
    category: "Furniture",
    name: "Sofa",
    defaultWidth: 2.0,
    defaultHeight: 0.9,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#4a4658", stroke: "#827ba0" }),
    properties: { seats: 3 },
    threeD: { model: "sofa", height: 0.85, material: "fabric" }
  },
  {
    id: "def_stage",
    type: "stage",
    category: "Event",
    name: "Stage",
    defaultWidth: 6,
    defaultHeight: 4,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#3d3a2e", stroke: "#a08a4a" }),
    properties: { height: 0.6 },
    threeD: { model: "stage", height: 0.6, material: "wood" }
  },
  {
    id: "def_booth",
    type: "booth",
    category: "Event",
    name: "Booth",
    defaultWidth: 3,
    defaultHeight: 3,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#243447", stroke: "#4f8cff" }),
    properties: { boothNumber: "1", price: 0, status: "available" },
    threeD: { model: "booth", height: 2.4, material: "panel" }
  },
  {
    id: "def_counter",
    type: "counter",
    category: "Event",
    name: "Counter",
    defaultWidth: 2,
    defaultHeight: 0.8,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#3a4a4a", stroke: "#6f9a9a" }),
    threeD: { model: "counter", height: 1.1, material: "laminate" }
  },
  {
    id: "def_registration_desk",
    type: "registration_desk",
    category: "Event",
    name: "Registration Desk",
    defaultWidth: 3,
    defaultHeight: 1,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#33414d", stroke: "#5fa0c0" }),
    threeD: { model: "desk", height: 1.1, material: "laminate" }
  },
  {
    id: "def_speaker",
    type: "speaker",
    category: "Event",
    name: "Speaker",
    defaultWidth: 0.4,
    defaultHeight: 0.4,
    rotate: true,
    resizable: false,
    defaultStyle: style({ fill: "#222", stroke: "#888" }),
    threeD: { model: "speaker", height: 1.0, material: "metal" }
  },
  {
    id: "def_screen",
    type: "screen",
    category: "Event",
    name: "Screen",
    defaultWidth: 4,
    defaultHeight: 0.1,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#11141a", stroke: "#4f8cff" }),
    threeD: { model: "screen", height: 2.2, material: "led" }
  },
  {
    id: "def_light",
    type: "light",
    category: "Event",
    name: "Light",
    defaultWidth: 0.3,
    defaultHeight: 0.3,
    rotate: false,
    resizable: false,
    defaultStyle: style({ fill: "#fff2c0", stroke: "#ffb454" }),
    threeD: { model: "light", height: 3, material: "metal" }
  },
  {
    id: "def_camera",
    type: "camera",
    category: "Event",
    name: "Camera",
    defaultWidth: 0.5,
    defaultHeight: 0.5,
    rotate: true,
    resizable: false,
    defaultStyle: style({ fill: "#1a1a1a", stroke: "#999" }),
    threeD: { model: "camera", height: 1.5, material: "metal" }
  },
  {
    id: "def_aisle",
    type: "aisle",
    category: "Navigation",
    name: "Aisle",
    defaultWidth: 2,
    defaultHeight: 8,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#1b2230", stroke: "#3a6fd8", dashed: true, fillOpacity: 0.35 }),
    properties: { accessible: false },
    threeD: { model: "floor_mark", height: 0.01, material: "paint" }
  },
  {
    id: "def_corridor",
    type: "corridor",
    category: "Navigation",
    name: "Corridor",
    defaultWidth: 3,
    defaultHeight: 10,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#1b2230", stroke: "#3a6fd8", dashed: true, fillOpacity: 0.3 }),
    threeD: { model: "floor_mark", height: 0.01, material: "paint" }
  },
  {
    id: "def_stairs",
    type: "stairs",
    category: "Navigation",
    name: "Stairs",
    defaultWidth: 2,
    defaultHeight: 3,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#2a2f3a", stroke: "#7d7d7d" }),
    threeD: { model: "stairs", height: 1.5, material: "concrete" }
  },
  {
    id: "def_zone",
    type: "zone",
    category: "Zones",
    name: "Zone",
    defaultWidth: 8,
    defaultHeight: 6,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#4f8cff", stroke: "#4f8cff", fillOpacity: 0.12 }),
    properties: { zoneType: "General" },
    threeD: { model: "zone", height: 0, material: "overlay" }
  },
  {
    id: "def_restroom",
    type: "restroom",
    category: "Facilities",
    name: "Restroom",
    defaultWidth: 3,
    defaultHeight: 3,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#24403a", stroke: "#46d18a" }),
    threeD: { model: "room", height: 3, material: "tile" }
  },
  {
    id: "def_food_area",
    type: "food_area",
    category: "Facilities",
    name: "Food Area",
    defaultWidth: 5,
    defaultHeight: 4,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#403424", stroke: "#ffb454" }),
    threeD: { model: "room", height: 3, material: "tile" }
  },
  {
    id: "def_emergency_exit",
    type: "emergency_exit",
    category: "Facilities",
    name: "Emergency Exit",
    defaultWidth: 1.2,
    defaultHeight: 2,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#3a1f1f", stroke: "#ff5d5d" }),
    threeD: { model: "exit", height: 2.2, material: "sign" }
  },
  {
    id: "def_entrance",
    type: "entrance",
    category: "Infrastructure",
    name: "Entrance",
    defaultWidth: 1.5,
    defaultHeight: 2,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#1f2937", stroke: "#46d18a" }),
    threeD: { model: "entrance", height: 2.4, material: "glass" }
  },
  {
    id: "def_custom",
    type: "custom",
    category: "Custom",
    name: "Custom Object",
    defaultWidth: 2,
    defaultHeight: 2,
    rotate: true,
    resizable: true,
    defaultStyle: style({ fill: "#33384a", stroke: "#a0a8bd" }),
    properties: { note: "" },
    threeD: { model: "custom", height: 1, material: "generic" }
  }
];

export const DEFINITION_MAP: Record<string, ObjectDefinition> = Object.fromEntries(
  OBJECT_DEFINITIONS.map((d) => [d.id, d])
);

export const TYPE_TO_DEFINITION: Record<ObjectType, ObjectDefinition> = Object.fromEntries(
  OBJECT_DEFINITIONS.map((d) => [d.type, d])
) as Record<ObjectType, ObjectDefinition>;

export const CATALOG_BY_CATEGORY: Record<ObjectCategory, ObjectDefinition[]> = OBJECT_DEFINITIONS.reduce(
  (acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  },
  {} as Record<ObjectCategory, ObjectDefinition[]>
);

/**
 * Maps an object type to the reusable top-down asset it should render with.
 * This is the single extension point for swapping/adding art: point a type at a
 * new `assetId` registered in the asset registry without touching the renderer.
 */
export const TYPE_TO_ASSET: Partial<Record<ObjectType, string>> = {
  chair: "chair-modern-01",
  table: "table-round-01",
  sofa: "sofa-01",
  stage: "stage-01",
  booth: "booth-01",
  counter: "counter-01",
  registration_desk: "registration-desk-01",
  speaker: "speaker-01",
  screen: "screen-01"
};

for (const def of OBJECT_DEFINITIONS) {
  const assetId = TYPE_TO_ASSET[def.type];
  if (assetId && !def.assetId) def.assetId = assetId;
}

export function assetIdForType(type: ObjectType): string | undefined {
  return TYPE_TO_DEFINITION[type]?.assetId;
}
