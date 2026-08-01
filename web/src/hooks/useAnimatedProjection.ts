"use client";

import { useEffect, useRef, useState } from "react";
import { type MapProjection, easeInOutCubic } from "@/lib/map-projection";

const DEFAULT: MapProjection = { center: [-96, 38], scale: 165 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function useAnimatedProjection(
  target: MapProjection,
  duration = 900,
): MapProjection {
  const [projection, setProjection] = useState<MapProjection>(target);
  const currentRef = useRef<MapProjection>(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = currentRef.current;
    const to = target;
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const raw = Math.min(1, (now - start) / duration);
      const t = easeInOutCubic(raw);
      const next: MapProjection = {
        center: [
          lerp(from.center[0], to.center[0], t),
          lerp(from.center[1], to.center[1], t),
        ],
        scale: lerp(from.scale, to.scale, t),
      };
      currentRef.current = next;
      setProjection(next);

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target.center[0], target.center[1], target.scale, duration]);

  return projection;
}

export { DEFAULT as DEFAULT_PROJECTION };
