"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { buildAircraftShell, createUldMesh, loadEnvironment } from "@/lib/cargo-assets";
import {
  GRID_CELL_M,
  HOLD,
  ZONES,
  type CargoMetrics,
  type CargoPackage,
  computeMetrics,
  dimsMFromUld,
  hasCollision,
} from "@/lib/cargo-physics";

type MeshState = "default" | "hover" | "selected" | "invalid";

interface CargoLoaderSceneProps {
  packages: CargoPackage[];
  onPackagesChange: (packages: CargoPackage[]) => void;
  onMetricsChange: (metrics: CargoMetrics) => void;
  onSelectedInfoChange: (info: string) => void;
  onCgMarkerUpdate?: (cgX: number, cgWithinEnvelope: boolean) => void;
}

export function CargoLoaderScene({
  packages,
  onPackagesChange,
  onMetricsChange,
  onSelectedInfoChange,
  onCgMarkerUpdate,
}: CargoLoaderSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatPanelRef = useRef<HTMLDivElement>(null);
  const floatCgRef = useRef<HTMLSpanElement>(null);
  const floatMassRef = useRef<HTMLSpanElement>(null);
  const floatStatusRef = useRef<HTMLSpanElement>(null);
  const syncPackagesRef = useRef<((pkgs: CargoPackage[]) => void) | null>(null);

  const packagesRef = useRef(packages);
  const callbacksRef = useRef({ onPackagesChange, onMetricsChange, onSelectedInfoChange, onCgMarkerUpdate });
  callbacksRef.current = { onPackagesChange, onMetricsChange, onSelectedInfoChange, onCgMarkerUpdate };

  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const floatPanel = floatPanelRef.current;
    if (!container || !canvas || !floatPanel) return;
    const canvasEl = canvas;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(10, 7, 11);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: "high-performance" });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;";
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, canvasEl);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(HOLD.lengthM / 2, HOLD.heightM * 0.4, HOLD.widthM / 2);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 4;
    controls.maxDistance = 28;
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
    const cgMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x166534, emissiveIntensity: 0.5 }),
    );
    cgMarker.position.set(cgTargetX, HOLD.heightM + 0.3, HOLD.widthM / 2);
    scene.add(cgMarker);

    const cgLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, HOLD.heightM + 0.4, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }),
    );
    cgLine.position.set(cgTargetX, HOLD.heightM / 2, HOLD.widthM / 2);
    scene.add(cgLine);

    const stats3d = new CSS2DObject(floatPanel);
    stats3d.position.set(HOLD.lengthM + 2.2, HOLD.heightM * 0.85, HOLD.widthM / 2);
    scene.add(stats3d);

    const packageMeshes = new Map<string, THREE.Group>();
    const labelObjects = new Map<string, CSS2DObject>();

    let selectedPkg: CargoPackage | null = null;
    let hoveredPkg: CargoPackage | null = null;
    let isDragging = false;
    let activePointerId: number | null = null;

    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const intersectPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();

    function setMeshState(pkg: CargoPackage, state: MeshState) {
      const group = packageMeshes.get(pkg.id);
      if (!group) return;
      const outline = group.userData.outlineMat as THREE.MeshBasicMaterial;
      const body = group.userData.bodyMat as THREE.MeshPhysicalMaterial;
      const valid = state !== "invalid";

      outline.opacity = state === "selected" ? 0.85 : state === "hover" ? 0.45 : 0;
      body.emissive.setHex(valid ? 0x000000 : 0x991b1b);
      body.emissiveIntensity = valid ? 0 : 0.35;

      const label = group.userData.labelEl as HTMLDivElement | undefined;
      if (label) label.style.opacity = state === "selected" || state === "hover" ? "1" : "0";
    }

    function syncMeshPosition(pkg: CargoPackage) {
      const group = packageMeshes.get(pkg.id);
      if (!group) return;
      const dims = dimsMFromUld(pkg);
      group.position.set(
        pkg.position.x + dims.x / 2,
        pkg.position.y + dims.y / 2,
        pkg.position.z + dims.z / 2,
      );
    }

    function disposePackage(id: string) {
      const group = packageMeshes.get(id);
      const label = labelObjects.get(id);
      if (group) {
        cargoGroup.remove(group);
        group.traverse((c) => {
          const mesh = c as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
        });
        packageMeshes.delete(id);
      }
      if (label) {
        scene.remove(label);
        labelObjects.delete(id);
      }
    }

    function createPackage(pkg: CargoPackage) {
      const { group, dims, label } = createUldMesh(pkg);
      const labelObj = new CSS2DObject(label);
      labelObj.position.set(0, dims.y / 2 + 0.2, 0);
      group.add(labelObj);
      group.userData.labelEl = label;
      labelObjects.set(pkg.id, labelObj);
      cargoGroup.add(group);
      packageMeshes.set(pkg.id, group);
      syncMeshPosition(pkg);
    }

    function syncAllPackages(pkgs: CargoPackage[]) {
      const ids = new Set(pkgs.map((p) => p.id));
      for (const id of [...packageMeshes.keys()]) {
        if (!ids.has(id)) disposePackage(id);
      }
      for (const pkg of pkgs) {
        if (!packageMeshes.has(pkg.id)) createPackage(pkg);
        else syncMeshPosition(pkg);
      }
    }

    function updateCgMarker3D(metrics: CargoMetrics) {
      cgMarker.position.x = metrics.cgX * GRID_CELL_M;
      const ok = metrics.cgWithinEnvelope;
      (cgMarker.material as THREE.MeshStandardMaterial).color.setHex(ok ? 0x22c55e : 0xef4444);
      (cgMarker.material as THREE.MeshStandardMaterial).emissive.setHex(ok ? 0x166534 : 0x7f1d1d);
      callbacksRef.current.onCgMarkerUpdate?.(metrics.cgX, metrics.cgWithinEnvelope);
    }

    function updateFloatPanel(metrics: CargoMetrics) {
      if (floatCgRef.current) floatCgRef.current.textContent = metrics.cgOffset.toFixed(2);
      if (floatMassRef.current) floatMassRef.current.textContent = Math.round(metrics.totalMassKg).toLocaleString();
      if (floatStatusRef.current) floatStatusRef.current.textContent = metrics.status;
    }

    function updateAll(pkgs: CargoPackage[]) {
      for (const pkg of pkgs) {
        const collision = hasCollision(pkg, pkgs);
        let state: MeshState = collision.ok ? "default" : "invalid";
        if (pkg.id === selectedPkg?.id) state = collision.ok ? "selected" : "invalid";
        else if (pkg.id === hoveredPkg?.id && !isDragging) state = collision.ok ? "hover" : "invalid";
        setMeshState(pkg, state);
        syncMeshPosition(pkg);
      }
      const metrics = computeMetrics(pkgs);
      updateCgMarker3D(metrics);
      updateFloatPanel(metrics);
      callbacksRef.current.onMetricsChange(metrics);
    }

    syncPackagesRef.current = (pkgs: CargoPackage[]) => {
      syncAllPackages(pkgs);
      updateAll(pkgs);
    };

    function getPointerNDC(event: PointerEvent) {
      const rect = canvasEl.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickPackage(event: PointerEvent): CargoPackage | null {
      getPointerNDC(event);
      raycaster.setFromCamera(pointer, camera);
      const groups = [...packageMeshes.values()];
      const hits = raycaster.intersectObjects(groups, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData.pkgId) obj = obj.parent;
        if (obj?.userData.pkgId) {
          return packagesRef.current.find((p) => p.id === obj!.userData.pkgId) ?? null;
        }
      }
      return null;
    }

    function beginDrag(pkg: CargoPackage, event: PointerEvent) {
      selectedPkg = pkg;
      (pkg as CargoPackage & { _dragStart?: typeof pkg.position })._dragStart = { ...pkg.position };
      isDragging = true;
      activePointerId = event.pointerId;
      controls.enabled = false;
      canvasEl.style.cursor = "grabbing";
      event.preventDefault();
      event.stopPropagation();
      canvasEl.setPointerCapture(event.pointerId);

      getPointerNDC(event);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(dragPlane, intersectPoint);
      const dims = dimsMFromUld(pkg);
      dragOffset.set(
        pkg.position.x + dims.x / 2 - intersectPoint.x,
        0,
        pkg.position.z + dims.z / 2 - intersectPoint.z,
      );
      callbacksRef.current.onSelectedInfoChange(
        `${pkg.type} · ${pkg.weightKg.toLocaleString()} kg · dragging…`,
      );
      updateAll(packagesRef.current);
    }

    function endDrag() {
      if (!selectedPkg) return;
      const pkg = selectedPkg;
      const dragStart = (pkg as CargoPackage & { _dragStart?: typeof pkg.position })._dragStart;
      const collision = hasCollision(pkg, packagesRef.current);
      if (!collision.ok && dragStart) {
        pkg.position.x = dragStart.x;
        pkg.position.z = dragStart.z;
        pkg.position.y = dragStart.y;
        callbacksRef.current.onSelectedInfoChange(
          `${pkg.type} · reverted (${collision.reason})`,
        );
      } else {
        pkg.homePosition = { ...pkg.position };
        callbacksRef.current.onSelectedInfoChange(
          `${pkg.type} · ${pkg.weightKg.toLocaleString()} kg · placed`,
        );
      }
      delete (pkg as CargoPackage & { _dragStart?: typeof pkg.position })._dragStart;
      isDragging = false;
      selectedPkg = null;
      activePointerId = null;
      controls.enabled = true;
      canvasEl.style.cursor = "default";
      callbacksRef.current.onPackagesChange([...packagesRef.current]);
      updateAll(packagesRef.current);
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const pkg = pickPackage(event);
      if (pkg) beginDrag(pkg, event);
    };

    const onPointerMove = (event: PointerEvent) => {
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

        const collision = hasCollision(selectedPkg, packagesRef.current);
        setMeshState(selectedPkg, collision.ok ? "selected" : "invalid");
        syncMeshPosition(selectedPkg);
        const metrics = computeMetrics(packagesRef.current);
        updateCgMarker3D(metrics);
        updateFloatPanel(metrics);
        callbacksRef.current.onMetricsChange(metrics);
        return;
      }

      if (!isDragging) {
        const pkg = pickPackage(event);
        if (pkg?.id !== hoveredPkg?.id) {
          hoveredPkg = pkg;
          updateAll(packagesRef.current);
          canvasEl.style.cursor = pkg ? "grab" : "default";
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId === activePointerId && isDragging) {
        if (canvasEl.hasPointerCapture(event.pointerId)) {
          canvasEl.releasePointerCapture(event.pointerId);
        }
        endDrag();
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId === activePointerId && isDragging) endDrag();
    };

    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointermove", onPointerMove);
    canvasEl.addEventListener("pointerup", onPointerUp);
    canvasEl.addEventListener("pointercancel", onPointerCancel);

    let raf = 0;
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      labelRenderer.setSize(w, h);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      const t = performance.now() * 0.001;
      stats3d.position.y = HOLD.heightM * 0.85 + Math.sin(t * 1.1) * 0.06;
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    void loadEnvironment(scene, renderer).then(() => {
      syncPackagesRef.current?.(packagesRef.current);
      animate();
    });

    return () => {
      syncPackagesRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      canvasEl.removeEventListener("pointerup", onPointerUp);
      canvasEl.removeEventListener("pointercancel", onPointerCancel);
      for (const id of [...packageMeshes.keys()]) disposePackage(id);
      container.removeChild(labelRenderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene mounts once; packages synced via separate effect
  }, []);

  useEffect(() => {
    packagesRef.current = packages;
    syncPackagesRef.current?.(packages);
  }, [packages]);

  return (
    <div ref={containerRef} className="cargo-scene relative h-full w-full overflow-hidden bg-[#D8E0EC]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-4 rounded-full border border-[#E8EAED] bg-white/90 px-4 py-2 text-xs text-[#6B7280] shadow-sm backdrop-blur-sm">
        <span>Left — Move cargo</span>
        <span>Right — Rotate view</span>
        <span>Scroll — Zoom</span>
      </div>

      <div ref={floatPanelRef} className="cargo-float-panel">
        <div className="rounded-xl border border-[#E8EAED] bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Live Telemetry</div>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-[#6B7280]">CG Offset</span>
              <strong ref={floatCgRef}>—</strong>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[#6B7280]">Payload</span>
              <strong>
                <span ref={floatMassRef}>—</span> kg
              </strong>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-[#6B7280]">Status</span>
              <strong ref={floatStatusRef}>—</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
