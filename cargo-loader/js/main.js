import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  GRID_CELL_M,
  HOLD,
  ZONES,
  generateManifest,
  layoutManifest,
  dimsMFromUld,
  hasCollision,
  computeMetrics,
  autoBalance,
} from './physics.js';
import { createUldMesh, buildAircraftShell, loadEnvironment } from './assets.js';

const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 7, 11);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
document.getElementById('app').appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(HOLD.lengthM / 2, HOLD.heightM * 0.4, HOLD.widthM / 2);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 4;
controls.maxDistance = 28;
// Left click = drag cargo. Right = orbit. Middle = zoom.
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(8, 14, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 40;
key.shadow.camera.left = -12;
key.shadow.camera.right = 12;
key.shadow.camera.top = 12;
key.shadow.camera.bottom = -12;
scene.add(key);

const cargoGroup = new THREE.Group();
scene.add(cargoGroup);
scene.add(buildAircraftShell(HOLD, ZONES, GRID_CELL_M));

const cgTargetX = (HOLD.cells.x / 2) * GRID_CELL_M;
const cgLine = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, HOLD.heightM + 0.4, 0.05),
  new THREE.MeshBasicMaterial({ color: 0x22c55e }),
);
cgLine.position.set(cgTargetX, HOLD.heightM / 2, HOLD.widthM / 2);
scene.add(cgLine);

const cgMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.14, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x166534, emissiveIntensity: 0.5 }),
);
cgMarker.position.set(cgTargetX, HOLD.heightM + 0.3, HOLD.widthM / 2);
scene.add(cgMarker);

const statsPanelEl = document.getElementById('stats-panel-3d');
const stats3d = new CSS2DObject(statsPanelEl);
stats3d.position.set(HOLD.lengthM + 2.2, HOLD.heightM * 0.85, HOLD.widthM / 2);
scene.add(stats3d);

const packages = [];
const packageMeshes = new Map();
const labelObjects = new Map();

let selectedPkg = null;
let hoveredPkg = null;
let isDragging = false;
let activePointerId = null;

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const intersectPoint = new THREE.Vector3();
const dragOffset = new THREE.Vector3();

const ui = {
  status: document.getElementById('status-pill'),
  cgCurrent: document.getElementById('cg-current'),
  cgTarget: document.getElementById('cg-target'),
  cgOffset: document.getElementById('cg-offset'),
  cgBar: document.getElementById('cg-bar'),
  cgMarkerUi: document.getElementById('cg-marker-ui'),
  totalMass: document.getElementById('total-mass'),
  maxMass: document.getElementById('max-mass'),
  massBar: document.getElementById('mass-bar'),
  volumeUtil: document.getElementById('volume-util'),
  compliance: document.getElementById('compliance-score'),
  selectedInfo: document.getElementById('selected-info'),
  zoneBars: {
    FWD: document.getElementById('zone-fwd'),
    CENTER: document.getElementById('zone-center'),
    AFT: document.getElementById('zone-aft'),
  },
  zoneValues: {
    FWD: document.getElementById('zone-fwd-val'),
    CENTER: document.getElementById('zone-center-val'),
    AFT: document.getElementById('zone-aft-val'),
  },
  floatCgOffset: document.getElementById('float-cg-offset'),
  floatTotalMass: document.getElementById('float-total-mass'),
  floatStatus: document.getElementById('float-status'),
};

function setMeshState(pkg, state) {
  const group = packageMeshes.get(pkg.id);
  if (!group) return;
  const outline = group.userData.outlineMat;
  const body = group.userData.bodyMat;
  const valid = state !== 'invalid';

  outline.opacity = state === 'selected' ? 0.85 : state === 'hover' ? 0.45 : 0;
  body.emissive.setHex(valid ? 0x000000 : 0x991b1b);
  body.emissiveIntensity = valid ? 0 : 0.35;

  const label = group.userData.labelEl;
  if (label) label.style.opacity = state === 'selected' || state === 'hover' ? '1' : '0';
}

function syncMeshPosition(pkg) {
  const group = packageMeshes.get(pkg.id);
  if (!group) return;
  const dims = dimsMFromUld(pkg);
  group.position.set(
    pkg.position.x + dims.x / 2,
    pkg.position.y + dims.y / 2,
    pkg.position.z + dims.z / 2,
  );
}

function disposePackage(id) {
  const group = packageMeshes.get(id);
  const label = labelObjects.get(id);
  if (group) {
    scene.remove(group);
    group.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    });
    packageMeshes.delete(id);
  }
  if (label) {
    scene.remove(label);
    labelObjects.delete(id);
  }
}

function createPackage(pkg) {
  const { group, dims, label } = createUldMesh(pkg);
  const labelObj = new CSS2DObject(label);
  labelObj.position.set(0, dims.y / 2 + 0.2, 0);
  group.add(labelObj);
  labelObjects.set(pkg.id, labelObj);
  cargoGroup.add(group);
  packageMeshes.set(pkg.id, group);
  syncMeshPosition(pkg);
}

function spawnPackages() {
  packages.forEach((p) => disposePackage(p.id));
  packages.length = 0;

  const manifest = generateManifest(5, Date.now());
  const laid = layoutManifest(manifest);
  laid.forEach((pkg) => {
    packages.push(pkg);
    createPackage(pkg);
  });
  updateAll();
}

function updateCgMarker3D(metrics) {
  cgMarker.position.x = metrics.cgX * GRID_CELL_M;
  const ok = metrics.cgWithinEnvelope;
  cgMarker.material.color.setHex(ok ? 0x22c55e : 0xef4444);
  cgMarker.material.emissive.setHex(ok ? 0x166534 : 0x7f1d1d);
}

function updateUI(metrics) {
  ui.status.textContent = metrics.status;
  ui.status.className = `status-pill ${metrics.status === 'OK' ? 'ok' : 'warn'}`;
  ui.cgCurrent.textContent = metrics.cgX.toFixed(2);
  ui.cgTarget.textContent = metrics.targetCgX.toFixed(2);
  ui.cgOffset.textContent = metrics.cgOffset.toFixed(2);
  ui.cgBar.style.width = `${Math.max(0, Math.min(100, 100 - metrics.cgOffset * 25))}%`;
  ui.cgMarkerUi.style.left = `${Math.max(2, Math.min(98, (metrics.cgX / HOLD.cells.x) * 100))}%`;
  ui.totalMass.textContent = Math.round(metrics.totalMassKg).toLocaleString();
  ui.maxMass.textContent = HOLD.maxPayloadKg.toLocaleString();
  ui.massBar.style.width = `${Math.min(100, (metrics.totalMassKg / HOLD.maxPayloadKg) * 100)}%`;
  ui.volumeUtil.textContent = `${(metrics.volumeUtilization * 100).toFixed(1)}%`;
  ui.compliance.textContent = `${Math.round(metrics.complianceScore)}%`;
  for (const name of ['FWD', 'CENTER', 'AFT']) {
    const w = metrics.zoneWeights[name];
    const max = ZONES[name].maxWeightKg;
    ui.zoneValues[name].textContent = `${Math.round(w).toLocaleString()} / ${(max / 1000).toFixed(0)}k kg`;
    ui.zoneBars[name].style.width = `${Math.min(100, (w / max) * 100)}%`;
  }
  ui.floatCgOffset.textContent = metrics.cgOffset.toFixed(2);
  ui.floatTotalMass.textContent = Math.round(metrics.totalMassKg).toLocaleString();
  ui.floatStatus.textContent = metrics.status;
  updateCgMarker3D(metrics);
}

function refreshVisualStates() {
  for (const pkg of packages) {
    const collision = hasCollision(pkg, packages);
    let state = collision.ok ? 'default' : 'invalid';
    if (pkg.id === selectedPkg?.id) state = collision.ok ? 'selected' : 'invalid';
    else if (pkg.id === hoveredPkg?.id && !isDragging) state = collision.ok ? 'hover' : 'invalid';
    setMeshState(pkg, state);
    syncMeshPosition(pkg);
  }
}

function updateAll() {
  refreshVisualStates();
  updateUI(computeMetrics(packages));
}

function getPointerNDC(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickPackage(event) {
  getPointerNDC(event);
  raycaster.setFromCamera(pointer, camera);
  const groups = [...packageMeshes.values()];
  const hits = raycaster.intersectObjects(groups, true);
  for (const hit of hits) {
    let obj = hit.object;
    while (obj && !obj.userData.pkgId) obj = obj.parent;
    if (obj?.userData.pkgId) {
      return packages.find((p) => p.id === obj.userData.pkgId) ?? null;
    }
  }
  return null;
}

function beginDrag(pkg, event) {
  selectedPkg = pkg;
  pkg._dragStart = { ...pkg.position };
  isDragging = true;
  activePointerId = event.pointerId;
  controls.enabled = false;
  canvas.style.cursor = 'grabbing';
  event.preventDefault();
  event.stopPropagation();
  canvas.setPointerCapture(event.pointerId);

  getPointerNDC(event);
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(dragPlane, intersectPoint);
  const dims = dimsMFromUld(pkg);
  dragOffset.set(
    pkg.position.x + dims.x / 2 - intersectPoint.x,
    0,
    pkg.position.z + dims.z / 2 - intersectPoint.z,
  );
  ui.selectedInfo.textContent = `${pkg.type} · ${pkg.weightKg.toLocaleString()} kg · dragging…`;
  refreshVisualStates();
}

function endDrag() {
  if (!selectedPkg) return;
  const collision = hasCollision(selectedPkg, packages);
  if (!collision.ok) {
    selectedPkg.position.x = selectedPkg._dragStart.x;
    selectedPkg.position.z = selectedPkg._dragStart.z;
    selectedPkg.position.y = selectedPkg._dragStart.y;
    ui.selectedInfo.textContent = `${selectedPkg.type} · reverted (${collision.reason})`;
  } else {
    selectedPkg.homePosition = { ...selectedPkg.position };
    ui.selectedInfo.textContent = `${selectedPkg.type} · ${selectedPkg.weightKg.toLocaleString()} kg · placed`;
  }
  delete selectedPkg._dragStart;
  isDragging = false;
  selectedPkg = null;
  activePointerId = null;
  controls.enabled = true;
  canvas.style.cursor = 'default';
  updateAll();
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  const pkg = pickPackage(event);
  if (pkg) beginDrag(pkg, event);
});

canvas.addEventListener('pointermove', (event) => {
  if (isDragging && selectedPkg && event.pointerId === activePointerId) {
    event.preventDefault();
    getPointerNDC(event);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(dragPlane, intersectPoint)) return;

    const dims = dimsMFromUld(selectedPkg);
    let nx = intersectPoint.x - dragOffset.x - dims.x / 2;
    let nz = intersectPoint.z - dragOffset.z - dims.z / 2;
    nx = Math.max(0, Math.min(HOLD.lengthM - dims.x, nx));
    nz = Math.max(0, Math.min(HOLD.widthM - dims.z, nz));

    selectedPkg.position.x = nx;
    selectedPkg.position.z = nz;
    selectedPkg.position.y = 0;

    const collision = hasCollision(selectedPkg, packages);
    setMeshState(selectedPkg, collision.ok ? 'selected' : 'invalid');
    syncMeshPosition(selectedPkg);
    updateUI(computeMetrics(packages));
    return;
  }

  if (!isDragging) {
    const pkg = pickPackage(event);
    if (pkg?.id !== hoveredPkg?.id) {
      hoveredPkg = pkg;
      refreshVisualStates();
      canvas.style.cursor = pkg ? 'grab' : 'default';
    }
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (event.pointerId === activePointerId && isDragging) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    endDrag();
  }
});

canvas.addEventListener('pointercancel', (event) => {
  if (event.pointerId === activePointerId && isDragging) endDrag();
});

document.getElementById('btn-reset').addEventListener('click', spawnPackages);
document.getElementById('btn-balance').addEventListener('click', () => {
  autoBalance(packages);
  updateAll();
});

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const t = performance.now() * 0.001;
  stats3d.position.y = HOLD.heightM * 0.85 + Math.sin(t * 1.1) * 0.06;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

loadEnvironment(scene, renderer).then(() => {
  spawnPackages();
  animate();
});
