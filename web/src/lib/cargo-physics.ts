/** Cargo W&B physics — ported from cargo-weight-&-balance-optimization-model.ipynb */

export const GRID_CELL_M = 0.65;

export const HOLD = {
  cells: { x: 12, y: 6, z: 3 },
  get lengthM() {
    return this.cells.x * GRID_CELL_M;
  },
  get widthM() {
    return this.cells.y * GRID_CELL_M;
  },
  get heightM() {
    return this.cells.z * GRID_CELL_M;
  },
  maxPayloadKg: 103_000,
};

export const ZONES = {
  FWD: { xRange: [0, 4] as const, maxWeightKg: 35_000, color: 0x4f8cff },
  CENTER: { xRange: [4, 8] as const, maxWeightKg: 45_000, color: 0x7c5cfc },
  AFT: { xRange: [8, 12] as const, maxWeightKg: 35_000, color: 0x3ecf8e },
};

export type ZoneName = keyof typeof ZONES;

export const ULD_TYPES = [
  { type: "LD3", dims: [1.56, 1.53, 1.63] as const, maxWeight: 1588, color: 0x5b9bd5 },
  { type: "PMC Pallet", dims: [2.44, 3.18, 1.62] as const, maxWeight: 6800, color: 0xed7d31 },
  { type: "M1N Box", dims: [2.44, 3.18, 2.44] as const, maxWeight: 11340, color: 0xa5a5a5 },
] as const;

export interface CargoPackage {
  id: string;
  type: string;
  weightKg: number;
  dimsM: [number, number, number];
  color: number;
  position: { x: number; y: number; z: number };
  homePosition?: { x: number; y: number; z: number };
}

export interface CargoMetrics {
  targetCgX: number;
  cgX: number;
  cgOffset: number;
  cgFwdLimit: number;
  cgAftLimit: number;
  cgWithinEnvelope: boolean;
  zoneWeights: Record<ZoneName, number>;
  zoneLimitsOk: boolean;
  totalMassKg: number;
  payloadOk: boolean;
  volumeUtilization: number;
  complianceScore: number;
  status: "OK" | "WARN";
}

export interface PackageDims {
  x: number;
  y: number;
  z: number;
}

export function dimsMFromUld(uld: Pick<CargoPackage, "dimsM">): PackageDims {
  return { x: uld.dimsM[0], y: uld.dimsM[2], z: uld.dimsM[1] };
}

export function fitsInHold(dims: PackageDims): boolean {
  return dims.x <= HOLD.lengthM && dims.z <= HOLD.widthM && dims.y <= HOLD.heightM;
}

export function randomUld(seed = Date.now()): Omit<CargoPackage, "position"> {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const preset = ULD_TYPES[Math.floor(rand() * ULD_TYPES.length)];
  const weight = Math.round(500 + rand() * (preset.maxWeight - 500));
  return {
    id: `ULD-${Math.floor(rand() * 9000 + 1000)}`,
    type: preset.type,
    weightKg: weight,
    dimsM: [...preset.dims],
    color: preset.color,
  };
}

export function generateManifest(count = 5, seed = 42): Omit<CargoPackage, "position">[] {
  const items: Omit<CargoPackage, "position">[] = [];
  let attempts = 0;
  while (items.length < count && attempts < count * 20) {
    attempts += 1;
    const item = randomUld(seed + attempts * 97);
    if (fitsInHold(dimsMFromUld(item))) items.push(item);
  }
  return items;
}

export function worldToCell(posM: { x: number; y: number; z: number }) {
  return {
    x: Math.floor(posM.x / GRID_CELL_M),
    y: Math.floor(posM.y / GRID_CELL_M),
    z: Math.floor(posM.z / GRID_CELL_M),
  };
}

const EPS = 0.02;

export interface PackageBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function packageBounds(pkg: CargoPackage): PackageBounds {
  const dims = dimsMFromUld(pkg);
  return {
    minX: pkg.position.x,
    maxX: pkg.position.x + dims.x,
    minY: pkg.position.y,
    maxY: pkg.position.y + dims.y,
    minZ: pkg.position.z,
    maxZ: pkg.position.z + dims.z,
  };
}

export function boundsOverlap(a: PackageBounds, b: PackageBounds): boolean {
  return !(
    a.maxX <= b.minX + EPS ||
    a.minX >= b.maxX - EPS ||
    a.maxY <= b.minY + EPS ||
    a.minY >= b.maxY - EPS ||
    a.maxZ <= b.minZ + EPS ||
    a.minZ >= b.maxZ - EPS
  );
}

export function isInsideHoldBounds(b: PackageBounds): boolean {
  return (
    b.minX >= -EPS &&
    b.minY >= -EPS &&
    b.minZ >= -EPS &&
    b.maxX <= HOLD.lengthM + EPS &&
    b.maxY <= HOLD.heightM + EPS &&
    b.maxZ <= HOLD.widthM + EPS
  );
}

export function hasCollision(
  pkg: CargoPackage,
  allPackages: CargoPackage[],
): { ok: true } | { ok: false; reason: "out_of_bounds" | "collision" } {
  const bounds = packageBounds(pkg);
  if (!isInsideHoldBounds(bounds)) return { ok: false, reason: "out_of_bounds" };
  for (const other of allPackages) {
    if (other.id === pkg.id) continue;
    if (boundsOverlap(bounds, packageBounds(other))) {
      return { ok: false, reason: "collision" };
    }
  }
  return { ok: true };
}

export function layoutManifest(manifest: Omit<CargoPackage, "position">[]): CargoPackage[] {
  const placed: CargoPackage[] = [];

  for (const item of manifest) {
    const dims = dimsMFromUld(item);
    let found: CargoPackage | null = null;
    const step = GRID_CELL_M / 2;

    for (let z = 0; z <= HOLD.widthM - dims.z + 0.001 && !found; z += step) {
      for (let x = 0; x <= HOLD.lengthM - dims.x + 0.001 && !found; x += step) {
        const candidate: CargoPackage = {
          ...item,
          position: { x, y: 0, z },
        };
        if (hasCollision(candidate, placed).ok) found = candidate;
      }
    }

    if (found) {
      found.homePosition = { ...found.position };
      placed.push(found);
    }
  }
  return placed;
}

function occupancyRatio(packages: CargoPackage[]): number {
  const holdVol = HOLD.lengthM * HOLD.widthM * HOLD.heightM;
  const usedVol = packages.reduce((sum, pkg) => {
    const d = dimsMFromUld(pkg);
    return sum + d.x * d.y * d.z;
  }, 0);
  return Math.min(1, usedVol / holdVol);
}

export function snapToGrid(pkg: CargoPackage): void {
  const dims = dimsMFromUld(pkg);
  const step = GRID_CELL_M / 4;
  pkg.position.x = Math.round(pkg.position.x / step) * step;
  pkg.position.z = Math.round(pkg.position.z / step) * step;
  pkg.position.x = Math.max(0, Math.min(HOLD.lengthM - dims.x, pkg.position.x));
  pkg.position.z = Math.max(0, Math.min(HOLD.widthM - dims.z, pkg.position.z));
  pkg.position.y = 0;
}

export function computeMetrics(packages: CargoPackage[]): CargoMetrics {
  const targetCgX = HOLD.cells.x / 2;
  const cgFwdLimit = targetCgX - 1.5;
  const cgAftLimit = targetCgX + 1.5;

  const zoneWeights: Record<ZoneName, number> = { FWD: 0, CENTER: 0, AFT: 0 };
  let totalMass = 0;
  let momentX = 0;

  for (const pkg of packages) {
    const dims = dimsMFromUld(pkg);
    const cx = pkg.position.x + dims.x / 2;
    const cellCx = cx / GRID_CELL_M;
    totalMass += pkg.weightKg;
    momentX += pkg.weightKg * cellCx;

    const x0 = pkg.position.x;
    const x1 = pkg.position.x + dims.x;
    for (const [name, spec] of Object.entries(ZONES) as [ZoneName, (typeof ZONES)[ZoneName]][]) {
      const z0 = spec.xRange[0] * GRID_CELL_M;
      const z1 = spec.xRange[1] * GRID_CELL_M;
      const overlap = Math.max(0, Math.min(x1, z1) - Math.max(x0, z0));
      if (overlap > 0) zoneWeights[name] += pkg.weightKg * (overlap / dims.x);
    }
  }

  const cgX = totalMass > 0 ? momentX / totalMass : targetCgX;
  const cgOffset = Math.abs(targetCgX - cgX);
  const cgWithinEnvelope = cgX >= cgFwdLimit && cgX <= cgAftLimit;
  const zoneLimitsOk = (Object.entries(ZONES) as [ZoneName, (typeof ZONES)[ZoneName]][]).every(
    ([name, spec]) => zoneWeights[name] <= spec.maxWeightKg,
  );
  const payloadOk = totalMass <= HOLD.maxPayloadKg;
  const volumeUtilization = Math.min(1, occupancyRatio(packages));

  const complianceScore =
    (cgWithinEnvelope ? 40 : 0) +
    (zoneLimitsOk ? 30 : 0) +
    (payloadOk ? 20 : 0) +
    Math.max(0, 10 - cgOffset * 4);

  return {
    targetCgX,
    cgX,
    cgOffset,
    cgFwdLimit,
    cgAftLimit,
    cgWithinEnvelope,
    zoneWeights,
    zoneLimitsOk,
    totalMassKg: totalMass,
    payloadOk,
    volumeUtilization,
    complianceScore,
    status: cgWithinEnvelope && zoneLimitsOk && payloadOk ? "OK" : "WARN",
  };
}

export function autoBalance(packages: CargoPackage[]): void {
  const sorted = [...packages].sort((a, b) => b.weightKg - a.weightKg);
  const targets = [
    { x: 1.3, z: 0.2 },
    { x: 7.8, z: 0.2 },
    { x: 4.5, z: 0.65 },
    { x: 2.6, z: 2.0 },
    { x: 6.5, z: 2.0 },
  ];

  for (let i = 0; i < sorted.length; i += 1) {
    const pkg = sorted[i];
    const dims = dimsMFromUld(pkg);
    const t = targets[i % targets.length];
    pkg.position.x = Math.min(t.x, HOLD.lengthM - dims.x);
    pkg.position.z = Math.min(t.z, HOLD.widthM - dims.z);
    pkg.position.y = 0;
    snapToGrid(pkg);

    if (!hasCollision(pkg, sorted).ok) {
      const relaid = layoutManifest([pkg]);
      if (relaid[0]) {
        pkg.position = { ...relaid[0].position };
      }
    }
    pkg.homePosition = { ...pkg.position };
  }
}

export function createInitialLoad(count = 5, seed?: number): CargoPackage[] {
  const manifest = generateManifest(count, seed ?? Date.now());
  return layoutManifest(manifest);
}
