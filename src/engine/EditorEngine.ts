import type { PixiRenderer } from "@/renderer/PixiRenderer";
import type { Camera } from "@/lib/geometry";
import { zoomToward, panCamera, screenToWorld, rotatePoint, projectPointOnSegment, snapAngle, distance } from "@/lib/geometry";
import type { Vec2 } from "@/model/units";
import { formatLength } from "@/model/units";
import type { SelectionTarget, Venue, VenueObject, Wall, WallOpening } from "@/model/types";
import { useEditorStore } from "@/state/store";
import type { ToolType } from "@/state/store";
import { SnapManager } from "@/engine/SnapManager";
import { resizeRect, rotateAt, scaleObjectsToFrame, rotateObjectsAround, MIN_SIZE } from "@/engine/transforms";
import type { ObjectTransformChange } from "@/commands/history";
import type { TransformState } from "@/commands/history";
import { createWall, createOpening } from "@/model/factory";

type Mode =
  | "idle"
  | "pan"
  | "marquee"
  | "drag"
  | "resize"
  | "rotate"
  | "wallDrag"
  | "wallEndpoint"
  | "openingDrag"
  | "drawRect"
  | "measure";

interface LiveWall {
  wall: Wall;
  before: { start: Vec2; end: Vec2 };
}

export class EditorEngine {
  private renderer: PixiRenderer;
  private snap = new SnapManager();
  private mode: Mode = "idle";
  private startWorld: Vec2 = { x: 0, y: 0 };
  private lastClient: Vec2 = { x: 0, y: 0 };
  private dragged: { id: string; offset: Vec2; initial: TransformState }[] = [];
  private liveObjects = new Map<string, VenueObject>();
  private initialStates = new Map<string, TransformState>();
  private grabbedHandle: string | null = null;
  private multiFrame: { center: Vec2; width: number; height: number } | null = null;
  private rotateStart: { angle: number; center: Vec2 } | null = null;
  private wallLive: LiveWall | null = null;
  private wallEndpoint: "start" | "end" | null = null;
  private openingLive: { opening: WallOpening; wall: Wall; before: number } | null = null;
  private rectStart: Vec2 | null = null;
  private drawType: "zone" | "aisle" | null = null;
  private measureStart: Vec2 | null = null;
  private spacePan = false;
  private moved = false;
  private wallDrawing = false;
  private wallStart: Vec2 | null = null;
  private onMeasure?: (text: string | null) => void;

  constructor(renderer: PixiRenderer) {
    this.renderer = renderer;
  }

  setOnMeasure(cb: (text: string | null) => void) {
    this.onMeasure = cb;
  }

  attach(): void {
    const c = this.renderer.canvas;
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach(): void {
    const c = this.renderer.canvas;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private get store() {
    return useEditorStore.getState();
  }

  private get scale() {
    return this.renderer.camera.scale;
  }

  private snapPoint(p: Vec2, exclude: Set<string>): { point: Vec2; guides: { x?: number; y?: number }[] } {
    const ctx = this.snap.buildContext(this.store.venue, exclude, this.scale);
    return this.snap.snap(p, ctx);
  }

  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const world = this.renderer.pointerToWorld(e.clientX, e.clientY);
    this.startWorld = world;
    this.lastClient = { x: e.clientX, y: e.clientY };
    this.startWorldClient = { x: e.clientX, y: e.clientY };
    this.moved = false;
    this.renderer.canvas.setPointerCapture(e.pointerId);

    const tool = this.store.tool;
    const panRequested = tool === "pan" || e.button === 1 || this.spacePan;

    if (panRequested) {
      this.mode = "pan";
      return;
    }

    if (tool === "wall") {
      this.handleWallClick(world);
      return;
    }
    if (tool === "door" || tool === "window") {
      this.handleOpeningPlace(world, tool);
      return;
    }
    if (tool === "zone" || tool === "aisle") {
      this.mode = "drawRect";
      this.rectStart = this.maybeSnap(world);
      this.drawType = tool;
      return;
    }
    if (tool === "measure") {
      this.mode = "measure";
      this.measureStart = world;
      return;
    }
    if (tool === "object") {
      const placed = this.store.addObjectAt(this.store.activeObjectType, this.maybeSnap(world));
      this.beginDragSelection([placed], world);
      return;
    }

    this.handleSelectTool(world, e);
  };

  private maybeSnap(p: Vec2): Vec2 {
    if (!this.store.venue.snapToGrid) return p;
    const r = this.snapPoint(p, new Set());
    return r.point;
  }

  private handleWallClick(world: Vec2): void {
    const snapped = this.maybeSnap(world);
    if (!this.wallDrawing) {
      this.wallDrawing = true;
      this.wallStart = snapped;
      this.renderer.drawWallPreview(snapped, snapped);
      return;
    }
    if (this.wallStart && distance(this.wallStart, snapped) > 0.1) {
      const wall = createWall(this.wallStart, snapped);
      this.store.dispatch({ kind: "CREATE_WALL", wall });
      this.wallStart = snapped;
      this.renderer.drawWallPreview(snapped, snapped);
    }
  }

  private handleOpeningPlace(world: Vec2, tool: "door" | "window"): void {
    const wall = this.renderer.hitTestWalls(world, this.store.venue, 0.4);
    if (!wall) return;
    const proj = projectPointOnSegment(world, wall.start, wall.end);
    const opening = createOpening(tool, wall.id, proj.t, tool === "door" ? 1.0 : 1.2);
    this.store.dispatch({ kind: "ADD_OPENING", opening });
    this.store.setSelection([{ kind: "opening", id: opening.id, wallId: wall.id }]);
  }

  private handleSelectTool(world: Vec2, e: PointerEvent): void {
    const venue = this.store.venue;

    if (this.store.selection.length > 0) {
      const handle = this.renderer.hitTestHandle(world, this.scale);
      if (handle) {
        if (handle === "rotate") this.beginRotate(world);
        else this.beginResize(handle, world);
        return;
      }
      const openingHit = this.hitTestOpening(world);
      if (openingHit) {
        this.store.setSelection([{ kind: "opening", id: openingHit.opening.id, wallId: openingHit.wall.id }]);
        this.beginOpeningDrag(openingHit);
        return;
      }
      const wallHit = this.renderer.hitTestWalls(world, venue, 0.3);
      if (wallHit) {
        const endpoint = this.endpointHit(wallHit, world);
        if (endpoint) {
          this.beginWallEndpoint(wallHit, endpoint);
          return;
        }
        if (!e.shiftKey) this.store.setSelection([{ kind: "wall", id: wallHit.id }]);
        this.beginWallDrag(wallHit);
        return;
      }
    } else {
      const openingHit = this.hitTestOpening(world);
      if (openingHit) {
        this.store.setSelection([{ kind: "opening", id: openingHit.opening.id, wallId: openingHit.wall.id }]);
        return;
      }
      const wallHit = this.renderer.hitTestWalls(world, venue, 0.3);
      if (wallHit && !e.shiftKey) {
        this.store.setSelection([{ kind: "wall", id: wallHit.id }]);
        this.beginWallDrag(wallHit);
        return;
      }
    }

    const obj = this.renderer.hitTestObjects(world, venue, { onlySelectable: true });
    if (obj) {
      const sel = this.store.selection;
      const isSelected = sel.some((s) => s.kind === "object" && s.id === obj.id);
      if (e.shiftKey) {
        this.store.toggleSelection({ kind: "object", id: obj.id });
        return;
      }
      if (!isSelected) {
        this.store.setSelection([{ kind: "object", id: obj.id }]);
        this.beginDragSelection([obj.id], world);
      } else {
        const groupIds = this.store.selection.filter((s) => s.kind === "object").map((s) => s.id);
        this.beginDragSelection(groupIds, world);
      }
      return;
    }

    if (e.shiftKey) {
      this.mode = "marquee";
    } else {
      this.store.clearSelection();
      this.mode = "marquee";
    }
  }

  private hitTestOpening(world: Vec2): { opening: WallOpening; wall: Wall } | null {
    const venue = this.store.venue;
    for (const w of venue.walls) {
      for (const op of w.openings) {
        const center = {
          x: w.start.x + (w.end.x - w.start.x) * op.tOffset,
          y: w.start.y + (w.end.y - w.start.y) * op.tOffset
        };
        if (distance(world, center) < 0.4) return { opening: op, wall: w };
      }
    }
    return null;
  }

  private endpointHit(wall: Wall, world: Vec2): "start" | "end" | null {
    const t = 12 / this.scale;
    if (distance(world, wall.start) < t) return "start";
    if (distance(world, wall.end) < t) return "end";
    return null;
  }

  private beginDragSelection(ids: string[], world: Vec2): void {
    const venue = this.store.venue;
    this.liveObjects.clear();
    this.initialStates.clear();
    this.dragged = [];
    for (const id of ids) {
      const o = venue.objects.find((x) => x.id === id);
      if (!o) continue;
      this.liveObjects.set(id, { ...o, position: { ...o.position }, properties: { ...o.properties }, style: { ...o.style } });
      const initial: TransformState = {
        position: { ...o.position },
        width: o.width,
        height: o.height,
        rotation: o.rotation
      };
      this.initialStates.set(id, initial);
      this.dragged.push({ id, offset: { x: world.x - o.position.x, y: world.y - o.position.y }, initial });
    }
    this.mode = "drag";
  }

  private beginResize(handle: string, world: Vec2): void {
    const sel = this.store.selection.filter((s) => s.kind === "object").map((s) => s.id);
    const venue = this.store.venue;
    const objs = venue.objects.filter((o) => sel.includes(o.id));
    this.liveObjects.clear();
    this.initialStates.clear();
    for (const o of objs) {
      this.liveObjects.set(o.id, { ...o, position: { ...o.position }, properties: { ...o.properties }, style: { ...o.style } });
      this.initialStates.set(o.id, { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation });
    }
    if (objs.length > 1) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const o of objs) {
        minX = Math.min(minX, o.position.x - o.width / 2);
        minY = Math.min(minY, o.position.y - o.height / 2);
        maxX = Math.max(maxX, o.position.x + o.width / 2);
        maxY = Math.max(maxY, o.position.y + o.height / 2);
      }
      this.multiFrame = { center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, width: maxX - minX, height: maxY - minY };
    }
    this.grabbedHandle = handle;
    this.mode = "resize";
  }

  private beginRotate(world: Vec2): void {
    const sel = this.store.selection.filter((s) => s.kind === "object").map((s) => s.id);
    const venue = this.store.venue;
    const objs = venue.objects.filter((o) => sel.includes(o.id));
    this.liveObjects.clear();
    this.initialStates.clear();
    for (const o of objs) {
      this.liveObjects.set(o.id, { ...o, position: { ...o.position }, properties: { ...o.properties }, style: { ...o.style } });
      this.initialStates.set(o.id, { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation });
    }
    const center =
      objs.length === 1
        ? { ...objs[0].position }
        : (() => {
            const cx = objs.reduce((s, o) => s + o.position.x, 0) / objs.length;
            const cy = objs.reduce((s, o) => s + o.position.y, 0) / objs.length;
            return { x: cx, y: cy };
          })();
    this.rotateStart = { angle: Math.atan2(world.y - center.y, world.x - center.x), center };
    this.mode = "rotate";
  }

  private beginWallDrag(wall: Wall): void {
    this.wallLive = { wall: { ...wall, start: { ...wall.start }, end: { ...wall.end } }, before: { start: { ...wall.start }, end: { ...wall.end } } };
    this.mode = "wallDrag";
  }

  private beginWallEndpoint(wall: Wall, endpoint: "start" | "end"): void {
    this.wallLive = { wall: { ...wall, start: { ...wall.start }, end: { ...wall.end } }, before: { start: { ...wall.start }, end: { ...wall.end } } };
    this.wallEndpoint = endpoint;
    this.mode = "wallEndpoint";
  }

  private beginOpeningDrag(hit: { opening: WallOpening; wall: Wall }): void {
    this.openingLive = { opening: { ...hit.opening }, wall: hit.wall, before: hit.opening.tOffset };
    this.mode = "openingDrag";
  }

  onPointerMove = (e: PointerEvent) => {
    const world = this.renderer.pointerToWorld(e.clientX, e.clientY);
    const clientDelta = { x: e.clientX - this.lastClient.x, y: e.clientY - this.lastClient.y };
    if (Math.abs(e.clientX - this.startWorldClient.x) + Math.abs(e.clientY - this.startWorldClient.y) > 3) this.moved = true;

    switch (this.mode) {
      case "pan": {
        const cam = this.renderer.camera;
        const next = panCamera(cam, { x: clientDelta.x, y: clientDelta.y });
        this.commitCamera(next);
        break;
      }
      case "marquee": {
        const rect = this.rectFrom(this.startWorld, world);
        this.renderer.drawMarquee(rect);
        break;
      }
      case "drag":
        this.updateDrag(world, e.shiftKey);
        break;
      case "resize":
        this.updateResize(world, e.shiftKey);
        break;
      case "rotate":
        this.updateRotate(world, e.shiftKey);
        break;
      case "wallDrag":
        this.updateWallDrag(world);
        break;
      case "wallEndpoint":
        this.updateWallEndpoint(world);
        break;
      case "openingDrag":
        this.updateOpeningDrag(world);
        break;
      case "drawRect": {
        const rect = this.rectFrom(this.rectStart!, world);
        this.renderer.drawRectPreview(rect);
        break;
      }
      case "measure": {
        if (this.measureStart) {
          this.renderer.drawMeasure(this.measureStart, world);
          const d = distance(this.measureStart, world);
          this.onMeasure?.(formatLength(d, this.store.venue.unit));
        }
        break;
      }
      case "idle": {
        if (this.wallDrawing && this.wallStart) {
          this.renderer.drawWallPreview(this.wallStart, this.maybeSnap(world));
        }
        break;
      }
    }
    this.lastClient = { x: e.clientX, y: e.clientY };
  };

  private startWorldClient: Vec2 = { x: 0, y: 0 };

  private rectFrom(a: Vec2, b: Vec2) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
  }

  private updateDrag(world: Vec2, _shift: boolean): void {
    if (this.dragged.length === 0) return;
    const primary = this.dragged[0];
    const rawDelta = { x: world.x - this.startWorld.x, y: world.y - this.startWorld.y };
    const candidate = { x: primary.initial.position.x + rawDelta.x, y: primary.initial.position.y + rawDelta.y };
    const snapResult = this.snapPoint(candidate, new Set(this.liveObjects.keys()));
    const adjusted = { x: snapResult.point.x - primary.initial.position.x, y: snapResult.point.y - primary.initial.position.y };
    for (const d of this.dragged) {
      const o = this.liveObjects.get(d.id)!;
      o.position = { x: d.initial.position.x + adjusted.x, y: d.initial.position.y + adjusted.y };
      this.renderer.syncObject(o);
    }
    this.renderer.setLiveFrame(this.frameOfLive());
    this.renderer.drawGuides(snapResult.guides);
  }

  private frameOfLive() {
    const objs = [...this.liveObjects.values()];
    if (objs.length === 0) return { center: { x: 0, y: 0 }, rotation: 0, width: 0, height: 0 };
    if (objs.length === 1) {
      const o = objs[0];
      return { center: { ...o.position }, rotation: o.rotation, width: o.width, height: o.height };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of objs) {
      minX = Math.min(minX, o.position.x - o.width / 2);
      minY = Math.min(minY, o.position.y - o.height / 2);
      maxX = Math.max(maxX, o.position.x + o.width / 2);
      maxY = Math.max(maxY, o.position.y + o.height / 2);
    }
    return { center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, rotation: 0, width: maxX - minX, height: maxY - minY };
  }

  private updateResize(world: Vec2, shift: boolean): void {
    const ids = [...this.liveObjects.keys()];
    if (ids.length === 1) {
      const o = this.liveObjects.get(ids[0])!;
      const snapResult = this.snapPoint(world, new Set(ids));
      const res = resizeRect(o.position, o.rotation, o.width, o.height, this.grabbedHandle!, snapResult.point, { aspect: shift });
      o.position = res.center;
      o.width = res.width;
      o.height = res.height;
      this.renderer.syncObject(o);
      this.renderer.setLiveFrame({ center: o.position, rotation: o.rotation, width: o.width, height: o.height });
      this.renderer.drawGuides(snapResult.guides);
    } else if (this.multiFrame) {
      const res = resizeRect(this.multiFrame.center, 0, this.multiFrame.width, this.multiFrame.height, this.grabbedHandle!, world);
      const scaleX = res.width / this.multiFrame.width;
      const scaleY = res.height / this.multiFrame.height;
      const changes = scaleObjectsToFrame([...this.liveObjects.values()], this.multiFrame.center, res.center, scaleX, scaleY);
      for (const c of changes) {
        const o = this.liveObjects.get(c.id)!;
        o.position = c.after.position;
        o.width = c.after.width;
        o.height = c.after.height;
        this.renderer.syncObject(o);
      }
      this.renderer.setLiveFrame({ center: res.center, rotation: 0, width: res.width, height: res.height });
    }
  }

  private updateRotate(world: Vec2, shift: boolean): void {
    const center = this.rotateStart!.center;
    const angle = Math.atan2(world.y - center.y, world.x - center.x);
    const delta = angle - this.rotateStart!.angle;
    let deltaDeg = (delta * 180) / Math.PI;
    if (shift) deltaDeg = snapAngle(deltaDeg, 15);
    const ids = [...this.liveObjects.keys()];
    if (ids.length === 1) {
      const o = this.liveObjects.get(ids[0])!;
      const newRot = o.rotation + deltaDeg;
      o.rotation = newRot;
      this.renderer.syncObject(o);
      this.renderer.setLiveFrame({ center: o.position, rotation: newRot, width: o.width, height: o.height });
    } else {
      const changes = rotateObjectsAround([...this.liveObjects.values()], center, deltaDeg);
      for (const c of changes) {
        const o = this.liveObjects.get(c.id)!;
        o.position = c.after.position;
        o.rotation = c.after.rotation;
        this.renderer.syncObject(o);
      }
      this.renderer.setLiveFrame(this.frameOfLive());
    }
    this.rotateStart!.angle = angle;
  }

  private updateWallDrag(world: Vec2): void {
    if (!this.wallLive) return;
    const rawDelta = { x: world.x - this.startWorld.x, y: world.y - this.startWorld.y };
    const candidate = { x: this.wallLive.before.start.x + rawDelta.x, y: this.wallLive.before.start.y + rawDelta.y };
    const snapResult = this.snapPoint(candidate, new Set());
    const adj = { x: snapResult.point.x - this.wallLive.before.start.x, y: snapResult.point.y - this.wallLive.before.start.y };
    this.wallLive.wall.start = { x: this.wallLive.before.start.x + adj.x, y: this.wallLive.before.start.y + adj.y };
    this.wallLive.wall.end = { x: this.wallLive.before.end.x + adj.x, y: this.wallLive.before.end.y + adj.y };
    this.renderer.syncWall(this.wallLive.wall);
    this.renderer.setLiveWall(this.wallLive.wall);
  }

  private updateWallEndpoint(world: Vec2): void {
    if (!this.wallLive || !this.wallEndpoint) return;
    const snapResult = this.snapPoint(world, new Set());
    this.wallLive.wall[this.wallEndpoint] = { ...snapResult.point };
    this.renderer.syncWall(this.wallLive.wall);
    this.renderer.setLiveWall(this.wallLive.wall);
  }

  private updateOpeningDrag(world: Vec2): void {
    if (!this.openingLive) return;
    const w = this.openingLive.wall;
    const proj = projectPointOnSegment(world, w.start, w.end);
    const t = Math.max(0.05, Math.min(0.95, proj.t));
    this.openingLive.opening.tOffset = t;
    const wall = { ...w, openings: w.openings.map((o) => (o.id === this.openingLive!.opening.id ? this.openingLive!.opening : o)) };
    this.renderer.syncWall(wall);
  }

  onPointerUp = (e: PointerEvent) => {
    try {
      this.renderer.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    switch (this.mode) {
      case "marquee": {
        const world = this.renderer.pointerToWorld(e.clientX, e.clientY);
        if (this.moved) {
          const rect = this.rectFrom(this.startWorld, world);
          const ids = this.renderer.marqueeSelected(rect, this.store.venue);
          const targets: SelectionTarget[] = ids.map((id) => ({ kind: "object", id }));
          if (e.shiftKey) this.store.addToSelection(targets);
          else this.store.setSelection(targets);
        }
        this.renderer.clearPreview();
        break;
      }
      case "drag":
        this.commitTransform();
        break;
      case "resize":
      case "rotate":
        this.commitTransform();
        break;
      case "wallDrag":
      case "wallEndpoint": {
        if (this.wallLive && this.moved) {
          this.store.dispatch({
            kind: "UPDATE_WALL",
            id: this.wallLive.wall.id,
            before: { start: this.wallLive.before.start, end: this.wallLive.before.end, thickness: this.wallLive.wall.thickness, height: this.wallLive.wall.height },
            after: { start: this.wallLive.wall.start, end: this.wallLive.wall.end, thickness: this.wallLive.wall.thickness, height: this.wallLive.wall.height }
          });
        }
        break;
      }
      case "openingDrag": {
        if (this.openingLive && this.moved) {
          const t = this.openingLive.opening.tOffset;
          const wall = this.store.venue.walls.find((w) => w.id === this.openingLive!.wall.id)!;
          const op = wall.openings.find((o) => o.id === this.openingLive!.opening.id)!;
          this.store.dispatch({
            kind: "UPDATE_OPENING",
            id: op.id,
            before: { tOffset: this.openingLive.before, width: op.width, swing: op.swing },
            after: { tOffset: t, width: op.width, swing: op.swing }
          });
        }
        break;
      }
      case "drawRect": {
        const world = this.renderer.pointerToWorld(e.clientX, e.clientY);
        const rect = this.rectFrom(this.rectStart!, this.maybeSnap(world));
        if (rect.width > 0.2 && rect.height > 0.2) {
          const type = this.drawType === "aisle" ? "aisle" : "zone";
          const obj = this.store.addObjectAt(type, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          this.store.updateTransform(obj, { width: rect.width, height: rect.height });
          this.store.setTool("select");
        }
        this.renderer.clearPreview();
        break;
      }
      case "measure": {
        this.renderer.clearPreview();
        this.onMeasure?.(null);
        break;
      }
    }
    this.mode = "idle";
    this.liveObjects.clear();
    this.dragged = [];
    this.multiFrame = null;
    this.grabbedHandle = null;
    this.wallLive = null;
    this.wallEndpoint = null;
    this.openingLive = null;
    this.rotateStart = null;
    this.rectStart = null;
  };

  private commitTransform(): void {
    if (!this.moved) return;
    const changes: ObjectTransformChange[] = [...this.liveObjects.keys()].map((id) => {
      const o = this.liveObjects.get(id)!;
      const before = this.initialStates.get(id) ?? {
        position: { ...o.position },
        width: o.width,
        height: o.height,
        rotation: o.rotation
      };
      return {
        id,
        before,
        after: { position: { ...o.position }, width: o.width, height: o.height, rotation: o.rotation }
      };
    });
    if (changes.length > 0) {
      this.store.dispatch({ kind: "TRANSFORM_OBJECTS", changes });
    }
  }

  private commitCamera(cam: Camera): void {
    this.store.setCamera(cam);
    this.renderer.setCamera(cam);
  }

  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.renderer.canvas.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = Math.pow(1.0009, -e.deltaY);
    const next = zoomToward(this.renderer.camera, screenPoint, factor);
    this.commitCamera(next);
  };

  onDoubleClick = () => {
    if (this.wallDrawing) {
      this.wallDrawing = false;
      this.wallStart = null;
      this.renderer.clearPreview();
    }
  };

  cancelTool(): void {
    if (this.wallDrawing) {
      this.wallDrawing = false;
      this.wallStart = null;
    }
    this.renderer.clearPreview();
    this.renderer.clearOverlay();
    this.mode = "idle";
  }

  onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space" && !isTyping(e)) {
      this.spacePan = true;
    }
  };
  onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") this.spacePan = false;
  };
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
