"use client";

import { useTransition } from "react";
import { deleteTrip } from "@/app/admin/actions";

export default function DeleteTripButton({ tripId }: { tripId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this trip and all its photos? This can't be undone.")) return;
        startTransition(() => deleteTrip(tripId));
      }}
      className="text-red-600 text-xs uppercase tracking-wide disabled:opacity-40"
    >
      {isPending ? "Deleting…" : "Delete trip"}
    </button>
  );
}
