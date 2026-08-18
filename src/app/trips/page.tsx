import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TripsIndexPage() {
  const trips = await prisma.trip.findMany({
    orderBy: { date: "desc" },
    include: {
      photos: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { photos: true } },
    },
  });

  return (
    <div className="min-h-screen pt-28 pb-20 px-6">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight mb-10">
        Index
      </h1>

      {trips.length === 0 && (
        <p className="text-sm opacity-60">Nothing here yet.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {trips.map((trip) => {
          const cover =
            trip.photos.find((p) => p.id === trip.coverPhotoId) ??
            trip.photos[0];
          return (
            <Link
              key={trip.id}
              href={`/trips/${trip.slug}`}
              className="group flex flex-col gap-2"
            >
              <div className="aspect-[4/5] bg-black/5 overflow-hidden">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.url}
                    alt={trip.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{trip.title}</p>
                <p className="text-xs opacity-50 uppercase tracking-wide">
                  {trip.category} ·{" "}
                  {trip.date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
