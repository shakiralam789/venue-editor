import { Application, Container, Graphics } from "pixi.js";
import type { Camera } from "@/lib/geometry";
import {
  worldToScreen,
  screenToWorld,
  rotatedRectBounds,
  rectsIntersect
} from "@/lib/geometry";
import type { Vec2, Unit } from "@/model/units";
import type { SelectionTarget, Venue, VenueObject, Wall } from "@/model/types";
import { drawObjectView } from "@/renderer/objectRenderers";
import { drawWallView } from "@/renderer/wallRenderer";
import { drawGrid } from "@/renderer/grid";
import { TransformOverlay, handlePositions } from "@/renderer/transformOverlay";
import type { TransformFrame } from "@/renderer/transformOverlay";

type OverlayState =
  | { type: "frame"; frame: TransformFrame }
  | { type: "wall"; wall: Wall }
  | null;

export class PixiRenderer {
  app!: Application;
  camera: Camera = { x: 0, y: 0, scale: 80 };
  private gridG = new Graphics();
  private worldContainer = new Container();
  private wallLayer = new Container();
  private objectLayer = new Container();
  private overlay = new TransformOverlay();
  private previewG = new Graphics();
  private objectMap = new Map<string, Container>();
  private wallMap = new Map<string, Container>();
  private overlayState: OverlayState = null;
  private unit: Unit = "m";
  private viewport = { width: 800, height: 600 };
  private initialized = false;

  constructor() {
    this.wallLayer.sortableChildren = true;
    this.objectLayer.sortableChildren = true;
    this.previewG.eventMode = "none";
    this.worldContainer.addChild(this.wallLayer, this.objectLayer, this.previewG, this.overlay.container);
  }

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      background: "#0f1115",
      antialias: true,
      resizeTo: container,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    });
    container.appendChild(this.app.canvas);
    this.app.canvas.style.display = "block";
    this.app.canvas.style.touchAction = "none";

    this.app.stage.addChild(this.gridG);
    this.app.stage.addChild(this.worldContainer);

    this.viewport = { width: this.app.screen.width, height: this.app.screen.height };
    this.app.renderer.on("resize", () => {
      this.viewport = { width: this.app.screen.width, height: this.app.screen.height };
      this.redrawGrid();
      this.redrawOverlay();
    });
    this.onResize = () => {
      this.viewport = { width: this.app.screen.width, height: this.app.screen.height };
      this.applyCamera();
    };
    window.addEventListener("resize", this.onResize);
    this.applyCamera();
    this.initialized = true;
  }

  private onResize?: () => void;

  destroy(): void {
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    this.app?.destroy(true, { children: true });
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
    this.applyCamera();
  }

  private applyCamera(): void {
    const { x, y, scale } = this.camera;
    this.worldContainer.scale.set(scale);
    this.worldContainer.position.set(-x * scale, -y * scale);
    this.redrawGrid();
    this.redrawOverlay();
  }

  private redrawGrid(): void {
    drawGrid(
      this.gridG,
      this.camera,
      this.viewport.width,
      this.viewport.height,
      this.gridSize,
      this.showGrid,
      this.background
    );
  }

  private gridSize = 1;
  private showGrid = true;
  private background = "#0f1115";

  setVenueMeta(venue: Venue): void {
    this.gridSize = venue.gridSize;
    this.showGrid = venue.showGrid;
    this.background = venue.background;
    this.unit = venue.unit;
    this.redrawGrid();
  }

  screenToWorld(p: Vec2): Vec2 {
    const rect = this.app.canvas.getBoundingClientRect();
    return screenToWorld(this.camera, { x: p.x - rect.left, y: p.y - rect.top });
  }

  worldToScreen(p: Vec2): Vec2 {
    const rect = this.app.canvas.getBoundingClientRect();
    const s = worldToScreen(this.camera, p);
    return { x: s.x + rect.left, y: s.y + rect.top };
  }

  pointerToWorld(clientX: number, clientY: number): Vec2 {
    const rect = this.app.canvas.getBoundingClientRect();
    return screenToWorld(this.camera, { x: clientX - rect.left, y: clientY - rect.top });
  }

  fitToContent(venue: Venue, padding = 80): void {
    const all: VenueObject[] = venue.objects;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const add = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const o of all) {
      const b = rotatedRectBounds(
        { x: o.position.x - o.width / 2, y: o.position.y - o.height / 2, width: o.width, height: o.height },
        o.rotation,
        o.position
      );
      add(b.x, b.y);
      add(b.x + b.width, b.y + b.height);
    }
    for (const w of venue.walls) {
      add(w.start.x, w.start.y);
      add(w.end.x, w.end.y);
    }
    if (!isFinite(minX)) {
      this.setCamera({ x: 0, y: 0, scale: 80 });
      return;
    }
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const scale = Math.min(
      (this.viewport.width - padding * 2) / bw,
      (this.viewport.height - padding * 2) / bh
    );
    const clamped = Math.max(0.05, Math.min(8, scale));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.setCamera({
      x: cx - this.viewport.width / 2 / clamped,
      y: cy - this.viewport.height / 2 / clamped,
      scale: clamped
    });
  }

  syncVenue(venue: Venue): void {
    this.setVenueMeta(venue);
    const seen = new Set<string>();
    const sorted = [...venue.objects].sort((a, b) => a.z - b.z);
    for (const obj of sorted) {
      seen.add(obj.id);
      let c = this.objectMap.get(obj.id);
      if (!c) {
        c = new Container();
        c.label = obj.id;
        this.objectMap.set(obj.id, c);
        this.objectLayer.addChild(c);
      }
      c.zIndex = obj.z;
      drawObjectView(c, obj);
    }
    for (const [id, c] of this.objectMap) {
      if (!seen.has(id)) {
        c.destroy({ children: true });
        this.objectMap.delete(id);
      }
    }

    const wallSeen = new Set<string>();
    const sortedWalls = [...venue.walls].sort((a, b) => a.z - b.z);
    for (const wall of sortedWalls) {
      wallSeen.add(wall.id);
      let c = this.wallMap.get(wall.id);
      if (!c) {
        c = new Container();
        c.label = wall.id;
        this.wallMap.set(wall.id, c);
        this.wallLayer.addChild(c);
      }
      c.zIndex = wall.z;
      drawWallView(c, wall);
    }
    for (const [id, c] of this.wallMap) {
      if (!wallSeen.has(id)) {
        c.destroy({ children: true });
        this.wallMap.delete(id);
      }
    }
    this.redrawOverlay();
  }

  syncObject(obj: VenueObject): void {
    let c = this.objectMap.get(obj.id);
    if (!c) {
      c = new Container();
      c.label = obj.id;
      this.objectMap.set(obj.id, c);
      this.objectLayer.addChild(c);
    }
    c.zIndex = obj.z;
    drawObjectView(c, obj);
  }

  syncWall(wall: Wall): void {
    let c = this.wallMap.get(wall.id);
    if (!c) {
      c = new Container();
      c.label = wall.id;
      this.wallMap.set(wall.id, c);
      this.wallLayer.addChild(c);
    }
    drawWallView(c, wall);
  }

  getObjectContainer(id: string): Container | undefined {
    return this.objectMap.get(id);
  }

  setSelection(selection: SelectionTarget[], venue: Venue): void {
    const walls = selection.filter((s) => s.kind === "wall").map((s) => venue.walls.find((w) => w.id === s.id)).filter(Boolean) as Wall[];
    const objs = selection
      .filter((s) => s.kind === "object")
      .map((s) => venue.objects.find((o) => o.id === s.id))
      .filter(Boolean) as VenueObject[];
    if (walls.length === 1 && objs.length === 0) {
      this.overlayState = { type: "wall", wall: walls[0] };
    } else if (objs.length > 0) {
      this.overlayState = { type: "frame", frame: this.computeFrame(objs) };
    } else {
      this.overlayState = null;
    }
    this.redrawOverlay();
  }

  private computeFrame(objs: VenueObject[]): TransformFrame {
    if (objs.length === 1) {
      const o = objs[0];
      return { center: { ...o.position }, rotation: o.rotation, width: o.width, height: o.height };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const o of objs) {
      const b = rotatedRectBounds(
        { x: o.position.x - o.width / 2, y: o.position.y - o.height / 2, width: o.width, height: o.height },
        o.rotation,
        o.position
      );
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    return {
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      rotation: 0,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  setLiveFrame(frame: TransformFrame): void {
    this.overlayState = { type: "frame", frame };
    this.redrawOverlay();
  }

  setLiveWall(wall: Wall): void {
    this.overlayState = { type: "wall", wall };
    this.redrawOverlay();
  }

  clearOverlay(): void {
    this.overlayState = null;
    this.overlay.clear();
  }

  private redrawOverlay(): void {
    this.overlay.clear();
    if (!this.overlayState) return;
    if (this.overlayState.type === "frame") {
      this.overlay.drawFrame(this.overlayState.frame, this.camera.scale, this.unit, { rotation: true });
    } else {
      this.overlay.drawWall(this.overlayState.wall, this.camera.scale);
    }
  }

  drawGuides(guides: { x?: number; y?: number }[]): void {
    this.overlay.clear();
    if (this.overlayState?.type === "frame") this.overlay.drawFrame(this.overlayState.frame, this.camera.scale, this.unit, { rotation: true });
    if (this.overlayState?.type === "wall") this.overlay.drawWall(this.overlayState.wall, this.camera.scale);
    this.overlay.drawGuides(guides, this.camera.scale, this.viewport.width, this.viewport.height);
  }

  drawMarquee(rect: { x: number; y: number; width: number; height: number }): void {
    this.overlay.drawMarquee(rect, this.camera.scale);
  }

  clearTransientOverlay(): void {
    this.redrawOverlay();
  }

  clearPreview(): void {
    this.previewG.clear();
  }

  drawWallPreview(start: Vec2, end: Vec2): void {
    this.previewG.clear();
    this.previewG.moveTo(start.x, start.y).lineTo(end.x, end.y);
    this.previewG.stroke({ width: 0.15, color: 0x4f8cff, alpha: 0.9 });
  }

  drawRectPreview(rect: { x: number; y: number; width: number; height: number }): void {
    this.previewG.clear();
    this.previewG.rect(rect.x, rect.y, rect.width, rect.height);
    this.previewG.fill({ color: 0x4f8cff, alpha: 0.15 });
    this.previewG.stroke({ width: 0.02, color: 0x4f8cff, alpha: 0.9 });
  }

  drawMeasure(p1: Vec2, p2: Vec2, text?: string): void {
    this.previewG.clear();
    this.previewG.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y);
    this.previewG.stroke({ width: 0.03, color: 0x46d18a, alpha: 1 });
    this.previewG.circle(p1.x, p1.y, 0.08).fill({ color: 0x46d18a });
    this.previewG.circle(p2.x, p2.y, 0.08).fill({ color: 0x46d18a });
  }

  getHandlePositions(): { role: string; x: number; y: number }[] {
    if (this.overlayState?.type !== "frame") return [];
    return handlePositions(this.overlayState.frame, this.camera.scale);
  }

  get currentFrame(): TransformFrame | null {
    return this.overlayState?.type === "frame" ? this.overlayState.frame : null;
  }

  get currentWall(): Wall | null {
    return this.overlayState?.type === "wall" ? this.overlayState.wall : null;
  }

  hitTestObjects(point: Vec2, venue: Venue, opts: { onlySelectable: boolean }): VenueObject | null {
    const sorted = [...venue.objects].sort((a, b) => b.z - a.z);
    for (const o of sorted) {
      if (opts.onlySelectable && (o.locked || o.hidden)) continue;
      if (this.pointInObject(point, o)) return o;
    }
    return null;
  }

  private pointInObject(p: Vec2, o: VenueObject): boolean {
    const local = { x: p.x - o.position.x, y: p.y - o.position.y };
    const cos = Math.cos((-o.rotation * Math.PI) / 180);
    const sin = Math.sin((-o.rotation * Math.PI) / 180);
    const rx = local.x * cos - local.y * sin;
    const ry = local.x * sin + local.y * cos;
    return Math.abs(rx) <= o.width / 2 && Math.abs(ry) <= o.height / 2;
  }

  hitTestWalls(point: Vec2, venue: Venue, thresholdWorld: number): Wall | null {
    for (const w of [...venue.walls].sort((a, b) => b.z - a.z)) {
      const d = this.distToSegment(point, w.start, w.end);
      if (d <= thresholdWorld + w.thickness / 2) return w;
    }
    return null;
  }

  private distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    return Math.hypot(p.x - cx, p.y - cy);
  }

  hitTestHandle(point: Vec2, scale: number): string | null {
    const handles = this.getHandlePositions();
    const r = 12 / scale;
    for (const h of handles) {
      if (Math.hypot(point.x - h.x, point.y - h.y) <= r) return h.role;
    }
    return null;
  }

  marqueeSelected(rect: { x: number; y: number; width: number; height: number }, venue: Venue): string[] {
    const ids: string[] = [];
    for (const o of venue.objects) {
      if (o.locked || o.hidden) continue;
      const b = rotatedRectBounds(
        { x: o.position.x - o.width / 2, y: o.position.y - o.height / 2, width: o.width, height: o.height },
        o.rotation,
        o.position
      );
      if (rectsIntersect(rect, b)) ids.push(o.id);
    }
    return ids;
  }
}
