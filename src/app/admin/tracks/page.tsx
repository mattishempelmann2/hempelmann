import { prisma } from "@/lib/prisma";
import TrackManager from "@/components/admin/TrackManager";
import BlobWarning from "@/components/admin/BlobWarning";

export default async function TracksPage() {
  const tracks = await prisma.track.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Music playlist</h1>
      <p className="text-sm opacity-60">
        These tracks play in order as background music on the timeline page.
      </p>
      <BlobWarning />
      <TrackManager tracks={tracks} />
    </div>
  );
}
