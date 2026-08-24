import { create } from "zustand";
import type { Camera } from "@/lib/geometry";
import type { Unit, Vec2 } from "@/model/units";
import type { SelectionTarget, Venue, VenueObject } from "@/model/types";
import { applyCommand, clone, invertCommand } from "@/commands/history";
import type { Command } from "@/commands/history";
import { createObject, createVenue, cloneObject } from "@/model/factory";
import type { ObjectType, WallOpening } from "@/model/types";
import { createMockPersistence } from "@/persistence/persistence";
import type { PersistenceHandler } from "@/persistence/persistence";
import { alignObjects, distributeObjects, zOrder } from "@/engine/operations";
import type { AlignMode, ZOrderAction } from "@/engine/operations";

export type ToolType =
  | "select"
  | "pan"
  | "wall"
  | "door"
  | "window"
  | "zone"
  | "aisle"
  | "measure"
  | "object";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

interface CoalesceState {
  key: string;
  ts: number;
}

interface EditorState {
  venue: Venue;
  camera: Camera;
  tool: ToolType;
  activeObjectType: ObjectType;
  selection: SelectionTarget[];
  past: Command[];
  future: Command[];
  clipboard: VenueObject[] | null;
  persistence: PersistenceHandler;
  sync: SyncStatus;
  syncMessage?: string;
  lastSavedAt?: number;
  _dirty: boolean;
  _coalesce: CoalesceState | null;

  initVenue: (venue: Venue) => void;
  setTool: (tool: ToolType) => void;
  setActiveObjectType: (type: ObjectType) => void;
  setCamera: (camera: Camera) => void;

  setSelection: (targets: SelectionTarget[]) => void;
  addToSelection: (targets: SelectionTarget[]) => void;
  toggleSelection: (target: SelectionTarget) => void;
  clearSelection: () => void;
  selectAll: () => void;

  dispatch: (command: Command, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;

  setVenueMeta: (partial: Partial<Venue>) => void;
  updateProperty: (id: string, path: string, value: unknown) => void;
  updateTransform: (id: string, partial: Partial<VenueObject>) => void;

  addObjectAt: (type: ObjectType, world: Vec2) => string;
  duplicateSelection: () => void;
  copySelection: () => void;
  paste: () => void;
  deleteSelection: () => void;

  align: (mode: AlignMode) => void;
  distribute: (axis: "h" | "v") => void;
  reorder: (action: ZOrderAction) => void;

  lockSelection: (locked: boolean) => void;
  hideSelection: (hidden: boolean) => void;

  nudge: (dx: number, dy: number) => void;

  retrySave: () => void;
  loadVenue: (venueId: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useEditorStore = create<EditorState>((set, get) => {
  function pruneSelection(venue: Venue, selection: SelectionTarget[]): SelectionTarget[] {
    return selection.filter((s) => {
      if (s.kind === "object") return venue.objects.some((o) => o.id === s.id);
      if (s.kind === "wall") return venue.walls.some((w) => w.id === s.id);
      if (s.kind === "opening")
        return venue.walls.some((w) => w.id === s.wallId && w.openings.some((o) => o.id === s.id));
      return false;
    });
  }

  function scheduleSave(): void {
    get()._dirty = true;
    set({ sync: get().sync === "error" ? "error" : "saving", syncMessage: undefined });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void doSave();
    }, 700);
  }

  async function doSave(): Promise<void> {
    if (!get()._dirty) return;
    const venue = get().venue;
    set({ sync: "saving" });
    try {
      await get().persistence.save(clone(venue));
      get()._dirty = false;
      set({ sync: "saved", lastSavedAt: Date.now() });
      if (get()._dirty) void doSave();
    } catch (e) {
      set({ sync: "error", syncMessage: e instanceof Error ? e.message : "Save failed" });
    }
  }

  function applyAndPush(command: Command, coalesceKey?: string): void {
    const prev = get().venue;
    const next = applyCommand(prev, command);
    const now = Date.now();
    const last = get()._coalesce;
    let past = get().past;
    let newCoalesce: CoalesceState | null = null;

    if (coalesceKey && last && last.key === coalesceKey && now - last.ts < 700) {
      const top = past[past.length - 1];
      if (top && command.kind === "UPDATE_PROPERTY" && top.kind === "UPDATE_PROPERTY") {
        const merged: Command = {
          kind: "UPDATE_PROPERTY",
          id: command.id,
          path: command.path,
          before: top.before,
          after: command.after
        };
        past = [...past.slice(0, -1), merged];
        newCoalesce = { key: coalesceKey, ts: now };
      } else if (top && command.kind === "TRANSFORM_OBJECTS" && top.kind === "TRANSFORM_OBJECTS") {
        const map = new Map(top.changes.map((c) => [c.id, c.before]));
        const merged: Command = {
          kind: "TRANSFORM_OBJECTS",
          changes: command.changes.map((c) => ({
            id: c.id,
            before: map.get(c.id) ?? c.before,
            after: c.after
          }))
        };
        past = [...past.slice(0, -1), merged];
        newCoalesce = { key: coalesceKey, ts: now };
      } else {
        past = [...past, command];
      }
    } else {
      past = [...past, command];
    }

    const selection = pruneSelection(next, get().selection);
    set({ venue: next, past, future: [], selection, _coalesce: newCoalesce });
    scheduleSave();
  }

  return {
    venue: createVenue(),
    camera: { x: 0, y: 0, scale: 80 },
    tool: "select",
    activeObjectType: "booth",
    selection: [],
    past: [],
    future: [],
    clipboard: null,
    persistence: createMockPersistence(),
    sync: "idle",
    _dirty: false,
    _coalesce: null,

    initVenue(venue) {
      set({ venue, selection: [], past: [], future: [], sync: "idle", _dirty: false });
      get().persistence.save(clone(venue)).catch(() => undefined);
    },

    setTool(tool) {
      set({ tool });
    },
    setActiveObjectType(type) {
      set({ activeObjectType: type });
    },
    setCamera(camera) {
      set({ camera });
    },

    setSelection(targets) {
      set({ selection: targets });
    },
    addToSelection(targets) {
      const existing = new Set(get().selection.map((s) => `${s.kind}:${s.id}`));
      const merged = [...get().selection];
      for (const t of targets) {
        const key = `${t.kind}:${t.id}`;
        if (!existing.has(key)) merged.push(t);
      }
      set({ selection: merged });
    },
    toggleSelection(target) {
      const current = get().selection;
      const key = `${target.kind}:${target.id}`;
      if (current.some((s) => `${s.kind}:${s.id}` === key)) {
        set({ selection: current.filter((s) => `${s.kind}:${s.id}` !== key) });
      } else {
        set({ selection: [...current, target] });
      }
    },
    clearSelection() {
      set({ selection: [] });
    },
    selectAll() {
      const objs = get().venue.objects.filter((o) => !o.locked && !o.hidden).map((o) => ({ kind: "object" as const, id: o.id }));
      const walls = get().venue.walls.filter((w) => !w.locked).map((w) => ({ kind: "wall" as const, id: w.id }));
      set({ selection: [...objs, ...walls] });
    },

    dispatch(command, coalesceKey) {
      applyAndPush(command, coalesceKey);
    },

    undo() {
      const past = [...get().past];
      if (past.length === 0) return;
      const command = past.pop()!;
      const prev = get().venue;
      const next = applyCommand(prev, invertCommand(command));
      const selection = pruneSelection(next, get().selection);
      set({ venue: next, past, future: [...get().future, command], selection });
      scheduleSave();
    },
    redo() {
      const future = [...get().future];
      if (future.length === 0) return;
      const command = future.pop()!;
      const prev = get().venue;
      const next = applyCommand(prev, command);
      const selection = pruneSelection(next, get().selection);
      set({ venue: next, past: [...get().past, command], future, selection });
      scheduleSave();
    },

    setVenueMeta(partial) {
      set({ venue: { ...get().venue, ...partial, updatedAt: new Date().toISOString() } });
      scheduleSave();
    },

    updateProperty(id, path, value) {
      const obj = get().venue.objects.find((o) => o.id === id);
      if (!obj) return;
      const before = (obj as unknown as Record<string, unknown>);
      const cur = getByPathDeep(before, path);
      if (cur === value) return;
      get().dispatch({ kind: "UPDATE_PROPERTY", id, path, before: cur, after: value }, `prop:${id}:${path}`);
    },

    updateTransform(id, partial) {
      const obj = get().venue.objects.find((o) => o.id === id);
      if (!obj) return;
      const before = {
        position: { ...obj.position },
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation
      };
      const after = {
        position: partial.position ?? before.position,
        width: partial.width ?? before.width,
        height: partial.height ?? before.height,
        rotation: partial.rotation ?? before.rotation
      };
      get().dispatch(
        { kind: "TRANSFORM_OBJECTS", changes: [{ id, before, after }] },
        `transform:${id}`
      );
    },

    addObjectAt(type, world) {
      const obj = createObject(type, world);
      get().dispatch({ kind: "ADD_OBJECT", object: obj });
      set({ selection: [{ kind: "object", id: obj.id }] });
      return obj.id;
    },

    duplicateSelection() {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      const objs = get().venue.objects.filter((o) => ids.includes(o.id));
      if (objs.length === 0) return;
      const clones = objs.map((o, i) => cloneObject(o, { x: 0.6 + i * 0.2, y: 0.6 + i * 0.2 }));
      get().dispatch({ kind: "ADD_OBJECTS", objects: clones });
      set({ selection: clones.map((c) => ({ kind: "object" as const, id: c.id })) });
    },
    copySelection() {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      const objs = get().venue.objects.filter((o) => ids.includes(o.id)).map((o) => clone(o));
      set({ clipboard: objs });
    },
    paste() {
      const clip = get().clipboard;
      if (!clip || clip.length === 0) return;
      const clones = clip.map((o, i) => cloneObject(o, { x: 0.5 + i * 0.3, y: 0.5 + i * 0.3 }));
      get().dispatch({ kind: "ADD_OBJECTS", objects: clones });
      set({ selection: clones.map((c) => ({ kind: "object" as const, id: c.id })) });
    },

    deleteSelection() {
      const selection = get().selection;
      const objIds = selection.filter((s) => s.kind === "object").map((s) => s.id);
      const wallIds = selection.filter((s) => s.kind === "wall").map((s) => s.id);
      const openingTargets = selection.filter((s) => s.kind === "opening");
      const objs = get().venue.objects.filter((o) => objIds.includes(o.id));
      const walls = get().venue.walls.filter((w) => wallIds.includes(w.id));
      const openings = openingTargets
        .map((t) => {
          const w = get().venue.walls.find((ww) => ww.id === t.wallId);
          const op = w?.openings.find((o) => o.id === t.id);
          return op;
        })
        .filter(Boolean) as WallOpening[];
      if (objs.length) get().dispatch({ kind: "DELETE_OBJECTS", objects: objs });
      if (walls.length) get().dispatch({ kind: "DELETE_WALLS", walls });
      if (openings.length) get().dispatch({ kind: "DELETE_OPENINGS", openings });
      set({ selection: [] });
    },

    align(mode) {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      const cmd = alignObjects(get().venue, ids, mode);
      if (cmd) get().dispatch(cmd);
    },
    distribute(axis) {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      const cmd = distributeObjects(get().venue, ids, axis);
      if (cmd) get().dispatch(cmd);
    },
    reorder(action) {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      const cmd = zOrder(get().venue, ids, action);
      if (cmd) get().dispatch(cmd);
    },

    lockSelection(locked) {
      const ids = new Set(get().selection.filter((s) => s.kind === "object").map((s) => s.id));
      const venue = clone(get().venue);
      for (const o of venue.objects) if (ids.has(o.id)) o.locked = locked;
      set({ venue, selection: locked ? [] : get().selection });
      scheduleSave();
    },
    hideSelection(hidden) {
      const ids = new Set(get().selection.filter((s) => s.kind === "object").map((s) => s.id));
      const venue = clone(get().venue);
      for (const o of venue.objects) if (ids.has(o.id)) o.hidden = hidden;
      set({ venue, selection: hidden ? [] : get().selection });
    },

    retrySave() {
      void doSave();
    },

    nudge(dx, dy) {
      const ids = get().selection.filter((s) => s.kind === "object").map((s) => s.id);
      if (ids.length === 0) return;
      const venue = get().venue;
      const changes = venue.objects
        .filter((o) => ids.includes(o.id))
        .map((o) => ({
          id: o.id,
          before: { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation },
          after: {
            position: { x: o.position.x + dx, y: o.position.y + dy },
            width: o.width,
            height: o.height,
            rotation: o.rotation
          }
        }));
      if (changes.length) get().dispatch({ kind: "TRANSFORM_OBJECTS", changes });
    },
    async loadVenue(venueId) {
      const existing = await get().persistence.load(venueId);
      if (existing) {
        set({ venue: existing, selection: [], past: [], future: [], sync: "saved", _dirty: false });
      } else {
        const v = createVenue();
        set({ venue: v, selection: [], past: [], future: [], sync: "idle", _dirty: false });
        get().persistence.save(clone(v)).catch(() => undefined);
      }
    }
  };
});

function getByPathDeep(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function selectedObjectIds(state: EditorState): string[] {
  return state.selection.filter((s) => s.kind === "object").map((s) => s.id);
}
