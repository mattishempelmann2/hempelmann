"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Howl } from "howler";
import { setSfxMuted, unlockSfx } from "@/lib/sfx";

type Track = {
  id: string;
  title: string;
  artist: string | null;
  url: string;
};

type AudioContextValue = {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  isMuted: boolean;
  soundEnabled: boolean;
  enableSound: () => void;
  disableSound: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  next: () => void;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioProvider({
  tracks,
  children,
}: {
  tracks: Track[];
  children: React.ReactNode;
}) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [index, setIndex] = useState(0);
  const howlRef = useRef<Howl | null>(null);

  const currentTrack = tracks[index] ?? null;

  const playCurrent = useCallback(() => {
    if (!currentTrack) return;
    howlRef.current?.unload();
    const howl = new Howl({
      src: [currentTrack.url],
      html5: true,
      volume: 0.55,
      onend: () => setIndex((i) => (i + 1) % Math.max(tracks.length, 1)),
    });
    howlRef.current = howl;
    howl.mute(isMuted);
    howl.play();
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, tracks.length]);

  useEffect(() => {
    // Synchronizes the Howler player (external system) with our React state;
    // the resulting setIsPlaying inside playCurrent reflects that external state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (soundEnabled && tracks.length > 0) playCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, soundEnabled]);

  useEffect(() => {
    return () => {
      howlRef.current?.unload();
    };
  }, []);

  const enableSound = useCallback(() => {
    unlockSfx();
    setSfxMuted(false);
    setSoundEnabled(true);
    setIsMuted(false);
  }, []);

  const disableSound = useCallback(() => {
    setSfxMuted(true);
    setSoundEnabled(false);
    howlRef.current?.unload();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!howlRef.current) {
      if (tracks.length > 0) {
        setSoundEnabled(true);
      }
      return;
    }
    if (howlRef.current.playing()) {
      howlRef.current.pause();
      setIsPlaying(false);
    } else {
      howlRef.current.play();
      setIsPlaying(true);
    }
  }, [tracks.length]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      howlRef.current?.mute(next);
      setSfxMuted(next);
      return next;
    });
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(tracks.length, 1));
  }, [tracks.length]);

  return (
    <Ctx.Provider
      value={{
        tracks,
        currentTrack,
        isPlaying,
        isMuted,
        soundEnabled,
        enableSound,
        disableSound,
        togglePlay,
        toggleMute,
        next,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
