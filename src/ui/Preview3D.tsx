"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Venue, VenueObject, Wall, WallOpening } from "@/model/types";
import { TYPE_TO_DEFINITION } from "@/model/objectDefs";
import { useEditorStore } from "@/state/store";
import { createOpening } from "@/model/factory";
import { projectPointOnSegment } from "@/lib/geometry";
import { buildModel } from "@/renderer/three/modelAssets";

interface SavedCamera {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

let savedCamera: SavedCamera | null = null;

function contentBounds(venue: Venue) {
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
  for (const o of venue.objects) {
    if (o.hidden) continue;
    add(o.position.x - o.width / 2, o.position.y - o.height / 2);
    add(o.position.x + o.width / 2, o.position.y + o.height / 2);
  }
  for (const w of venue.walls) {
    if (w.hidden) continue;
    add(w.start.x, w.start.y);
    add(w.end.x, w.end.y);
  }
  if (!isFinite(minX)) return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  return { minX, minY, maxX, maxY };
}

function toColor(hex: string, fallback = "#8899aa"): THREE.Color {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color(fallback);
  }
}

function buildObjectMesh(obj: VenueObject): THREE.Object3D {
  const def = TYPE_TO_DEFINITION[obj.type];
  const d3 = def?.threeD;
  const h = Math.max(0.01, d3?.height ?? 0.8);
  const w = Math.max(0.05, obj.width);
  const d = Math.max(0.05, obj.height);

  const group = new THREE.Group();
  const isOverlay = (d3?.material ?? "") === "overlay" || (d3?.material ?? "") === "paint";

  if (!isOverlay) {
    const model = buildModel(d3?.model, w, d, h);
    if (model) {
      group.add(model);
    }
  }

  if (group.children.length === 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: toColor(obj.style.fill),
      roughness: 0.85,
      metalness: (d3?.material ?? "") === "metal" ? 0.6 : 0.05,
      transparent: isOverlay,
      opacity: isOverlay ? 0.35 : obj.style.fillOpacity ?? 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    group.add(mesh);
  }

  group.position.set(obj.position.x, 0, obj.position.y);
  group.rotation.y = -obj.rotation * (Math.PI / 180);
  return group;
}

function buildWallMesh(wall: Wall): THREE.Object3D {
  const group = new THREE.Group();
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 0.01;
  const th = Math.max(0.05, wall.thickness);
  const h = Math.max(0.1, wall.height || 3);
  const angle = Math.atan2(-dy, dx);
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  group.position.set(cx, 0, cy);
  group.rotation.y = angle;

  const mat = new THREE.MeshStandardMaterial({
    color: toColor(wall.style.fill, "#6f8aa6"),
    roughness: 0.9,
    metalness: 0.05
  });

  const gaps = wall.openings
    .map((op) => {
      const half = (Math.max(0.1, op.width) / 2) / len;
      return [Math.min(1, Math.max(0, op.tOffset - half)), Math.min(1, Math.max(0, op.tOffset + half))] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);

  let cursor = 0;
  for (const [a, b] of gaps) {
    if (a > cursor) {
      const segLen = len * (a - cursor);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, h, th), mat);
      const midT = (cursor + a) / 2;
      seg.position.set(len * midT - len / 2, h / 2, 0);
      group.add(seg);
    }
    cursor = Math.max(cursor, b);
  }
  if (cursor < 1) {
    const segLen = len * (1 - cursor);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, h, th), mat);
    const midT = (cursor + 1) / 2;
    seg.position.set(len * midT - len / 2, h / 2, 0);
    group.add(seg);
  }

  return group;
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function buildOpeningMesh(wall: Wall, op: WallOpening): THREE.Object3D {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 0.01;
  const th = Math.max(0.05, wall.thickness);
  const wallH = Math.max(0.1, wall.height || 3);
  const w = Math.max(0.1, op.width);
  const angle = Math.atan2(-dy, dx);
  const t = Math.min(1, Math.max(0, op.tOffset));
  const cx = wall.start.x + dx * t;
  const cy = wall.start.y + dy * t;

  const group = new THREE.Group();
  group.position.set(cx, 0, cy);
  group.rotation.y = angle;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe6e8ec, roughness: 0.55, metalness: 0.05 });
  const jambW = Math.min(0.12, w * 0.12);

  if (op.type === "window") {
    const paneH = Math.min(1.3, wallH * 0.5);
    const sillY = Math.min(wallH * 0.5, 0.95);
    const topY = sillY + paneH;
    const glassMat = new THREE.MeshStandardMaterial({
      color: toColor(op.style.fill, "#8fc4ff"),
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.15
    });

    group.add(box(jambW, paneH + 0.18, th, frameMat).translateX(-w / 2 + jambW / 2).translateY(sillY + paneH / 2));
    group.add(box(jambW, paneH + 0.18, th, frameMat).translateX(w / 2 - jambW / 2).translateY(sillY + paneH / 2));
    group.add(box(w, 0.1, th, frameMat).translateY(sillY + 0.05));
    group.add(box(w, 0.1, th, frameMat).translateY(topY + 0.05));
    group.add(box(w - 2 * jambW, paneH, 0.02, glassMat).translateY(sillY + paneH / 2));
    group.add(box(0.04, paneH, 0.05, frameMat).translateY(sillY + paneH / 2));
    group.add(box(w - 2 * jambW, 0.04, 0.05, frameMat).translateY(sillY + paneH / 2));
  } else {
    const leafH = wallH - 0.12;
    const leafW = w - 2 * jambW;
    const leafMat = new THREE.MeshStandardMaterial({
      color: toColor(op.style.fill, "#9a6630"),
      roughness: 0.65,
      metalness: 0.05
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 0.85 });

    group.add(box(jambW, wallH, th, frameMat).translateX(-w / 2 + jambW / 2).translateY(wallH / 2));
    group.add(box(jambW, wallH, th, frameMat).translateX(w / 2 - jambW / 2).translateY(wallH / 2));
    group.add(box(w, 0.12, th, frameMat).translateY(wallH - 0.06));

    const hinge = new THREE.Group();
    hinge.position.set(-w / 2 + jambW, 0.06, 0);
    hinge.rotation.y = -0.5;
    const leaf = box(leafW, leafH, 0.05, leafMat);
    leaf.position.set(leafW / 2, leafH / 2, 0);
    hinge.add(leaf);
    const handle = box(0.05, 0.05, 0.1, metalMat);
    handle.position.set(leafW - 0.07, leafH * 0.5, 0.07);
    hinge.add(handle);
    group.add(hinge);
  }
  return group;
}

export const Preview3D: React.FC<{ venue: Venue }> = ({ venue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tool = useEditorStore((s) => s.tool);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const contentRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const wallMeshesRef = useRef<THREE.Object3D[]>([]);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(venue.background || "#0f1115");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      5000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    rendererRef.current = renderer;

    const bounds = contentBounds(venue);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 5);

    camera.position.set(cx - span * 0.4, span * 0.9, cy + span * 0.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, 0, cy);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    if (savedCamera) {
      camera.position.set(savedCamera.px, savedCamera.py, savedCamera.pz);
      controls.target.set(savedCamera.tx, savedCamera.ty, savedCamera.tz);
    }
    controls.update();
    controlsRef.current = controls;

    const saveCamera = () => {
      savedCamera = {
        px: camera.position.x,
        py: camera.position.y,
        pz: camera.position.z,
        tx: controls.target.x,
        ty: controls.target.y,
        tz: controls.target.z
      };
    };
    controls.addEventListener("change", saveCamera);
    saveCamera();

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(cx + span, span * 1.5, cy + span);
    scene.add(dir);

    const floorSize = span + 20;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, -0.01, cy);
    scene.add(floor);

    const grid = new THREE.GridHelper(floorSize, Math.max(10, Math.round(floorSize / 2)), 0x2a3340, 0x20262f);
    grid.position.set(cx, 0, cy);
    scene.add(grid);

    const content = new THREE.Group();
    contentRef.current = content;
    scene.add(content);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onDown = (e: PointerEvent) => {
      downPosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const start = downPosRef.current;
      downPosRef.current = null;
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
      const tool = useEditorStore.getState().tool;

      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      if (tool === "select") {
        if (!contentRef.current) return;
        const hits = raycaster.intersectObjects(contentRef.current.children, true);
        if (hits.length === 0) {
          useEditorStore.getState().clearSelection();
          return;
        }
        let o: THREE.Object3D | null = hits[0].object;
        let target: any = null;
        while (o && !target) {
          if (o.userData.objectId) target = { kind: "object", id: o.userData.objectId };
          else if (o.userData.openingId && o.userData.wallId) target = { kind: "opening", id: o.userData.openingId, wallId: o.userData.wallId };
          else if (o.userData.wallId) target = { kind: "wall", id: o.userData.wallId };
          o = o.parent;
        }
        if (target) {
          if (e.shiftKey) useEditorStore.getState().toggleSelection(target);
          else useEditorStore.getState().setSelection([target]);
        } else {
          useEditorStore.getState().clearSelection();
        }
        return;
      }

      if (tool !== "door" && tool !== "window") return;

      const hits = raycaster.intersectObjects(wallMeshesRef.current, true);
      if (hits.length === 0) return;
      let o: THREE.Object3D | null = hits[0].object;
      let wallId: string | undefined;
      while (o && !wallId) {
        wallId = o.userData.wallId as string | undefined;
        o = o.parent;
      }
      if (!wallId) return;
      const p = hits[0].point;
      const world = { x: p.x, y: p.z };
      const wall = useEditorStore.getState().venue.walls.find((w) => w.id === wallId);
      if (!wall) return;
      const proj = projectPointOnSegment(world, wall.start, wall.end);
      const opening = createOpening(tool, wall.id, proj.t, tool === "door" ? 1.0 : 1.2);
      useEditorStore.getState().dispatch({ kind: "ADD_OPENING", opening });
      useEditorStore.getState().setSelection([{ kind: "opening", id: opening.id, wallId: wall.id }]);
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.removeEventListener("change", saveCamera);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      sceneRef.current = null;
      rendererRef.current = null;
      contentRef.current = null;
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    const scene = sceneRef.current;
    if (!content || !scene) return;
    if (sceneRef.current) {
      scene.background = new THREE.Color(venue.background || "#0f1115");
    }
    wallMeshesRef.current = [];
    while (content.children.length) {
      const c = content.children[0] as THREE.Mesh | THREE.Group;
      content.remove(c);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
    }
    for (const w of venue.walls) {
      if (w.hidden) continue;
      const m = buildWallMesh(w);
      m.userData.wallId = w.id;
      wallMeshesRef.current.push(m);
      content.add(m);
      for (const op of w.openings) {
        const om = buildOpeningMesh(w, op);
        om.userData.openingId = op.id;
        om.userData.wallId = w.id;
        content.add(om);
      }
    }
    for (const o of venue.objects) {
      if (o.hidden) continue;
      const om = buildObjectMesh(o);
      om.userData.objectId = o.id;
      content.add(om);
    }
  }, [venue]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-editor-panel/80 text-editor-muted text-xs pointer-events-none">
        3D Preview · drag to orbit, right-click to pan, scroll to zoom
        {tool === "door" && <div className="text-editor-accent">Click a wall to add a door</div>}
        {tool === "window" && <div className="text-editor-accent">Click a wall to add a window</div>}
      </div>
    </div>
  );
};
