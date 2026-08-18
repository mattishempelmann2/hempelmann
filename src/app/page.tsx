import { prisma } from "@/lib/prisma";
import EnterGate from "@/components/EnterGate";

export default async function LandingPage() {
  const categoryCounts = await prisma.trip.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { category: "asc" },
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold uppercase leading-[0.95] tracking-tight">
          HEMPELMANN
        </h1>
        <EnterGate />
      </div>

      {categoryCounts.length > 0 && (
        <aside className="md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-black/10 px-6 py-10 text-xs uppercase tracking-wide">
          {categoryCounts.map((c) => (
            <div key={c.category} className="flex justify-between py-1">
              <span>{c.category}</span>
              <span className="opacity-50">({c._count._all})</span>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}
