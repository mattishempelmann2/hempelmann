"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  reorderPhotos,
  setCoverPhoto,
} from "@/app/admin/actions";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  order: number;
  showOnTimeline: boolean;
};

export default function PhotoManager({
  tripId,
  photos,
  coverPhotoId,
}: {
  tripId: string;
  photos: Photo[];
  coverPhotoId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const sorted = [...photos].sort((a, b) => a.order - b.order);

  function refresh() {
    router.refresh();
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    try {
      await uploadPhotos(tripId, formData);
      refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleTimeline(photo: Photo) {
    startTransition(async () => {
      await updatePhoto(photo.id, { showOnTimeline: !photo.showOnTimeline });
      refresh();
    });
  }

  function saveCaption(photo: Photo, caption: string) {
    if (caption === (photo.caption ?? "")) return;
    startTransition(async () => {
      await updatePhoto(photo.id, { caption });
      refresh();
    });
  }

  function remove(photo: Photo) {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    startTransition(async () => {
      await deletePhoto(photo.id);
      refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      await reorderPhotos(
        tripId,
        next.map((p) => p.id)
      );
      refresh();
    });
  }

  function makeCover(photo: Photo) {
    startTransition(async () => {
      await setCoverPhoto(tripId, photo.id);
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="text-sm"
        />
        {(uploading || isPending) && (
          <span className="text-xs opacity-60">Saving…</span>
        )}
      </div>

      <p className="text-xs opacity-60">
        Check &quot;on timeline&quot; for the photos from this trip you want
        to appear in the scrolling timeline. All photos always show on the
        trip&apos;s own gallery page.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sorted.map((photo, index) => (
          <div
            key={photo.id}
            className="flex flex-col gap-2 border border-black/10 p-2"
          >
            <div className="relative aspect-square bg-black/5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? ""}
                className="w-full h-full object-cover"
              />
              {coverPhotoId === photo.id && (
                <span className="absolute top-1 left-1 bg-black text-white text-[10px] uppercase px-1.5 py-0.5">
                  Cover
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="Caption"
              defaultValue={photo.caption ?? ""}
              onBlur={(e) => saveCaption(photo, e.target.value)}
              className="border border-black/10 px-2 py-1 text-xs outline-none focus:border-black"
            />

            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={photo.showOnTimeline}
                onChange={() => toggleTimeline(photo)}
              />
              On timeline
            </label>

            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="px-1.5 border border-black/20 disabled:opacity-30"
                  aria-label="Move earlier"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === sorted.length - 1}
                  className="px-1.5 border border-black/20 disabled:opacity-30"
                  aria-label="Move later"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => makeCover(photo)}
                  className="px-1.5 border border-black/20"
                >
                  ★
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(photo)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
