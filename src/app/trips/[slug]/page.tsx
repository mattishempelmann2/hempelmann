import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: { photos: { orderBy: { order: "asc" } } },
  });

  if (!trip) notFound();

  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-5xl mx-auto">
      <Link
        href="/trips"
        className="text-xs uppercase tracking-wide opacity-50 hover:opacity-100"
      >
        ← Index
      </Link>

      <header className="mt-6 mb-10 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide opacity-50">
          {trip.category} ·{" "}
          {trip.date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          {trip.endDate &&
            ` – ${trip.endDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight">
          {trip.title}
        </h1>
        {trip.description && (
          <p className="text-sm opacity-70 max-w-xl mt-2">{trip.description}</p>
        )}
      </header>

      {trip.photos.length === 0 ? (
        <p className="text-sm opacity-60">No photos yet.</p>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
          {trip.photos.map((photo) => (
            <figure key={photo.id} className="break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? trip.title}
                className="w-full h-auto object-cover"
              />
              {photo.caption && (
                <figcaption className="text-xs opacity-50 mt-1">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
