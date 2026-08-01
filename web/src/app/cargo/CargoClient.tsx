"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CargoMetricsSidebar } from "@/components/cargo/CargoMetricsSidebar";
import {
  autoBalance,
  computeMetrics,
  createInitialLoad,
  type CargoMetrics,
  type CargoPackage,
} from "@/lib/cargo-physics";

const CargoLoaderScene = dynamic(
  () => import("@/components/cargo/CargoLoaderScene").then((m) => m.CargoLoaderScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center bg-[#D8E0EC]">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span className="flight-spinner" />
          Loading 3D hold…
        </div>
      </div>
    ),
  },
);

export default function CargoClient() {
  const [packages, setPackages] = useState<CargoPackage[]>(() => createInitialLoad(5));
  const [metrics, setMetrics] = useState<CargoMetrics>(() => computeMetrics(packages));
  const [selectedInfo, setSelectedInfo] = useState("Click & drag a ULD inside the hold");

  const handlePackagesChange = useCallback((next: CargoPackage[]) => {
    setPackages(next.map((p) => ({ ...p, position: { ...p.position } })));
    setMetrics(computeMetrics(next));
  }, []);

  const handleMetricsChange = useCallback((next: CargoMetrics) => {
    setMetrics(next);
  }, []);

  const handleAutoBalance = useCallback(() => {
    setPackages((prev) => {
      const next = prev.map((p) => ({
        ...p,
        position: { ...p.position },
        homePosition: p.homePosition ? { ...p.homePosition } : undefined,
      }));
      autoBalance(next);
      return next;
    });
    setSelectedInfo("Auto-balance applied · drag to fine-tune");
  }, []);

  const handleReset = useCallback(() => {
    const next = createInitialLoad(5);
    setPackages(next);
    setMetrics(computeMetrics(next));
    setSelectedInfo("Click & drag a ULD inside the hold");
  }, []);

  const holdoutNote = useMemo(
    () =>
      "Heuristic bin-packing with CG envelope checks · PPO model training in progress",
    [],
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="shrink-0 px-6 pt-8">
        <PageHeader
          title="Cargo Weight & Balance"
          subtitle="777F main deck · interactive ULD placement within certified CG limits"
          activeTab="detail"
          detailHref="/cargo"
        />
      </div>

      <div className="flex min-h-0 flex-1 border-t border-[#E8EAED]">
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-[#E8EAED] bg-white">
          <div className="min-h-0 flex-1">
            <CargoMetricsSidebar
              metrics={metrics}
              selectedInfo={selectedInfo}
              onAutoBalance={handleAutoBalance}
              onReset={handleReset}
            />
          </div>

          <div className="shrink-0 border-t border-[#E8EAED] p-4">
            <p className="text-xs font-medium text-[#6B7280]">Model notes</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">{holdoutNote}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#F7F8FA]">
          <CargoLoaderScene
            packages={packages}
            onPackagesChange={handlePackagesChange}
            onMetricsChange={handleMetricsChange}
            onSelectedInfoChange={setSelectedInfo}
          />
        </div>
      </div>
    </div>
  );
}
