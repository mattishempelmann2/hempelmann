"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTrack, deleteTrack, reorderTracks } from "@/app/admin/actions";

type Track = {
  id: string;
  title: string;
  artist: string | null;
  url: string;
  order: number;
};

export default function TrackManager({ tracks }: { tracks: Track[] }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const sorted = [...tracks].sort((a, b) => a.order - b.order);

  function refresh() {
    router.refresh();
  }

  async function handleSubmit(formData: FormData) {
    setUploading(true);
    try {
      await createTrack(formData);
      formRef.current?.reset();
      refresh();
    } finally {
      setUploading(false);
    }
  }

  function remove(id: string) {
    if (!confirm("Remove this track from the playlist?")) return;
    startTransition(async () => {
      await deleteTrack(id);
      refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      await reorderTracks(next.map((t) => t.id));
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <form
        ref={formRef}
        action={handleSubmit}
        className="flex flex-col gap-3 border border-black/10 p-4"
      >
        <h2 className="text-xs uppercase tracking-wide opacity-60">
          Add a track
        </h2>
        <input
          name="title"
          placeholder="Track title"
          required
          className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
        />
        <input
          name="artist"
          placeholder="Artist (optional)"
          className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
        />
        <input type="file" name="file" accept="audio/*" required className="text-sm" />
        <button
          type="submit"
          disabled={uploading}
          className="bg-black text-white text-xs uppercase tracking-wide py-2 hover:opacity-80 self-start px-6 disabled:opacity-40"
        >
          {uploading ? "Uploading…" : "Add track"}
        </button>
      </form>

      <ul className="flex flex-col divide-y divide-black/10 border-t border-b border-black/10">
        {sorted.length === 0 && (
          <li className="py-3 text-sm opacity-60">
            No tracks yet. The timeline will play silently until you add
            some.
          </li>
        )}
        {sorted.map((track, index) => (
          <li key={track.id} className="flex items-center justify-between py-3 gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{track.title}</p>
              {track.artist && (
                <p className="text-xs opacity-60 truncate">{track.artist}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || isPending}
                className="px-1.5 border border-black/20 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === sorted.length - 1 || isPending}
                className="px-1.5 border border-black/20 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(track.id)}
                disabled={isPending}
                className="text-red-600 px-1.5"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
