import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TripForm from "@/components/admin/TripForm";
import PhotoManager from "@/components/admin/PhotoManager";
import DeleteTripButton from "@/components/admin/DeleteTripButton";
import BlobWarning from "@/components/admin/BlobWarning";
import { updateTrip } from "../../actions";

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { photos: true },
  });

  if (!trip) notFound();

  const boundUpdate = updateTrip.bind(null, trip.id);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{trip.title}</h1>
        <DeleteTripButton tripId={trip.id} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wide opacity-60">
          Trip details
        </h2>
        <TripForm
          action={boundUpdate}
          submitLabel="Save changes"
          defaultValues={{
            title: trip.title,
            slug: trip.slug,
            category: trip.category,
            date: toDateInputValue(trip.date),
            endDate: toDateInputValue(trip.endDate),
            description: trip.description ?? "",
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wide opacity-60">
          Photos ({trip.photos.length})
        </h2>
        <BlobWarning />
        <PhotoManager
          tripId={trip.id}
          photos={trip.photos}
          coverPhotoId={trip.coverPhotoId}
        />
      </section>
    </div>
  );
}
