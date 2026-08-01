"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  useMapContext,
} from "react-simple-maps";
import { AIRPORTS, greatCircleArc, type FlightRoute } from "@/lib/flight-routes";
import { computeRouteProjection } from "@/lib/map-projection";
import { useAnimatedProjection } from "@/hooks/useAnimatedProjection";
import type { DelayPrediction } from "@/lib/api";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function GreatCircleRoute({
  from,
  to,
  color,
  animate,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  animate: boolean;
}) {
  const { path } = useMapContext();

  const pathD = useMemo(() => {
    const points = greatCircleArc(from, to);
    const geo = { type: "LineString" as const, coordinates: points };
    return path(geo) ?? "";
  }, [from, to, path]);

  if (!pathD) return null;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="square"
        opacity={0.18}
        strokeDasharray="8 6"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="square"
        className={animate ? "flight-arc-draw" : ""}
        style={{ "--arc-color": color } as React.CSSProperties}
      />
      {animate && (
        <circle r={4} fill="#fff" stroke={color} strokeWidth={2}>
          <animateMotion dur="5s" repeatCount="indefinite" path={pathD} />
        </circle>
      )}
    </g>
  );
}

type FlightRouteMapProps = {
  route: FlightRoute;
  prediction: DelayPrediction | null;
  loading: boolean;
};

export function FlightRouteMap({ route, prediction, loading }: FlightRouteMapProps) {
  const origin = AIRPORTS[route.origin];
  const dest = AIRPORTS[route.dest];

  const targetProjection = useMemo(() => {
    if (!origin || !dest) return { center: [-96, 38] as [number, number], scale: 165 };
    return computeRouteProjection(origin.coordinates, dest.coordinates);
  }, [origin, dest]);

  const projection = useAnimatedProjection(targetProjection, 900);

  const isDelayed = prediction?.is_delayed ?? false;
  const routeColor = prediction ? (isDelayed ? "#D97706" : "#16A34A") : "#2563EB";

  if (!origin || !dest) return null;

  return (
    <div className="relative h-full min-h-[520px] w-full overflow-hidden border border-[#E8EAED] bg-[#EEF1F5]">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: projection.scale,
          center: projection.center,
        }}
        width={960}
        height={560}
        className="h-full w-full transition-none"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#FAFBFC"
                stroke="#D1D5DB"
                strokeWidth={0.4}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#F3F4F6" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        <GreatCircleRoute
          key={`${route.origin}-${route.dest}`}
          from={origin.coordinates}
          to={dest.coordinates}
          color={routeColor}
          animate={!loading}
        />

        <Marker coordinates={origin.coordinates}>
          <g className="airport-marker">
            <rect x={-10} y={-10} width={20} height={20} fill="#2563EB" opacity={0.1} className="airport-pulse" />
            <rect x={-4} y={-4} width={8} height={8} fill="#2563EB" stroke="#fff" strokeWidth={1.5} />
            <text
              textAnchor="middle"
              y={-14}
              style={{ fontFamily: "system-ui", fontSize: 11, fontWeight: 700, fill: "#1E40AF" }}
            >
              {origin.code}
            </text>
            <text
              textAnchor="middle"
              y={22}
              style={{ fontFamily: "system-ui", fontSize: 9, fill: "#6B7280" }}
            >
              {origin.city}
            </text>
          </g>
        </Marker>

        <Marker coordinates={dest.coordinates}>
          <g className="airport-marker">
            <rect
              x={-10}
              y={-10}
              width={20}
              height={20}
              fill={routeColor}
              opacity={0.1}
              className="airport-pulse"
              style={{ animationDelay: "0.6s" }}
            />
            <rect x={-4} y={-4} width={8} height={8} fill={routeColor} stroke="#fff" strokeWidth={1.5} />
            <text
              textAnchor="middle"
              y={-14}
              style={{ fontFamily: "system-ui", fontSize: 11, fontWeight: 700, fill: "#166534" }}
            >
              {dest.code}
            </text>
            <text
              textAnchor="middle"
              y={22}
              style={{ fontFamily: "system-ui", fontSize: 9, fill: "#6B7280" }}
            >
              {dest.city}
            </text>
          </g>
        </Marker>
      </ComposableMap>

      <div
        className={`absolute bottom-4 left-4 right-4 border border-[#E8EAED] bg-white/95 p-4 shadow-sm backdrop-blur-sm transition-opacity duration-300 ${
          prediction ? "opacity-100" : "opacity-95"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              {route.flightNumber} · Great-circle route
            </p>
            <p className="mt-1 text-lg font-semibold text-[#111827]">
              {origin.code} → {dest.code}
              <span className="ml-2 text-sm font-normal text-[#6B7280]">
                {route.distance.toLocaleString()} mi · {Math.floor(route.elapsed / 60)}h{" "}
                {route.elapsed % 60}m
              </span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <span className="flight-spinner" />
              Scoring route…
            </div>
          ) : prediction ? (
            <div className="flex flex-wrap items-center gap-5">
              <div className="text-right">
                <p className={`text-2xl font-bold tabular-nums ${isDelayed ? "text-[#D97706]" : "text-[#16A34A]"}`}>
                  {(prediction.delay_probability * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-[#6B7280]">Delay risk</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-[#111827]">
                  {prediction.predicted_delay_minutes.toFixed(0)}
                  <span className="text-sm font-medium text-[#6B7280]"> min</span>
                </p>
                <p className="text-xs text-[#6B7280]">Est. delay</p>
              </div>
              <span
                className={`px-2.5 py-1 text-sm font-medium ${
                  isDelayed ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#ECFDF5] text-[#16A34A]"
                }`}
              >
                {isDelayed ? "Likely delayed" : "On time"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">Scoring…</p>
          )}
        </div>
      </div>

      <div className="absolute right-4 top-4 border border-[#E8EAED] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#6B7280] shadow-sm backdrop-blur-sm">
        Live delay model
      </div>
    </div>
  );
}
