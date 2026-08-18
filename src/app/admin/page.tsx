import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const trips = await prisma.trip.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { photos: true } } },
  });

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
        <Link
          href="/admin/trips/new"
          className="bg-black text-white text-xs uppercase tracking-wide px-4 py-2 hover:opacity-80"
        >
          + New trip
        </Link>
      </div>

      {trips.length === 0 && (
        <p className="text-sm opacity-60">
          No trips yet. Create your first one to start building the timeline.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-black/10 border-t border-b border-black/10">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link
              href={`/admin/trips/${trip.id}`}
              className="flex items-center justify-between py-3 hover:bg-black/[0.03] px-2"
            >
              <div>
                <p className="font-medium">{trip.title}</p>
                <p className="text-xs opacity-60 uppercase tracking-wide">
                  {trip.category} ·{" "}
                  {trip.date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p className="text-xs opacity-60">{trip._count.photos} photos</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
