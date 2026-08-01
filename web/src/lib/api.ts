const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DashboardSummary = {
  as_of: string;
  delay?: { delay_rate: number; avg_delay_minutes: number; metrics: Record<string, number>; sparkline: { date: string; value: number }[] };
  engine?: { avg_rul_cycles: number; critical_engines: number; metrics: Record<string, number>; sparkline: { date: string; value: number }[] };
};

export type DelayPrediction = { delay_probability: number; is_delayed: boolean; predicted_delay_minutes: number; confidence: number };
export type EnginePrediction = { unit_nr: number; predicted_rul_cycles: number; status: string; current_cycle: number; is_critical: boolean; sensor_readings: Record<string, number> };
export type ModelInfo = { display_name: string; architecture: string; metrics: Record<string, number | null>; notebook_url: string };
export type EngineUnit = { unit_nr: number; max_cycle: number; current_cycle: number };
export type EngineTelemetry = { unit_nr: number; max_cycle: number; current_cycle: number; series: { cycle: number; [key: string]: number }[] };
export type RulTimelinePoint = { cycle: number; rul: number; status: string };

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, next: { revalidate: 30 } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDashboardSummary() { try { return await fetchApi<DashboardSummary>("/dashboard/summary"); } catch { return null; } }
export async function getDelayModel() { try { return await fetchApi<ModelInfo>("/models/delay"); } catch { return null; } }
export async function getEngineModel() { try { return await fetchApi<ModelInfo>("/models/engine"); } catch { return null; } }
export async function listEngineUnits() { try { return await fetchApi<EngineUnit[]>("/engines/units"); } catch { return []; } }

export async function getEngineTelemetry(unitNr: number, atCycle?: number) {
  const q = atCycle ? `?at_cycle=${atCycle}` : "";
  return fetchApi<EngineTelemetry>(`/engines/units/${unitNr}/telemetry${q}`, { cache: "no-store" });
}

export async function getRulTimeline(unitNr: number) {
  return fetchApi<RulTimelinePoint[]>(`/engines/units/${unitNr}/rul-timeline`, { cache: "no-store" });
}

export async function predictEngine(unitNr: number, atCycle?: number): Promise<EnginePrediction> {
  return fetchApi<EnginePrediction>("/predict/engine", {
    method: "POST",
    body: JSON.stringify({ unit_nr: unitNr, at_cycle: atCycle ?? null }),
    cache: "no-store",
  });
}
export { API_URL };
