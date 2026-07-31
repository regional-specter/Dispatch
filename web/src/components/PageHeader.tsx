export function PageHeader({ greeting = "Hello, Dispatcher!", title, subtitle, summary, activeTab = "metrics", detailHref }: {
  greeting?: string; title: string; subtitle: string; summary?: string; activeTab?: "metrics" | "detail"; detailHref?: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-sm text-[#6B7280]">{greeting}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#111827]">{title}</h1>
      <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
      {summary && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#374151]" dangerouslySetInnerHTML={{ __html: summary }} />}
      {detailHref && (
        <div className="mt-6 flex gap-6 border-b border-[#E8EAED] text-sm">
          <span className={activeTab === "metrics" ? "border-b-2 border-[#2563EB] pb-2 font-medium text-[#2563EB]" : "pb-2 text-[#6B7280]"}>Metrics</span>
          <a href={detailHref} className={activeTab === "detail" ? "border-b-2 border-[#2563EB] pb-2 font-medium text-[#2563EB]" : "pb-2 text-[#6B7280]"}>Detail Page</a>
        </div>
      )}
    </div>
  );
}
