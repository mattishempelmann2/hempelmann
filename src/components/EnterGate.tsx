"use client";

import { useRouter } from "next/navigation";
import { useAudio } from "./AudioProvider";

export default function EnterGate() {
  const router = useRouter();
  const { enableSound, disableSound, tracks } = useAudio();

  function enter(withSound: boolean) {
    if (withSound && tracks.length > 0) enableSound();
    else disableSound();
    router.push("/timeline");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => enter(true)}
        className="flex items-center gap-2 border border-black px-5 py-3 text-sm hover:bg-black hover:text-white transition-colors"
      >
        Enter with sound <span aria-hidden>→</span>
      </button>
      <button
        type="button"
        onClick={() => enter(false)}
        className="text-xs uppercase tracking-wide opacity-50 hover:opacity-100 transition-opacity"
      >
        …or without
      </button>
    </div>
  );
}
