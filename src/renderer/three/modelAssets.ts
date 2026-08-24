import * as THREE from "three";

/**
 * Reusable 3D object models for the preview.
 *
 * Each model is built procedurally and keyed by an `assetId` (the same id used
 * in an object definition's `threeD.model`). This mirrors the 2D asset system:
 * to support a new realistic model later, add a builder here and register it —
 * the renderer does not need to change. A real glTF/GLB loader can be dropped in
 * behind `buildModel` without affecting callers.
 *
 * Builders receive the object footprint (w, d in world units) and the model
 * height (h) and return geometry sitting on the floor (y in [0, h]).
 */
export type ModelBuilder = (w: number, d: number, h: number) => THREE.Object3D;

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.8 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xb9824a, roughness: 0.7 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.95 }),
  fabricWarm: new THREE.MeshStandardMaterial({ color: 0x7a3b3b, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.7 }),
  speaker: new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x8fc4ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x0b1b33, roughness: 0.3, emissive: 0x1f3f6b, emissiveIntensity: 0.4 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.9 }),
  pot: new THREE.MeshStandardMaterial({ color: 0x9c6b43, roughness: 0.9 })
};

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d)), mat);
}

function centered(mesh: THREE.Mesh, yCenter: number): THREE.Mesh {
  mesh.position.y = yCenter;
  return mesh;
}

export const THREE_MODEL_REGISTRY: Record<string, ModelBuilder> = {
  chair: (w, d, h) => {
    const g = new THREE.Group();
    const seatH = h * 0.5;
    g.add(centered(box(w, seatH, d, MAT.fabric), seatH / 2));
    g.add(centered(box(w, h - seatH, d * 0.18, MAT.fabric), seatH + (h - seatH) / 2));
    const leg = 0.06;
    const offX = w / 2 - leg / 2 - 0.02;
    const offZ = d / 2 - leg / 2 - 0.02;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(centered(box(leg, h * 0.5, leg, MAT.dark), h * 0.25).translateX(sx * offX).translateZ(sz * offZ));
      }
    }
    return g;
  },
  table: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h * 0.15, d, MAT.woodLight), h - h * 0.075));
    const leg = 0.08;
    const offX = w / 2 - leg / 2 - 0.03;
    const offZ = d / 2 - leg / 2 - 0.03;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        g.add(centered(box(leg, h * 0.85, leg, MAT.wood), h * 0.85 / 2).translateX(sx * offX).translateZ(sz * offZ));
      }
    }
    return g;
  },
  sofa: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h * 0.45, d * 0.35, MAT.fabric), h * 0.225));
    g.add(centered(box(w * 0.12, h * 0.7, d, MAT.fabric), h * 0.35).translateX(-w / 2 + w * 0.06));
    g.add(centered(box(w * 0.12, h * 0.7, d, MAT.fabric), h * 0.35).translateX(w / 2 - w * 0.06));
    g.add(centered(box(w * 0.7, h * 0.35, d * 0.6, MAT.fabric), h * 0.5).translateZ(d * 0.05));
    return g;
  },
  stage: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h, d, MAT.wood), h / 2));
    g.add(centered(box(w * 1.02, h * 0.06, d * 1.02, MAT.dark), h));
    return g;
  },
  booth: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h * 0.5, d * 0.22, MAT.fabricWarm), h * 0.25).translateZ(-d / 2 + d * 0.11));
    g.add(centered(box(w, h * 0.5, d * 0.22, MAT.fabricWarm), h * 0.25).translateZ(d / 2 - d * 0.11));
    g.add(centered(box(w * 0.5, h * 0.4, d * 0.5, MAT.woodLight), h * 0.2).translateZ(0));
    return g;
  },
  counter: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h * 0.9, d, MAT.wood), h * 0.45));
    g.add(centered(box(w, h * 0.1, d, MAT.dark), h * 0.95));
    return g;
  },
  desk: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h * 0.12, d, MAT.woodLight), h - h * 0.06));
    g.add(centered(box(w * 0.2, h * 0.7, d * 0.2, MAT.dark), h * 0.35).translateX(-w / 2 + w * 0.1));
    g.add(centered(box(w * 0.2, h * 0.7, d * 0.2, MAT.dark), h * 0.35).translateX(w / 2 - w * 0.1));
    return g;
  },
  speaker: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w, h, d, MAT.speaker), h / 2));
    const r = Math.min(w, d) * 0.35;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, h * 0.1, 20), MAT.dark);
    cone.position.y = h * 0.55;
    g.add(cone);
    return g;
  },
  screen: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w * 0.1, h * 0.1, d, MAT.dark), h * 0.05));
    const panel = centered(box(w, h * 0.85, d * 0.1, MAT.screen), h * 0.5);
    panel.position.z = d / 2 - d * 0.05;
    g.add(panel);
    return g;
  },
  floor_mark: (w, d, h) => {
    const g = new THREE.Group();
    const m = MAT.plant.clone();
    m.transparent = true;
    m.opacity = 0.4;
    g.add(centered(box(w, Math.max(0.02, h), d, m), Math.max(0.02, h) / 2));
    return g;
  },
  plant: (w, d, h) => {
    const g = new THREE.Group();
    g.add(centered(box(w * 0.6, h * 0.4, d * 0.6, MAT.pot), h * 0.2));
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.5, 16, 12), MAT.plant);
    foliage.position.y = h * 0.7;
    foliage.scale.y = 0.8;
    g.add(foliage);
    return g;
  }
};

export function buildModel(modelId: string | undefined, w: number, d: number, h: number): THREE.Object3D | null {
  if (!modelId) return null;
  const builder = THREE_MODEL_REGISTRY[modelId];
  return builder ? builder(w, d, h) : null;
}
