import { greatCircleArc } from "./flight-routes";
import { geoNaturalEarth1 } from "d3-geo";

export type MapProjection = {
  center: [number, number];
  scale: number;
};

const MAP_WIDTH = 960;
const MAP_HEIGHT = 560;
const MAP_PADDING = 72;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Fit projection so the route fills the viewport with padding. */
export function computeRouteProjection(
  origin: [number, number],
  dest: [number, number],
): MapProjection {
  const coords = [origin, dest, ...greatCircleArc(origin, dest, 80)];
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const center: [number, number] = [
    (Math.min(...lons) + Math.max(...lons)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];

  const projection = geoNaturalEarth1();
  let lo = 200;
  let hi = 3200;
  let best = lo;

  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    projection.scale(mid).center(center).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

    const allFit = coords.every(([lon, lat]) => {
      const p = projection([lon, lat]);
      if (!p) return false;
      return (
        p[0] >= MAP_PADDING &&
        p[0] <= MAP_WIDTH - MAP_PADDING &&
        p[1] >= MAP_PADDING &&
        p[1] <= MAP_HEIGHT - MAP_PADDING
      );
    });

    if (allFit) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Zoom in a bit tighter than the fit bounds
  return { center, scale: best * 1.18 };
}

export { easeInOutCubic };
