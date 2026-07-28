import * as THREE from 'three';

/** Procedural PBR textures for ULD surfaces */
export function makeCanvasTexture(drawFn, w = 512, h = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function ld3Texture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#2f6fad';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 48) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, 0, 8, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(w * 0.08, h * 0.2, w * 0.12, h * 0.6);
  });
}

export function palletTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.fillStyle = y % 96 === 0 ? '#b8956a' : '#d4b896';
      ctx.fillRect(0, y, w, 24);
    }
  });
}

export function containerTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#6b7280');
    g.addColorStop(0.5, '#9ca3af');
    g.addColorStop(1, '#6b7280');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  });
}

export function floorTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#d1d9e6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(100,116,139,0.2)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, 1024, 1024);
}

function roundedBox(w, h, d, radius, seg = 4) {
  const shape = new THREE.Shape();
  const r = Math.min(radius, w / 2, h / 2);
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: r * 0.3, bevelSize: r * 0.3, bevelSegments: seg });
  geo.center();
  return geo;
}

export function createUldMesh(pkg) {
  const dims = { x: pkg.dimsM[0], y: pkg.dimsM[2], z: pkg.dimsM[1] };
  const group = new THREE.Group();
  group.userData.pkgId = pkg.id;

  let map;
  let color = pkg.color;
  if (pkg.type === 'LD3') map = ld3Texture();
  else if (pkg.type === 'PMC Pallet') map = palletTexture();
  else map = containerTexture();

  const mat = new THREE.MeshPhysicalMaterial({
    map,
    color: 0xffffff,
    roughness: pkg.type === 'PMC Pallet' ? 0.85 : 0.45,
    metalness: pkg.type === 'LD3' ? 0.35 : 0.1,
    clearcoat: pkg.type === 'LD3' ? 0.4 : 0.1,
    clearcoatRoughness: 0.3,
  });

  const geo = roundedBox(dims.x, dims.y, dims.z, Math.min(0.08, dims.x * 0.06));
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  if (pkg.type === 'PMC Pallet') {
    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(dims.x * 0.88, dims.y * 0.55, dims.z * 0.88),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }),
    );
    cargo.position.y = dims.y * 0.22;
    cargo.castShadow = true;
    group.add(cargo);
    const wrap = new THREE.Mesh(
      new THREE.BoxGeometry(dims.x * 0.9, dims.y * 0.6, dims.z * 0.9),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.2,
        metalness: 0,
        transmission: 0.15,
      }),
    );
    wrap.position.y = dims.y * 0.2;
    group.add(wrap);
  }

  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x4f8cff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
  });
  const outline = new THREE.Mesh(geo.clone(), outlineMat);
  outline.scale.multiplyScalar(1.04);
  outline.userData.isOutline = true;
  group.add(outline);

  const label = document.createElement('div');
  label.className = 'pkg-label';
  label.textContent = `${pkg.type} · ${pkg.weightKg.toLocaleString()} kg`;
  label.style.opacity = '0';
  group.userData.labelEl = label;

  group.userData.bodyMat = mat;
  group.userData.outlineMat = outlineMat;
  group.userData.baseColor = color;

  return { group, dims, label };
}

export function buildAircraftShell(hold, zones, gridCellM) {
  const root = new THREE.Group();
  const { lengthM, widthM, heightM } = hold;

  const floorMap = floorTexture();
  floorMap.repeat.set(lengthM / 2, widthM / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(lengthM, widthM),
    new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.85, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(lengthM / 2, 0, widthM / 2);
  floor.receiveShadow = true;
  root.add(floor);

  for (const [name, spec] of Object.entries(zones)) {
    const [x0, x1] = spec.xRange;
    const len = (x1 - x0) * gridCellM;
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(len, widthM),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.14,
        roughness: 1,
      }),
    );
    band.rotation.x = -Math.PI / 2;
    band.position.set(x0 * gridCellM + len / 2, 0.003, widthM / 2);
    root.add(band);

    const bulkhead = new THREE.Mesh(
      new THREE.PlaneGeometry(widthM, heightM),
      new THREE.MeshPhysicalMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        roughness: 0.5,
      }),
    );
    bulkhead.position.set(x0 * gridCellM, heightM / 2, widthM / 2);
    bulkhead.rotation.y = Math.PI / 2;
    root.add(bulkhead);
  }

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8eef7,
    transparent: true,
    opacity: 0.22,
    roughness: 0.15,
    metalness: 0.4,
    side: THREE.DoubleSide,
    clearcoat: 0.6,
  });

  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(widthM * 0.52, widthM * 0.48, lengthM + 1.6, 32, 1, true),
    shellMat,
  );
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.set(lengthM / 2, heightM * 0.55, widthM / 2);
  root.add(fuselage);

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(widthM * 0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    shellMat.clone(),
  );
  nose.rotation.z = Math.PI / 2;
  nose.rotation.y = Math.PI;
  nose.position.set(-0.05, heightM * 0.55, widthM / 2);
  root.add(nose);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(widthM * 0.42, 1.8, 32),
    shellMat.clone(),
  );
  tail.rotation.z = -Math.PI / 2;
  tail.position.set(lengthM + 0.9, heightM * 0.55, widthM / 2);
  root.add(tail);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(lengthM, widthM),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(lengthM / 2, heightM, widthM / 2);
  root.add(ceiling);

  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(lengthM, heightM, widthM));
  const edges = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.45 }),
  );
  edges.position.set(lengthM / 2, heightM / 2, widthM / 2);
  root.add(edges);

  return root;
}

export async function loadEnvironment(scene, renderer) {
  const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  return new Promise((resolve) => {
    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
        (hdr) => {
          scene.environment = pmrem.fromEquirectangular(hdr).texture;
          scene.background = new THREE.Color(0xd8e0ec);
          hdr.dispose();
          pmrem.dispose();
          resolve();
        },
        undefined,
        () => {
          scene.background = new THREE.Color(0xd8e0ec);
          resolve();
        },
      );
  });
}
