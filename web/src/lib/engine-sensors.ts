export const SENSOR_LABELS: Record<string, string> = {
  s2: "Fan inlet temp",
  s3: "LPC outlet temp",
  s4: "HPC outlet temp",
  s7: "HPC outlet pressure",
  s11: "Physical fan speed",
  s12: "Physical core speed",
  s13: "Engine pressure ratio",
  s15: "Bypass ratio",
  s17: "Bleed enthalpy",
  s20: "Demanded fan speed",
  s21: "Demanded core speed",
};

export const SENSOR_GROUPS = {
  fan: { label: "Fan section", sensors: ["s2", "s11", "s20"] as const },
  compressor: { label: "Compressor", sensors: ["s3", "s4", "s7", "s12", "s21"] as const },
  turbine: { label: "Turbine / flow", sensors: ["s13", "s15", "s17"] as const },
};

export const CRITICAL_RUL = 15;
export const MAX_RUL_DISPLAY = 125;

export type TelemetryPoint = {
  cycle: number;
  [key: string]: number;
};

export type RulTimelinePoint = {
  cycle: number;
  rul: number;
  status: string;
};

export function statusColor(status: string): string {
  if (status === "critical") return "#DC2626";
  if (status === "warning") return "#D97706";
  return "#16A34A";
}

export function sensorHealth(value: number): "healthy" | "warning" | "critical" {
  if (value > 1.35) return "critical";
  if (value > 1.2) return "warning";
  return "healthy";
}

export function sensorHealthColor(health: ReturnType<typeof sensorHealth>): string {
  if (health === "critical") return "#DC2626";
  if (health === "warning") return "#D97706";
  return "#2563EB";
}
