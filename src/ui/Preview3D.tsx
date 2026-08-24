"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Venue, VenueObject, Wall } from "@/model/types";
import { TYPE_TO_DEFINITION } from "@/model/objectDefs";

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

  group.position.set(obj.position.x, 0, -obj.position.y);
  group.rotation.y = obj.rotation;
  return group;
}

function buildWallMesh(wall: Wall): THREE.Object3D {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy) || 0.01;
  const th = Math.max(0.05, wall.thickness);
  const h = Math.max(0.1, wall.height || 3);

  const geo = new THREE.BoxGeometry(len, h, th);
  const mat = new THREE.MeshStandardMaterial({
    color: toColor(wall.style.fill, "#6f8aa6"),
    roughness: 0.9,
    metalness: 0.05
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;

  const group = new THREE.Group();
  group.add(mesh);
  const cx = (wall.start.x + wall.end.x) / 2;
  const cy = (wall.start.y + wall.end.y) / 2;
  group.position.set(cx, 0, -cy);
  group.rotation.y = Math.atan2(dy, dx);
  return group;
}

export const Preview3D: React.FC<{ venue: Venue }> = ({ venue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const contentRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);

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

    camera.position.set(cx - span * 0.4, span * 0.9, -cy + span * 0.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, 0, -cy);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(cx + span, span * 1.5, -cy + span);
    scene.add(dir);

    const floorSize = span + 20;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ color: 0x161a21, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, -0.01, -cy);
    scene.add(floor);

    const grid = new THREE.GridHelper(floorSize, Math.max(10, Math.round(floorSize / 2)), 0x2a3340, 0x20262f);
    grid.position.set(cx, 0, -cy);
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

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
      content.add(buildWallMesh(w));
    }
    for (const o of venue.objects) {
      if (o.hidden) continue;
      content.add(buildObjectMesh(o));
    }
  }, [venue]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-editor-panel/80 text-editor-muted text-xs pointer-events-none">
        3D Preview · drag to orbit, scroll to zoom
      </div>
    </div>
  );
};
