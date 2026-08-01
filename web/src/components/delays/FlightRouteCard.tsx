"use client";

import { AIRPORTS, type FlightRoute } from "@/lib/flight-routes";
import type { DelayPrediction } from "@/lib/api";

type FlightRouteCardProps = {
  route: FlightRoute;
  selected: boolean;
  prediction: DelayPrediction | null;
  loading: boolean;
  onSelect: () => void;
};

export function FlightRouteCard({
  route,
  selected,
  prediction,
  loading,
  onSelect,
}: FlightRouteCardProps) {
  const origin = AIRPORTS[route.origin];
  const dest = AIRPORTS[route.dest];
  const isDelayed = prediction?.is_delayed;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border p-4 text-left transition-colors duration-200 ${
        selected
          ? "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-inset ring-[#2563EB]/30"
          : "border-[#E8EAED] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFBFC]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">{route.flightNumber}</p>
          <p className="mt-0.5 text-sm font-semibold text-[#111827]">
            {route.origin} → {route.dest}
          </p>
        </div>
        {loading && selected ? (
          <span className="flight-spinner shrink-0" />
        ) : prediction ? (
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium ${
              isDelayed ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#ECFDF5] text-[#16A34A]"
            }`}
          >
            {isDelayed ? "Delayed" : "On time"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-[#6B7280]">
        <span className="flex h-5 w-5 items-center justify-center bg-[#2563EB] text-[10px] font-bold text-white">
          A
        </span>
        <span className="truncate">{origin?.city}</span>
        <span className="text-[#CBD5E1]">——</span>
        <span className="flex h-5 w-5 items-center justify-center bg-[#16A34A] text-[10px] font-bold text-white">
          B
        </span>
        <span className="truncate">{dest?.city}</span>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-[#6B7280]">
        <span>{route.distance} mi</span>
        <span>
          {Math.floor(route.elapsed / 60)}h {route.elapsed % 60}m
        </span>
        {prediction && (
          <span className={isDelayed ? "font-medium text-[#D97706]" : "font-medium text-[#16A34A]"}>
            {(prediction.delay_probability * 100).toFixed(0)}% risk
          </span>
        )}
      </div>
    </button>
  );
}
