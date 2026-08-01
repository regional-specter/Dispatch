export type Airport = {
  code: string;
  name: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
};

export type FlightRoute = {
  id: string;
  origin: string;
  dest: string;
  distance: number;
  elapsed: number;
  flightNumber: string;
};

export const AIRPORTS: Record<string, Airport> = {
  JFK: { code: "JFK", name: "John F. Kennedy Intl", city: "New York", coordinates: [-73.7781, 40.6413] },
  LAX: { code: "LAX", name: "Los Angeles Intl", city: "Los Angeles", coordinates: [-118.4081, 33.9425] },
  ORD: { code: "ORD", name: "O'Hare Intl", city: "Chicago", coordinates: [-87.9048, 41.9786] },
  ATL: { code: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", coordinates: [-84.4281, 33.6407] },
  DFW: { code: "DFW", name: "Dallas/Fort Worth", city: "Dallas", coordinates: [-97.0403, 32.8998] },
  DEN: { code: "DEN", name: "Denver Intl", city: "Denver", coordinates: [-104.6737, 39.8561] },
  SFO: { code: "SFO", name: "San Francisco Intl", city: "San Francisco", coordinates: [-122.379, 37.6213] },
  SEA: { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", coordinates: [-122.3088, 47.4502] },
  EWR: { code: "EWR", name: "Newark Liberty", city: "Newark", coordinates: [-74.1745, 40.6895] },
  MCO: { code: "MCO", name: "Orlando Intl", city: "Orlando", coordinates: [-81.3081, 28.4312] },
  MIA: { code: "MIA", name: "Miami Intl", city: "Miami", coordinates: [-80.2906, 25.7959] },
  BOS: { code: "BOS", name: "Boston Logan", city: "Boston", coordinates: [-71.0096, 42.3656] },
  IAH: { code: "IAH", name: "George Bush Intl", city: "Houston", coordinates: [-95.3414, 29.9902] },
  LAS: { code: "LAS", name: "Harry Reid Intl", city: "Las Vegas", coordinates: [-115.1522, 36.084] },
};

export const FLIGHT_ROUTES: FlightRoute[] = [
  { id: "flt-101", origin: "JFK", dest: "LAX", distance: 2475, elapsed: 360, flightNumber: "DL 412" },
  { id: "flt-102", origin: "ORD", dest: "ATL", distance: 606, elapsed: 120, flightNumber: "UA 891" },
  { id: "flt-103", origin: "DFW", dest: "DEN", distance: 641, elapsed: 130, flightNumber: "AA 1204" },
  { id: "flt-104", origin: "SFO", dest: "SEA", distance: 679, elapsed: 115, flightNumber: "AS 338" },
  { id: "flt-105", origin: "EWR", dest: "MCO", distance: 937, elapsed: 165, flightNumber: "B6 1502" },
  { id: "flt-106", origin: "MIA", dest: "BOS", distance: 1258, elapsed: 195, flightNumber: "AA 718" },
  { id: "flt-107", origin: "LAX", dest: "ORD", distance: 1745, elapsed: 250, flightNumber: "UA 240" },
  { id: "flt-108", origin: "IAH", dest: "LAS", distance: 1220, elapsed: 195, flightNumber: "WN 904" },
];

export const CARRIERS = ["AA", "DL", "UA", "WN", "B6", "AS"];

/** Interpolate points along a great-circle arc (slerp on the sphere). */
export function greatCircleArc(
  start: [number, number],
  end: [number, number],
  steps = 80,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [λ1, φ1] = [toRad(start[0]), toRad(start[1])];
  const [λ2, φ2] = [toRad(end[0]), toRad(end[1])];

  const Δ =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );

  if (Δ === 0) return [start, end];

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * Δ) / Math.sin(Δ);
    const B = Math.sin(f * Δ) / Math.sin(Δ);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return points;
}
