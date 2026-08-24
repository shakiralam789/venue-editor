import type {
  OpeningType,
  Venue,
  VenueObject,
  Wall,
  WallOpening
} from "@/model/types";

export interface TransformState {
  position: { x: number; y: number };
  width: number;
  height: number;
  rotation: number;
}

export interface ObjectTransformChange {
  id: string;
  before: TransformState;
  after: TransformState;
}

export interface ZOrderChange {
  id: string;
  beforeZ: number;
  afterZ: number;
}

export type Command =
  | { kind: "ADD_OBJECT"; object: VenueObject }
  | { kind: "ADD_OBJECTS"; objects: VenueObject[] }
  | { kind: "DELETE_OBJECTS"; objects: VenueObject[] }
  | { kind: "TRANSFORM_OBJECTS"; changes: ObjectTransformChange[] }
  | { kind: "UPDATE_PROPERTY"; id: string; path: string; before: unknown; after: unknown }
  | { kind: "CREATE_WALL"; wall: Wall }
  | { kind: "DELETE_WALLS"; walls: Wall[] }
  | { kind: "UPDATE_WALL"; id: string; before: WallState; after: WallState }
  | { kind: "ADD_OPENING"; opening: WallOpening }
  | { kind: "DELETE_OPENINGS"; openings: WallOpening[] }
  | { kind: "UPDATE_OPENING"; id: string; before: OpeningState; after: OpeningState }
  | { kind: "Z_ORDER"; changes: ZOrderChange[] };

export interface WallState {
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness: number;
  height: number;
}

export interface OpeningState {
  tOffset: number;
  width: number;
  swing: "left" | "right" | "none";
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== "object" || cur[p] == null) cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function applyCommand(venue: Venue, command: Command): Venue {
  const v = clone(venue);
  switch (command.kind) {
    case "ADD_OBJECT":
      v.objects.push(clone(command.object));
      break;
    case "ADD_OBJECTS":
      v.objects.push(...command.objects.map(clone));
      break;
    case "DELETE_OBJECTS": {
      const ids = new Set(command.objects.map((o) => o.id));
      v.objects = v.objects.filter((o) => !ids.has(o.id));
      break;
    }
    case "TRANSFORM_OBJECTS": {
      for (const c of command.changes) {
        const o = v.objects.find((x) => x.id === c.id);
        if (o) Object.assign(o, clone(c.after));
      }
      break;
    }
    case "UPDATE_PROPERTY": {
      const o = v.objects.find((x) => x.id === command.id);
      if (o) setByPath(o as unknown as Record<string, unknown>, command.path, clone(command.after));
      break;
    }
    case "CREATE_WALL":
      v.walls.push(clone(command.wall));
      break;
    case "DELETE_WALLS": {
      const ids = new Set(command.walls.map((w) => w.id));
      v.walls = v.walls.filter((w) => !ids.has(w.id));
      break;
    }
    case "UPDATE_WALL": {
      const w = v.walls.find((x) => x.id === command.id);
      if (w) Object.assign(w, clone(command.after));
      break;
    }
    case "ADD_OPENING":
      for (const w of v.walls) {
        if (w.id === command.opening.wallId) {
          w.openings.push(clone(command.opening));
          break;
        }
      }
      break;
    case "DELETE_OPENINGS": {
      const ids = new Set(command.openings.map((o) => o.id));
      for (const w of v.walls) w.openings = w.openings.filter((o) => !ids.has(o.id));
      break;
    }
    case "UPDATE_OPENING": {
      for (const w of v.walls) {
        const o = w.openings.find((x) => x.id === command.id);
        if (o) {
          Object.assign(o, clone(command.after));
          break;
        }
      }
      break;
    }
    case "Z_ORDER": {
      for (const c of command.changes) {
        const o = v.objects.find((x) => x.id === c.id);
        if (o) o.z = c.afterZ;
      }
      break;
    }
  }
  v.updatedAt = new Date().toISOString();
  return v;
}

export function invertCommand(command: Command): Command {
  switch (command.kind) {
    case "ADD_OBJECT":
      return { kind: "DELETE_OBJECTS", objects: [command.object] };
    case "ADD_OBJECTS":
      return { kind: "DELETE_OBJECTS", objects: command.objects };
    case "DELETE_OBJECTS":
      return { kind: "ADD_OBJECTS", objects: command.objects };
    case "TRANSFORM_OBJECTS":
      return {
        kind: "TRANSFORM_OBJECTS",
        changes: command.changes.map((c) => ({ id: c.id, before: c.after, after: c.before }))
      };
    case "UPDATE_PROPERTY":
      return {
        kind: "UPDATE_PROPERTY",
        id: command.id,
        path: command.path,
        before: command.after,
        after: command.before
      };
    case "CREATE_WALL":
      return { kind: "DELETE_WALLS", walls: [command.wall] };
    case "DELETE_WALLS":
      return { kind: "CREATE_WALL", wall: command.walls[0] };
    case "UPDATE_WALL":
      return { kind: "UPDATE_WALL", id: command.id, before: command.after, after: command.before };
    case "ADD_OPENING":
      return { kind: "DELETE_OPENINGS", openings: [command.opening] };
    case "DELETE_OPENINGS":
      return { kind: "ADD_OPENING", opening: command.openings[0] };
    case "UPDATE_OPENING":
      return { kind: "UPDATE_OPENING", id: command.id, before: command.after, after: command.before };
    case "Z_ORDER":
      return {
        kind: "Z_ORDER",
        changes: command.changes.map((c) => ({ id: c.id, beforeZ: c.afterZ, afterZ: c.beforeZ }))
      };
  }
}

export function describeCommand(command: Command): string {
  switch (command.kind) {
    case "ADD_OBJECT":
    case "ADD_OBJECTS":
      return "Add object";
    case "DELETE_OBJECTS":
      return "Delete";
    case "TRANSFORM_OBJECTS":
      return "Transform";
    case "UPDATE_PROPERTY":
      return "Edit property";
    case "CREATE_WALL":
      return "Draw wall";
    case "DELETE_WALLS":
      return "Delete wall";
    case "UPDATE_WALL":
      return "Edit wall";
    case "ADD_OPENING":
      return "Add opening";
    case "DELETE_OPENINGS":
      return "Delete opening";
    case "UPDATE_OPENING":
      return "Edit opening";
    case "Z_ORDER":
      return "Reorder";
  }
}

export { getByPath, setByPath, clone };
