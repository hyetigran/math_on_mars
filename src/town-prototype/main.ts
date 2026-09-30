import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import "./style.css";

// Isolated, in-memory camera/art experiment. No cadet saves or economy mutations.
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9ad92);
scene.fog = new THREE.Fog(0xd9ad92, 65, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0xd9ad92);
$("scene").append(renderer.domElement);
renderer.domElement.setAttribute(
  "aria-label",
  "Town scene; use the camera and building buttons for controls",
);
const overview = new THREE.OrthographicCamera(-25, 25, 20, -20, 0.1, 200);
const walking = new THREE.PerspectiveCamera(58, 1, 0.1, 160);
let camera: THREE.Camera = overview;
const orbit = new OrbitControls(overview, renderer.domElement);
orbit.enableDamping = true;
orbit.minZoom = 0.65;
orbit.maxZoom = 2.3;
orbit.minPolarAngle = 0.25;
orbit.maxPolarAngle = 1.25;
orbit.enablePan = false;
const sunlight = new THREE.DirectionalLight(0xffe7c1, 3.2);
sunlight.position.set(-20, 35, 18);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, {
  left: -32,
  right: 32,
  top: 32,
  bottom: -32,
  far: 100,
});
sunlight.shadow.bias = -0.001;
scene.add(sunlight, new THREE.HemisphereLight(0xd7eef2, 0xad7454, 2));
const materials = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.86 }),
    );
  return materials.get(color)!;
}
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function sphere(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  color: number,
) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  color: number,
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
box(scene, 0, -0.45, 0, 220, 0.6, 220, 0xba7656);
cylinder(scene, 0, -0.09, 0, 27, 0.35, 0x9eab7b);
box(scene, 0, 0.1, 0, 5, 0.14, 46, 0xe9d9bd);
box(scene, 0, 0.1, 4, 41, 0.14, 5, 0xe9d9bd);
box(scene, -0.4, 0.16, 5, 13, 0.15, 10, 0xd3c6ac);
box(scene, -12, 0.11, -5, 4, 0.14, 24, 0xe2d7bf);
box(scene, -8, 0.12, -17.4, 19, 0.14, 3.6, 0xe2d7bf);
box(scene, 12, 0.11, -6, 4, 0.14, 23, 0xe2d7bf);
const decorations = new THREE.Group();
scene.add(decorations);
for (let z = -22; z < 24; z += 1.2)
  for (let x = -2; x <= 2; x += 1)
    box(
      decorations,
      x,
      0.183,
      z,
      0.93,
      0.02,
      1.12,
      (Math.round(z * 10) + x) % 3 === 0 ? 0xcdbb9c : 0xddcdb1,
    );
for (let x = -19; x < 20; x += 1.2)
  for (let z = 2; z <= 6; z++)
    box(decorations, x, 0.185, z, 1.12, 0.02, 0.93, 0xddcdb1);
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  box(
    decorations,
    Math.sin(a) * 5.5,
    0.2,
    4 + Math.cos(a) * 5.5,
    0.4,
    0.08,
    0.4,
    0xb79c77,
  );
}
// Batch repeated paving meshes to avoid a draw call per stone.
const pavingGroups = new Map<THREE.Material, THREE.Mesh[]>();
for (const child of [...decorations.children]) {
  if (!(child instanceof THREE.Mesh)) continue;
  const group = pavingGroups.get(child.material) ?? [];
  group.push(child);
  pavingGroups.set(child.material, group);
}
for (const [material, meshes] of pavingGroups) {
  const batch = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    material,
    meshes.length,
  );
  meshes.forEach((mesh, i) => {
    const size = (mesh.geometry as THREE.BoxGeometry).parameters;
    mesh.scale.set(size.width, size.height, size.depth);
    mesh.updateMatrix();
    batch.setMatrixAt(i, mesh.matrix);
    mesh.geometry.dispose();
    decorations.remove(mesh);
  });
  batch.receiveShadow = true;
  decorations.add(batch);
}
const obstacles: { x: number; z: number; w: number; d: number }[] = [];
function tree(x: number, z: number) {
  cylinder(scene, x, 0.25, z, 1, 0.3, 0xc3ab85);
  cylinder(scene, x, 1.15, z, 0.13, 1.9, 0x795344);
  sphere(scene, x, 2.6, z, 1.05, 0x7e9561);
  sphere(scene, x + 0.5, 2.2, z + 0.2, 0.65, 0x9aac75);
  obstacles.push({ x, z, w: 0.7, d: 0.7 });
}
[-17, 12, 18].forEach((x) => tree(x, 11));
for (const x of [-3.5, 3.5])
  for (const z of [-15, 12]) {
    cylinder(scene, x, 1.5, z, 0.07, 3, 0x35514c);
    box(scene, x, 3.08, z, 0.42, 0.5, 0.42, 0xffe4a3);
  }
for (const x of [-7, 7]) {
  box(scene, x, 0.65, 8, 2, 0.18, 0.65, 0x875a42);
  box(scene, x, 0.95, 8.3, 2, 0.6, 0.12, 0x875a42);
}
// Dome ribs and rings keep the enclosing habitat legible without obscuring town views.
const dome = new THREE.Group();
scene.add(dome);
const ribmat = new THREE.LineBasicMaterial({
  color: 0xe8ece2,
  transparent: true,
  opacity: 0.22,
});
for (let i = 0; i < 12; i++) {
  const a = (i * Math.PI) / 6;
  const pts = [];
  for (let j = 0; j <= 48; j++) {
    const t = (j * Math.PI) / 96;
    pts.push(
      new THREE.Vector3(
        Math.cos(t) * 28 * Math.cos(a),
        Math.sin(t) * 28,
        Math.cos(t) * 28 * Math.sin(a),
      ),
    );
  }
  dome.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribmat),
  );
}
for (const h of [7, 16, 23]) {
  const r = Math.sqrt(28 * 28 - h * h),
    pts = [];
  for (let j = 0; j <= 96; j++) {
    const a = (j * Math.PI) / 48;
    pts.push(new THREE.Vector3(r * Math.cos(a), h, r * Math.sin(a)));
  }
  dome.add(
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ribmat),
  );
}
for (let i = 0; i < 24; i++) {
  const a = i * 2.4;
  const r = 75 + (i % 5) * 9;
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(7 + (i % 4) * 3, 8 + (i % 6) * 2, 5),
    mat(i % 2 ? 0xb77b60 : 0xc88d6b),
  );
  hill.position.set(Math.sin(a) * r, 2, Math.cos(a) * r);
  scene.add(hill);
}
function sign(parent: THREE.Object3D, label: string, y: number, z: number) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#294d43";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#fff3d8";
  ctx.font = "500 51px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, 256, 82);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.75),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  mesh.position.set(0, y, z);
  parent.add(mesh);
}
function roof(parent: THREE.Object3D, y: number, w: number, d: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(0, 1.6);
  shape.lineTo(w / 2, 0);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }),
    mat(0x9e503c),
  );
  mesh.position.set(0, y, -d / 2);
  mesh.castShadow = true;
  parent.add(mesh);
}
function windows(parent: THREE.Object3D, y: number, z: number) {
  for (const x of [-1.5, 1.5]) {
    box(parent, x, y, z, 1.05, 1.35, 0.12, 0xf4e4c8);
    box(parent, x, y, z + 0.08, 0.8, 1.1, 0.06, 0x456c70);
    box(parent, x, y, z + 0.13, 0.06, 1.12, 0.05, 0xf4e4c8);
    for (const side of [-1, 1])
      box(parent, x + side * 0.7, y, z, 0.25, 1.35, 0.12, 0x66856b);
  }
}
const buildings: {
  name: string;
  description: string;
  group: THREE.Group;
  x: number;
  z: number;
  rotation: number;
}[] = [
  {
    name: "House",
    description: "A warm home overlooking the plaza.",
    group: new THREE.Group(),
    x: -6,
    z: -3,
    rotation: Math.PI / 2,
  },
  {
    name: "Greenhouse",
    description: "Fresh greens beneath Martian skies.",
    group: new THREE.Group(),
    x: 17,
    z: -10,
    rotation: -Math.PI / 2,
  },
  {
    name: "Bakery",
    description: "Bread, a striped awning, and a place to linger.",
    group: new THREE.Group(),
    x: 6,
    z: 0,
    rotation: -Math.PI / 2,
  },
];
let upgraded = false;
let connectedSnapshot: any = null;
const connectedPlots = ["home", "garden", "market", "edge"];
function buildHouse() {
  const g = buildings[0].group;
  while (g.children.length) {
    const child = g.children[0];
    child.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (o.material instanceof THREE.MeshBasicMaterial) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      }
    });
    g.remove(child);
  }
  const h = upgraded ? 7.4 : 4.4;
  box(g, 0, h / 2, 0, 5.4, h, 5, upgraded ? 0xe7ba83 : 0xe9d1a5);
  box(g, 0, 0.3, 0, 5.65, 0.6, 5.2, 0xb39b7c);
  roof(g, h, 5.9, 5.7);
  box(g, 0, 1.3, 2.56, 1.05, 2.4, 0.15, 0x3e625a);
  windows(g, 3, 2.57);
  if (upgraded) {
    windows(g, 6, 2.57);
    box(g, 0, 4.95, 3.05, 4.6, 0.18, 1.05, 0xd6c4a7);
    for (let x = -2.2; x <= 2.3; x += 0.45)
      box(g, x, 5.45, 3.5, 0.05, 0.9, 0.05, 0x395c50);
    box(g, 0, 5.9, 3.5, 4.6, 0.07, 0.08, 0x395c50);
    for (const x of [-1.5, 1.5]) {
      box(g, x, 5.03, 3.1, 0.8, 0.35, 0.4, 0xab6446);
      sphere(g, x, 5.3, 3.1, 0.38, 0x7d995a);
    }
    box(g, 1.2, h + 0.6, -0.8, 1, 0.12, 1.6, 0x375b67);
  }
  for (const x of [-2.5, 0, 2.5])
    box(g, x, h / 2, 2.61, 0.1, h, 0.09, 0x54665c);
  box(g, 0, h, 2.62, 5.4, 0.12, 0.09, 0x54665c);
  for (const direction of [-1, 1]) {
    const beam = box(
      g,
      direction * 1.35,
      h + 0.8,
      2.88,
      3.15,
      0.1,
      0.1,
      0x54665c,
    );
    beam.rotation.z = -direction * Math.atan2(1.6, 2.95);
  }
  for (const x of [-1.5, 1.5]) {
    box(g, x, 2.25, 2.9, 1.1, 0.25, 0.45, 0x9d694d);
    sphere(g, x, 2.48, 2.92, 0.3, 0x6e914d);
  }
  sign(g, "HOME", 1.1, 2.68);
}
buildHouse();
const bakery = buildings[2].group;
box(bakery, 0, 2.8, 0, 5.4, 5.6, 5, 0xd7a37e);
roof(bakery, 5.6, 5.9, 5.7);
windows(bakery, 4.1, 2.56);
box(bakery, 0, 1.5, 2.55, 4.3, 2.1, 0.12, 0x466b69);
sign(bakery, "BAKERY", 2.8, 2.75);
for (let i = 0; i < 8; i++) {
  const aw = box(
    bakery,
    -2.2 + i * 0.63,
    2.4,
    3.2,
    0.63,
    0.12,
    1.3,
    i % 2 ? 0xf3dec0 : 0xc76e4d,
  );
  aw.rotation.x = 0.15;
}
box(bakery, 1.8, 6.7, -1.3, 0.6, 2, 0.65, 0xb98f75);
const greenhouse = buildings[1].group;
box(greenhouse, 0, 0.3, 0, 5.4, 0.6, 6, 0xb49c78);
const glass = new THREE.Mesh(
  new THREE.BoxGeometry(5.2, 3.4, 5.8),
  new THREE.MeshStandardMaterial({
    color: 0x9ccec0,
    transparent: true,
    opacity: 0.32,
    roughness: 0.3,
    depthWrite: false,
  }),
);
glass.position.y = 2;
greenhouse.add(glass);
for (const x of [-2.6, 0, 2.6])
  for (const z of [-2.9, 0, 2.9])
    box(greenhouse, x, 2, z, 0.12, 3.6, 0.12, 0xf4e6c7);
for (const y of [0.65, 3.8]) {
  box(greenhouse, 0, y, 2.9, 5.4, 0.12, 0.12, 0xf4e6c7);
  box(greenhouse, 0, y, -2.9, 5.4, 0.12, 0.12, 0xf4e6c7);
}
for (const x of [-1.5, 1.5]) {
  box(greenhouse, x, 0.7, 0, 1.5, 0.4, 4.8, 0x745644);
  for (let z = -2; z <= 2; z += 0.65)
    sphere(greenhouse, x, 1.12, z, 0.42, 0x6a9857);
}
box(greenhouse, 0, 3.85, 0, 5.5, 0.14, 6.1, 0xb2d6c2);
sign(greenhouse, "GREENHOUSE", 3.2, 3.03);
for (const b of buildings) {
  b.group.position.set(b.x, 0.2, b.z);
  b.group.rotation.y = b.rotation;
  scene.add(b.group);
  obstacles.push({
    x: b.x,
    z: b.z,
    w: b.name === "Greenhouse" ? 6 : 5.4,
    d: 5.5,
  });
}

// Reference-inspired street fabric: attached frontages enclose lanes and a garden court.
// These are scenery instances of houses, not new simulation buildings or locked plots.
const neighborhood = new THREE.Group();
scene.add(neighborhood);
const roofColors = [0x985f49, 0x657378, 0xaf7150, 0x77756a];
const facadeColors = [
  0xe5d8b9, 0xbac8b9, 0xe5c095, 0xcfc7b5, 0xdfae99, 0xf0e3ca,
];
function frontage(
  x: number,
  z: number,
  rotation: number,
  h: number,
  variant: number,
  w = 5.4,
) {
  const g = new THREE.Group();
  g.position.set(x, 0.2, z);
  g.rotation.y = rotation;
  neighborhood.add(g);
  box(g, 0, h / 2, 0, w, h, 4.8, facadeColors[variant % facadeColors.length]);
  box(g, 0, 0.28, 0, w + 0.1, 0.55, 4.9, 0xb4a38a);
  roof(g, h, w + 0.45, 5.3);
  (g.children[g.children.length - 1] as THREE.Mesh).material = mat(
    roofColors[variant % 4],
  );
  box(g, 0, h - 0.12, 2.44, w + 0.2, 0.22, 0.2, 0xf2e3c4);
  box(g, 0, 1.2, 2.46, 0.95, 2.3, 0.12, variant % 2 ? 0x426b67 : 0x696349);
  windows(g, Math.min(3.3, h - 1), 2.44);
  if (h > 6.3) windows(g, h - 1.35, 2.44);
  for (const side of [-1, 1]) {
    // Side windows prevent blank end walls at corners and in the overhead camera.
    for (const wy of h > 6.3 ? [2.6, h - 1.35] : [2.6]) {
      box(g, side * (w / 2 + 0.025), wy, 0, 0.08, 1.2, 0.85, 0xf2e3c4);
      box(g, side * (w / 2 + 0.075), wy, 0, 0.06, 0.96, 0.64, 0x54777b);
    }
  }
  if (variant % 3 === 0) {
    for (const tx of [-w / 2 + 0.16, 0, w / 2 - 0.16])
      box(g, tx, h / 2, 2.52, 0.11, h, 0.1, 0x52685f);
    box(g, 0, h, 2.6, w, 0.13, 0.13, 0x52685f);
    for (const direction of [-1, 1]) {
      const beam = box(
        g,
        (direction * w) / 4,
        h + 0.8,
        2.67,
        Math.hypot(w / 2 + 0.22, 1.6),
        0.13,
        0.12,
        0x52685f,
      );
      beam.rotation.z = -direction * Math.atan2(1.6, w / 2 + 0.22);
    }
    box(g, 0, h + 0.65, 2.67, 0.12, 1.3, 0.1, 0x52685f);
  }
  box(g, w * 0.28, h + 0.5, -1, 0.45, 1.65, 0.5, 0xbba78b);
  for (const fx of [-1.5, 1.5]) {
    box(g, fx, 2.5, 2.7, 0.85, 0.22, 0.4, 0xa56e52);
    sphere(g, fx, 2.72, 2.74, 0.32, variant % 2 ? 0x8b9d61 : 0x6f8d56);
    sphere(g, fx + 0.12, 2.88, 2.82, 0.1, variant % 2 ? 0xd6b976 : 0xbf7b85);
  }
  if (variant % 4 === 1) {
    box(g, 0, 2.4, 3, 4.7, 0.12, 1.1, 0x588775);
    sign(g, "CAFÉ", 2.9, 2.62);
  }
  const c = Math.abs(Math.cos(rotation)),
    n = Math.abs(Math.sin(rotation));
  obstacles.push({ x, z, w: w * c + 4.8 * n, d: w * n + 4.8 * c });
}
// Slight setbacks and a turn at the north end replace the isolated crossroad feel.
frontage(-6, -8.5, Math.PI / 2, 5.8, 0);
frontage(-6, -14, Math.PI / 2, 7.1, 1);
frontage(6, -5.5, -Math.PI / 2, 6.7, 2);
frontage(6, -11, -Math.PI / 2, 5.8, 3);
frontage(4.7, -17, -Math.PI / 2 - 0.16, 7.4, 4);
// Western perimeter encloses a planted courtyard; leave two walkable entrances.
frontage(-17, -11, Math.PI / 2, 5.8, 4);
frontage(-17, -5.5, Math.PI / 2, 6.5, 5);
frontage(-17, 0, Math.PI / 2, 5.3, 0);
frontage(-11, -20, 0, 6.2, 2);
frontage(-5.5, -20, 0, 7.4, 5);
// Lower cottages frame the plaza without hiding the lane from above.
frontage(-9, 9.7, Math.PI, 4.5, 3, 4.5);
frontage(-4.4, 12.3, Math.PI, 4.7, 0, 4.5);
frontage(6, 10.5, Math.PI, 5, 1, 4.5);
// Garden court, fountain and small café furnishings are part of the spatial test.
function canopy(x: number, z: number, scale = 1) {
  cylinder(neighborhood, x, 2.3 * scale, z, 0.12, 4.3 * scale, 0x796047);
  const offsets = [
    [-0.8, 4.5, 0],
    [0.8, 4.8, 0.2],
    [0, 5.4, -0.1],
  ];
  for (const [dx, y, dz] of offsets)
    sphere(
      neighborhood,
      x + dx * scale,
      y * scale,
      z + dz * scale,
      1.45 * scale,
      0x809563,
    );
  obstacles.push({ x, z, w: 0.45, d: 0.45 });
}
for (const z of [-4.8, -11.5]) {
  canopy(-2.9, z, 0.85);
  canopy(2.9, z, 0.85);
}
canopy(-12, -8, 1.05);
canopy(-12, 0, 0.8);
canopy(10, 5, 0.9);
box(neighborhood, -12, 0.2, -8, 3.7, 0.2, 5, 0x7e965e);
for (const z of [-10, -6])
  box(neighborhood, -12, 0.42, z, 3.4, 0.45, 0.45, 0x657e4e);
// Fountain leaves the main walking line clear.
cylinder(neighborhood, -2, 0.42, 4, 1.3, 0.45, 0xa89d85);
cylinder(neighborhood, -2, 0.66, 4, 1.1, 0.09, 0x729f9c);
cylinder(neighborhood, -2, 1.12, 4, 0.18, 1, 0xd2c5a5);
cylinder(neighborhood, -2, 1.5, 4, 0.55, 0.13, 0xbeb194);
sphere(neighborhood, -2, 1.78, 4, 0.16, 0xcabc9a);
obstacles.push({ x: -2, z: 4, w: 2.6, d: 2.6 });
function cafeTable(x: number, z: number) {
  cylinder(neighborhood, x, 0.88, z, 0.5, 0.12, 0xdbbc85);
  cylinder(neighborhood, x, 0.52, z, 0.055, 0.7, 0x496357);
  for (const dx of [-0.8, 0.8]) {
    box(neighborhood, x + dx, 0.49, z, 0.45, 0.09, 0.45, 0x9e7854);
    box(neighborhood, x + dx, 0.75, z + 0.2, 0.45, 0.55, 0.07, 0x9e7854);
    for (const lx of [-0.16, 0.16])
      box(neighborhood, x + dx + lx, 0.27, z, 0.04, 0.4, 0.3, 0x426154);
  }
  obstacles.push({ x, z, w: 2, d: 0.9 });
}
cafeTable(3.6, 4);
cafeTable(5.4, 6.2);
cafeTable(-5.5, 5.2);
// Agricultural edge: ordered growing rows and small orchards beyond the dense center.
for (let row = 0; row < 5; row++) {
  box(neighborhood, 17, 0.16, 1 + row * 1.5, 8, 0.2, 1.05, 0x887858);
  for (let plant = 0; plant < 13; plant++)
    sphere(
      neighborhood,
      13.4 + plant * 0.57,
      0.42,
      1 + row * 1.5,
      0.23,
      row % 2 ? 0x92a560 : 0x648956,
    );
}
for (const z of [-18, -14]) for (const x of [13, 18]) canopy(x, z, 0.65);
// A subtly bending paved lane leads toward the agricultural edge.
const lane = box(neighborhood, 11, 0.13, -17.5, 13, 0.13, 2.5, 0xded2ba);
lane.rotation.y = 0.15;
// Merge static geometry by material: a dense-looking block need not mean thousands of draw calls.
neighborhood.updateMatrixWorld(true);
const mergedGroups = new Map<THREE.Material, THREE.BufferGeometry[]>();
neighborhood.traverse((o) => {
  if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
  const transformed = o.geometry.clone().applyMatrix4(o.matrixWorld);
  const geometry = transformed.index ? transformed.toNonIndexed() : transformed;
  if (geometry !== transformed) transformed.dispose();
  const list = mergedGroups.get(o.material) ?? [];
  list.push(geometry);
  mergedGroups.set(o.material, list);
  o.geometry.dispose();
});
neighborhood.clear();
for (const [material, geometries] of mergedGroups) {
  const geometry = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  if (geometry) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    neighborhood.add(mesh);
  }
}

const ring = new THREE.Mesh(
  new THREE.RingGeometry(3.9, 4.05, 64),
  new THREE.MeshBasicMaterial({ color: 0xf9e5a7, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(-6, 0.22, -3);
scene.add(ring);
const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0.23, 9);
box(player, 0, 0.85, 0, 0.55, 0.8, 0.35, 0xe8dfc7);
sphere(player, 0, 1.48, 0, 0.3, 0xf1e8d2);
box(player, 0, 1.5, -0.25, 0.38, 0.18, 0.08, 0x365a65);
box(player, 0, 0.85, 0.25, 0.4, 0.5, 0.25, 0xc67b4e);
const legs = [
  box(player, -0.16, 0.3, 0, 0.18, 0.6, 0.2, 0x355551),
  box(player, 0.16, 0.3, 0, 0.18, 0.6, 0.2, 0x355551),
];
for (const x of [-0.38, 0.38])
  box(player, x, 0.85, 0, 0.16, 0.65, 0.2, 0xdfd8c4);
let mode: "overview" | "walk" = "overview",
  yaw = 0,
  pitch = 0.08,
  selected = 0;
const keys = new Set<string>();
function select(i: number) {
  selected = i;
  const b = buildings[i];
  $("building-name").textContent = b.name;
  $("building-description").textContent = b.description;
  ring.position.set(b.x, 0.22, b.z);
  document
    .querySelectorAll<HTMLButtonElement>("[data-building]")
    .forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String(Number(el.dataset.building) === i),
      ),
    );
  $("upgrade").hidden =
    i !== 0 || new URLSearchParams(location.search).has("town");
  if (connectedSnapshot) {
    const plotId = connectedPlots[i],
      plot = connectedSnapshot.plots[plotId];
    const job = connectedSnapshot.jobs.find(
      (j: any) => j.plotId === plotId && j.status === "running",
    );
    $("building-name").textContent = plot.building ?? "Ordinary plot";
    $("building-description").textContent =
      i === 0
        ? `${connectedSnapshot.adults} adults · ${connectedSnapshot.houseCapacity} housing capacity`
        : "Open building controls in the town management panel.";
    $("level-note").textContent = job
      ? `Connected town · ${job.building === "house" ? "Upgrading House" : "Building Greenhouse"} · ${Math.max(0, Math.ceil((job.endsAt - connectedSnapshot.serverNow) / 1000))} seconds remaining`
      : `Connected town · ${plot.building ? "Saved level " + plot.level : "Empty plot"}`;
    return;
  }
  $("level-note").textContent =
    i === 0
      ? `House level ${upgraded ? 2 : 1} · Appearance preview only`
      : "Level 1 · Visual prototype";
}
function reset() {
  keys.clear();
  yaw = 0;
  pitch = 0.08;
  player.position.set(0, 0.23, 9);
  player.rotation.y = 0;
  overview.position.set(30, 34, 40);
  orbit.target.set(0, 1, -3);
  overview.zoom = 1;
  overview.updateProjectionMatrix();
  orbit.update();
}
function setMode(next: typeof mode) {
  mode = next;
  camera = mode === "overview" ? overview : walking;
  orbit.enabled = mode === "overview";
  document.body.classList.toggle("walking", mode === "walk");
  $("movement").hidden = mode !== "walk";
  $("overview").setAttribute("aria-pressed", String(mode === "overview"));
  $("walk").setAttribute("aria-pressed", String(mode === "walk"));
  $("instructions").textContent =
    mode === "walk"
      ? "WASD / arrows to walk · Drag to look · Touch arrows to move"
      : "Drag to orbit · Scroll to zoom · Select a building";
  keys.clear();
  $("status").textContent =
    mode === "walk" ? "Walking camera enabled" : "Town camera enabled";
}
$("overview").onclick = () => setMode("overview");
$("walk").onclick = () => setMode("walk");
$("reset").onclick = reset;
$("upgrade").onclick = () => {
  upgraded = !upgraded;
  buildHouse();
  select(selected);
  $("upgrade").textContent = `Preview house · Level ${upgraded ? 1 : 2}`;
};
document
  .querySelectorAll<HTMLButtonElement>("[data-building]")
  .forEach((el) => (el.onclick = () => select(Number(el.dataset.building))));
function quality() {
  const low = $<HTMLInputElement>("detail").checked;
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.6));
  renderer.shadowMap.enabled = !low;
  decorations.visible = !low;
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => (m.needsUpdate = true));
    }
  });
  resize();
}
$<HTMLInputElement>("detail").checked = innerWidth < 760;
$("detail").onchange = quality;
const keyMap: Record<string, string> = {
  arrowup: "w",
  arrowdown: "s",
  arrowleft: "a",
  arrowright: "d",
};
window.addEventListener("keydown", (e) => {
  if (mode !== "walk" || e.target instanceof HTMLInputElement) return;
  const k = keyMap[e.key.toLowerCase()] ?? e.key.toLowerCase();
  if ("wasd".includes(k) && k.length === 1) {
    e.preventDefault();
    keys.add(k);
  }
});
window.addEventListener("keyup", (e) =>
  keys.delete(keyMap[e.key.toLowerCase()] ?? e.key.toLowerCase()),
);
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => keys.clear());
document.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((el) => {
  el.onpointerdown = (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    keys.add(el.dataset.key!);
  };
  el.onpointerup =
    el.onpointercancel =
    el.onlostpointercapture =
      () => keys.delete(el.dataset.key!);
});
let drag: { x: number; y: number; startX: number; startY: number } | null =
  null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (drag && mode === "walk") {
    yaw -= (e.clientX - drag.x) * 0.005;
    pitch = THREE.MathUtils.clamp(
      pitch + (e.clientY - drag.y) * 0.003,
      -0.2,
      0.4,
    );
  }
  if (drag) {
    drag.x = e.clientX;
    drag.y = e.clientY;
  }
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (
    drag &&
    mode === "overview" &&
    Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6
  ) {
    const r = new THREE.Raycaster();
    r.setFromCamera(
      new THREE.Vector2(
        (e.clientX / innerWidth) * 2 - 1,
        (-e.clientY / innerHeight) * 2 + 1,
      ),
      camera,
    );
    const hit = r.intersectObjects(
      [
        ...buildings.filter((b) => b.group.visible).map((b) => b.group),
        ...(neighborhood.visible ? [neighborhood] : []),
      ],
      true,
    )[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const i = buildings.findIndex((b) => b.group === o);
        if (i >= 0) {
          select(i);
          if (new URLSearchParams(location.search).has("hud"))
            window.parent.postMessage(
              { type: "town-select", plotId: connectedPlots[i] },
              location.origin,
            );
          break;
        }
        o = o.parent;
      }
    }
  }
  drag = null;
});
renderer.domElement.addEventListener("pointercancel", () => (drag = null));
function resize() {
  const aspect = innerWidth / innerHeight;
  const span = Math.max(22, 26 / aspect);
  overview.left = -span * aspect;
  overview.right = span * aspect;
  overview.top = span;
  overview.bottom = -span;
  overview.updateProjectionMatrix();
  walking.aspect = aspect;
  walking.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener("resize", resize);
function allowed(x: number, z: number) {
  return (
    Math.hypot(x, z) < 25 &&
    !obstacles.some(
      (o) =>
        Math.abs(x - o.x) < o.w / 2 + 0.35 &&
        Math.abs(z - o.z) < o.d / 2 + 0.35,
    )
  );
}
let last = performance.now(),
  phase = 0;
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (mode === "walk") {
    let f = Number(keys.has("w")) - Number(keys.has("s")),
      s = Number(keys.has("d")) - Number(keys.has("a"));
    const len = Math.hypot(f, s);
    if (len) {
      f /= len;
      s /= len;
      const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) * dt * 3.2,
        dz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) * dt * 3.2;
      if (allowed(player.position.x + dx, player.position.z))
        player.position.x += dx;
      if (allowed(player.position.x, player.position.z + dz))
        player.position.z += dz;
      phase += dt * 10;
      player.rotation.y = Math.atan2(-dx, -dz);
    }
    legs.forEach(
      (leg, i) =>
        (leg.rotation.x = len ? Math.sin(phase + i * Math.PI) * 0.4 : 0),
    );
    const target = player.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    const offset = new THREE.Vector3(
      Math.sin(yaw) * 2.8,
      0.7 + pitch * 3,
      Math.cos(yaw) * 2.8,
    );
    const ray = new THREE.Raycaster(
      target,
      offset.clone().normalize(),
      0,
      offset.length(),
    );
    const hit = ray.intersectObjects(
      [
        ...buildings.filter((b) => b.group.visible).map((b) => b.group),
        ...(neighborhood.visible ? [neighborhood] : []),
      ],
      true,
    )[0];
    if (hit) offset.setLength(Math.max(0.25, hit.distance - 0.2));
    walking.position.copy(target).add(offset);
    walking.lookAt(
      target
        .clone()
        .add(new THREE.Vector3(-Math.sin(yaw) * 3, -pitch, -Math.cos(yaw) * 3)),
    );
  } else orbit.update();
  renderer.render(scene, camera);
});
reset();
quality();
// Read-only diagnostics for manual/browser verification of this isolated experiment.
Object.defineProperty(window, "townPrototype", {
  get: () => ({
    mode,
    houseLevel: upgraded ? 2 : 1,
    selected: buildings[selected].name,
    position: player.position.toArray(),
    drawCalls: renderer.info.render.calls,
  }),
});

// Connected mode renders an owned server snapshot; local appearance controls cannot mutate it.
const connectedCadet = new URLSearchParams(location.search).get("town");
if (connectedCadet) {
  $("upgrade").hidden = true;
  $("upgrade").onclick = null;
  neighborhood.visible = false;
  buildings[1].group.visible = false;
  scene.remove(buildings[2].group);
  const gardenModel = buildings[1].group;
  buildings[2].group = gardenModel.clone();
  buildings[2].group.position.set(buildings[2].x, 0, buildings[2].z);
  scene.add(buildings[2].group);
  const edge = gardenModel.clone();
  edge.position.set(-17, 0, -10);
  scene.add(edge);
  buildings.push({
    name: "Greenhouse",
    description: "",
    group: edge,
    x: -17,
    z: -10,
    rotation: 0,
  });
  const frames = buildings.slice(1).map((b) => {
    const frame = new THREE.Group();
    frame.position.set(b.x, 0, b.z);
    scene.add(frame);
    box(frame, 0, 0.15, 0, 5.4, 0.3, 6, 0xd9ba7d);
    for (const x of [-2.5, 2.5])
      for (const z of [-2.8, 2.8])
        box(frame, x, 1.5, z, 0.16, 3, 0.16, 0xc59e62);
    return frame;
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-building]")
    .forEach((button) => {
      const index = Number(button.dataset.building);
      button.textContent = connectedPlots[index];
    });
  const plotButtons = document.querySelector("[data-building]")?.parentElement;
  const edgeButton = document.createElement("button");
  edgeButton.dataset.building = "3";
  edgeButton.textContent = "edge";
  edgeButton.onclick = () => select(3);
  plotButtons?.append(edgeButton);
  let loading = false;
  async function refreshConnected() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch(
        `/api/towns/${encodeURIComponent(connectedCadet!)}`,
      );
      const town = await response.json();
      if (!response.ok) throw Error(town.error ?? "Could not load town");
      connectedSnapshot = town;
      const nextUpgraded = town.houseLevel > 1;
      if (nextUpgraded !== upgraded) {
        upgraded = nextUpgraded;
        buildHouse();
      }
      buildings[0].group.visible = true;
      obstacles.splice(0, obstacles.length, {
        x: buildings[0].x,
        z: buildings[0].z,
        w: 5.4,
        d: 5.5,
      });
      buildings.slice(1).forEach((b, index) => {
        const plotId = connectedPlots[index + 1];
        b.group.visible = town.plots[plotId].building === "greenhouse";
        frames[index].visible = town.jobs.some(
          (j: any) => j.plotId === plotId && j.status === "running",
        );
        if (b.group.visible || frames[index].visible)
          obstacles.push({ x: b.x, z: b.z, w: 5.4, d: 6 });
      });
      select(selected);
    } catch (error) {
      $("level-note").textContent =
        "Connection unavailable · Changes disabled until reconnect";
    } finally {
      loading = false;
    }
  }
  void refreshConnected();
  window.setInterval(() => void refreshConnected(), 1000);
}

if (new URLSearchParams(location.search).has("hud")) {
  document.body.classList.add("game-embedded");
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent)
      return;
    if (
      event.data?.type === "town-camera" &&
      ["walk", "overview"].includes(event.data.mode)
    )
      setMode(event.data.mode);
  });
}
