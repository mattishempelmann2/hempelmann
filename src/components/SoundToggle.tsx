"use client";

import { useAudio } from "./AudioProvider";
import { playClick } from "@/lib/sfx";

export default function SoundToggle() {
  const {
    currentTrack,
    isPlaying,
    isMuted,
    soundEnabled,
    enableSound,
    togglePlay,
    toggleMute,
  } = useAudio();

  if (!soundEnabled || !currentTrack) {
    return (
      <button
        type="button"
        onClick={() => {
          enableSound();
          playClick();
        }}
        className="text-xs uppercase tracking-wide border border-black/20 px-3 py-1.5 hover:border-black transition-colors"
      >
        Sound off
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 border border-black/20 px-3 py-1.5 max-w-[220px] sm:max-w-xs">
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={() => {
          playClick();
          togglePlay();
        }}
        className="shrink-0 text-xs"
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>
      <div className="overflow-hidden whitespace-nowrap text-xs">
        <span className="inline-block">
          {currentTrack.title}
          {currentTrack.artist ? ` — ${currentTrack.artist}` : ""}
        </span>
      </div>
      <button
        type="button"
        aria-label={isMuted ? "Unmute" : "Mute"}
        onClick={() => {
          toggleMute();
        }}
        className="shrink-0 text-xs opacity-60 hover:opacity-100"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
