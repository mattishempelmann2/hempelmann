import { prisma } from "@/lib/prisma";
import TimelineExperience from "@/components/TimelineExperience";

export default async function TimelinePage() {
  const trips = await prisma.trip.findMany({
    where: { photos: { some: { showOnTimeline: true } } },
    orderBy: { date: "asc" },
    include: {
      photos: {
        where: { showOnTimeline: true },
        orderBy: { order: "asc" },
      },
    },
  });

  const photos = trips.flatMap((trip) =>
    trip.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      tripSlug: trip.slug,
      tripTitle: trip.title,
      category: trip.category,
      date: trip.date.toISOString(),
    }))
  );

  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm opacity-60">
          No photos on the timeline yet. Go to{" "}
          <a href="/admin" className="underline">
            /admin
          </a>{" "}
          to create a trip, upload photos, and check &quot;on timeline&quot;
          for the ones you want to show up here.
        </p>
      </div>
    );
  }

  return <TimelineExperience photos={photos} />;
}
