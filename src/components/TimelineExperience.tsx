"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { playTick, playMajorTick, playClick } from "@/lib/sfx";

export type TimelinePhoto = {
  id: string;
  url: string;
  caption: string | null;
  tripSlug: string;
  tripTitle: string;
  category: string;
  date: string;
};

const PX_PER_DAY = 9;
const CARD_WIDTH = 260;
const CARD_GAP = 24;
const EDGE_PADDING = 480;
const CARD_HEIGHTS = [240, 320, 220, 360];
const TICK_STEP_CAP = 8;

const DAY_TICK_BASE_HEIGHT = 6;
const DAY_TICK_MAX_HEIGHT = 40;
const DAY_TICK_BASE_OPACITY = 0.22;
const DAY_TICK_MAX_OPACITY = 1;
// Each day tick remembers the last real timestamp it was the one nearest
// the playhead. Whichever tick is nearest right now always reads at full
// height (its timestamp keeps refreshing to "now"); every tick that has
// fallen behind fades out as a function of real elapsed time since it lost
// that spot — a Gaussian falloff (bell curve), not a linear or exponential
// one, so it holds near its peak for a moment and then eases out smoothly
// rather than snapping or dropping off hardest right at the start. That
// keeps it symmetric with respect to scroll direction (whichever tick was
// nearest most recently is the one still fading, regardless of which way
// you were scrolling) and purely time-based (stop scrolling and the trail
// keeps fading on its own clock until only the current day is left tall).
const DAY_TICK_GAUSSIAN_SIGMA_MS = 420; // longer tail — was 280
// Power 2 is a plain Gaussian; higher holds nearer the peak a beat longer
// then drops off much more sharply — a steeper-walled bell curve rather
// than a gentle one, while keeping roughly the same overall footprint.
const DAY_TICK_GAUSSIAN_POWER = 4;
const DAY_TICK_CUTOFF_MS = DAY_TICK_GAUSSIAN_SIGMA_MS * 1.8;
// Hard cap on how many ticks are tracked as recently-active at once,
// independent of scroll speed. Combined with the rank falloff below, this
// bounds the trail to a handful of ticks that are already stepping down —
// never a flat "wall" of full-height ticks.
const DAY_TICK_MAX_SIMULTANEOUS = 8;
// The final height is timeFraction * rankFraction: how recently a tick was
// "current" within the trail (rank 0 = current, rank 1 = the one right
// before it, etc), not just how long ago in wall-clock time. Widened so
// rank 1 sits close to full height (a real sink, not an instant 80% cap) —
// at slow scroll speed there's only ever one transition happening at a
// time far enough apart that everything past rank 1 has already faded out
// via the time-based falloff regardless, so this mostly only matters once
// scrolling fast enough to have several ticks mid-fade simultaneously.
const DAY_TICK_RANK_SIGMA = 3.4;
// How fast a newly-current tick rises to its ceiling, instead of snapping
// there instantly — the other half of "sink and rise" being an actual
// smooth crossfade rather than a pop. This has to shrink as scroll speed
// increases: during normal scrolling, which tick is "nearest" changes far
// more often than a slow rise can complete, so a fixed slow rise means the
// current tick is almost always stuck partway up its own curve — never
// reliably tall, which both hides the wave (no solid peak to build around)
// and reads as a "dip" right before it. At low speed there's plenty of
// dwell time per tick, so the full slow rise is what's actually visible.
const DAY_TICK_RISE_SIGMA_MS = 260;
const DAY_TICK_RISE_SIGMA_MIN_MS = 40;
// Scroll speed effects: the faster you're scrolling, the lower the ceiling
// on every tick's height (including the current one) — a fast fling reads
// as a lower, calmer ripple rather than a bunch of full-height bars — and a
// single tick just ahead of the current one (in the direction of travel)
// builds up as speed increases, capped below the current tick's own height,
// giving the look of a wave building up ahead. Scales continuously with
// speed (not a flat on/off) so at a slow scroll there's effectively no
// wave at all — just the current tick sinking as the next rises.
const DAY_TICK_SPEED_FOR_MAX_EFFECT = 1600; // px/s at which speed effects fully saturate — was 3000, rarely reachable by normal scrolling
const DAY_TICK_PEAK_SPEED_DROP = 0.35; // at max effective speed, the ceiling drops by this fraction
const DAY_TICK_AHEAD_FACTOR = 0.5; // the "front" tick caps at this fraction of the (speed-scaled) peak, at full speed
const DAY_TICK_AHEAD_SIGMA_MS = 90;
const DAY_TICK_AHEAD_CUTOFF_MS = DAY_TICK_AHEAD_SIGMA_MS * 2.2;
const DAY_TICK_SPEED_SMOOTHING = 0.15; // EMA factor for smoothing instantaneous speed
// How far past the previous nearest tick's own position (in tick-index
// units) the playhead has to move before a new tick takes over as
// "nearest". 0.5 is the plain rounding boundary; anything above that adds
// a small dead zone so sub-pixel settling jitter can't flip it back and
// forth right at rest.
const DAY_TICK_HYSTERESIS = 0.6;

function heightFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_HEIGHTS[h % CARD_HEIGHTS.length];
}

export default function TimelineExperience({
  photos,
}: {
  photos: TimelinePhoto[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const monthLabelRef = useRef<HTMLDivElement>(null);
  const dayTickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playheadPixelRef = useRef(0);
  const tickPeakAtRef = useRef<Float32Array>(new Float32Array(0));
  const tickBecameNearestAtRef = useRef<Float32Array>(new Float32Array(0));
  const activeTickIndicesRef = useRef<Set<number>>(new Set());
  const tickHistoryRef = useRef<number[]>([]);
  const lastNearestTickRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<1 | -1>(1);
  const smoothedSpeedRef = useRef(0);
  const aheadIndexRef = useRef<number | null>(null);

  const layout = useMemo(() => {
    const dated = photos.map((p) => ({ ...p, dateObj: new Date(p.date) }));
    const minDate = dated.reduce(
      (min, p) => (p.dateObj < min ? p.dateObj : min),
      dated[0].dateObj
    );
    const maxDate = dated.reduce(
      (max, p) => (p.dateObj > max ? p.dateObj : max),
      dated[0].dateObj
    );
    const dayMs = 1000 * 60 * 60 * 24;

    const items = dated
      .map((p) => ({
        ...p,
        x:
          EDGE_PADDING +
          ((p.dateObj.getTime() - minDate.getTime()) / dayMs) * PX_PER_DAY,
        height: heightFor(p.id),
      }))
      .sort((a, b) => a.x - b.x);

    for (let i = 1; i < items.length; i++) {
      const min = items[i - 1].x + CARD_WIDTH + CARD_GAP;
      if (items[i].x < min) items[i].x = min;
    }

    const contentEnd =
      items.length > 0 ? items[items.length - 1].x + CARD_WIDTH : EDGE_PADDING;
    const trackWidth = contentEnd + EDGE_PADDING;

    const minorTicks: number[] = [];
    {
      const start = new Date(minDate);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 3);
      const end = new Date(maxDate);
      end.setDate(end.getDate() + 3);
      for (
        let d = new Date(start);
        d.getTime() <= end.getTime();
        d.setDate(d.getDate() + 1)
      ) {
        minorTicks.push(
          EDGE_PADDING + ((d.getTime() - minDate.getTime()) / dayMs) * PX_PER_DAY
        );
      }
    }

    const majorTicks: { x: number; label: string }[] = [];
    {
      const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);
      for (
        let d = new Date(start);
        d.getTime() < end.getTime();
        d.setMonth(d.getMonth() + 1)
      ) {
        majorTicks.push({
          x:
            EDGE_PADDING +
            ((d.getTime() - minDate.getTime()) / dayMs) * PX_PER_DAY,
          label: d.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        });
      }
    }

    const combinedTicks = [
      ...minorTicks.map((x) => ({ x, major: false, label: undefined as string | undefined })),
      ...majorTicks.map((t) => ({ x: t.x, major: true, label: t.label })),
    ].sort((a, b) => a.x - b.x);

    return { items, minorTicks, majorTicks, combinedTicks, trackWidth };
  }, [photos]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    const monthLabel = monthLabelRef.current;
    if (!wrapper || !track) return;

    const ctx = gsap.context(() => {
      const setup = () => {
        const viewportW = window.innerWidth;
        const centerOffset = viewportW / 2;
        const maxTranslate = Math.max(0, layout.trackWidth - viewportW);
        wrapper.style.height = `${maxTranslate + window.innerHeight}px`;
        playheadPixelRef.current = centerOffset;

        let cursor = 0;
        {
          const startPixel = centerOffset;
          while (
            cursor < layout.combinedTicks.length &&
            layout.combinedTicks[cursor].x <= startPixel
          ) {
            cursor++;
          }
        }

        const tween = gsap.to(track, {
          x: -maxTranslate,
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
              const playheadPixel = centerOffset + self.progress * maxTranslate;
              playheadPixelRef.current = playheadPixel;

              let steps = 0;
              while (
                cursor < layout.combinedTicks.length &&
                layout.combinedTicks[cursor].x <= playheadPixel &&
                steps < TICK_STEP_CAP
              ) {
                const t = layout.combinedTicks[cursor];
                if (t.major) playMajorTick();
                else playTick();
                cursor++;
                steps++;
              }
              while (
                cursor > 0 &&
                layout.combinedTicks[cursor - 1].x > playheadPixel &&
                steps < TICK_STEP_CAP
              ) {
                cursor--;
                const t = layout.combinedTicks[cursor];
                if (t.major) playMajorTick();
                else playTick();
                steps++;
              }

              if (monthLabel) {
                let current: string | undefined;
                for (const m of layout.majorTicks) {
                  if (m.x <= playheadPixel) current = m.label;
                  else break;
                }
                monthLabel.textContent = current ?? layout.majorTicks[0]?.label ?? "";
              }
            },
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      };

      let cleanup = setup();
      const onResize = () => {
        cleanup?.();
        ScrollTrigger.getAll().forEach((st) => st.kill());
        cleanup = setup();
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        cleanup?.();
      };
    }, wrapper);

    return () => ctx.revert();
  }, [layout]);

  // Continuously eases each day tick's height/opacity toward its target
  // (tall for whichever tick is currently nearest the playhead, normal for
  // every other tick) on a real clock, independent of scroll events — so the
  // trail keeps fading after you stop scrolling, and it's agnostic to which
  // direction you were scrolling in.
  useEffect(() => {
    const ticks = layout.minorTicks;
    tickPeakAtRef.current = new Float32Array(ticks.length);
    tickBecameNearestAtRef.current = new Float32Array(ticks.length);
    activeTickIndicesRef.current = new Set();
    tickHistoryRef.current = [];
    lastNearestTickRef.current = null;
    lastDirectionRef.current = 1;
    smoothedSpeedRef.current = 0;
    aheadIndexRef.current = null;

    let rafId: number;
    let lastFrameTime = performance.now();
    let lastPlayheadPixel = playheadPixelRef.current;

    const resetTick = (i: number) => {
      const el = dayTickRefs.current[i];
      if (el) {
        el.style.height = `${DAY_TICK_BASE_HEIGHT}px`;
        el.style.opacity = String(DAY_TICK_BASE_OPACITY);
      }
    };

    const frame = () => {
      if (ticks.length > 0) {
        const now = performance.now();

        const dt = now - lastFrameTime;
        const dx = playheadPixelRef.current - lastPlayheadPixel;
        const instantSpeed = dt > 0 ? Math.abs(dx) / (dt / 1000) : 0;
        smoothedSpeedRef.current +=
          (instantSpeed - smoothedSpeedRef.current) * DAY_TICK_SPEED_SMOOTHING;
        lastFrameTime = now;
        lastPlayheadPixel = playheadPixelRef.current;

        const speedFactor = Math.min(
          1,
          smoothedSpeedRef.current / DAY_TICK_SPEED_FOR_MAX_EFFECT
        );
        const peakScale = 1 - speedFactor * DAY_TICK_PEAK_SPEED_DROP;

        // Hysteresis: don't just round to the nearest tick every frame.
        // Right as a scroll gesture settles (trackpad momentum decaying to
        // a stop), the position can jitter by a sub-pixel amount, and if
        // that jitter straddles a rounding boundary it flips `nearest`
        // back and forth every frame forever — which keeps re-triggering
        // the transition below and resets the rise timer to 0 every time,
        // so the current tick never actually finishes rising (looks like
        // it dies back to zero, then "pops" whenever it briefly wins a
        // frame). Requiring a real move past the previous tick's position
        // — not just past the halfway point — before switching kills that.
        const rawIndex = (playheadPixelRef.current - ticks[0]) / PX_PER_DAY;
        const previousNearest = lastNearestTickRef.current;
        const candidateIndex =
          previousNearest !== null &&
          Math.abs(rawIndex - previousNearest) < DAY_TICK_HYSTERESIS
            ? previousNearest
            : Math.round(rawIndex);
        const nearest = Math.min(ticks.length - 1, Math.max(0, candidateIndex));

        const peakAt = tickPeakAtRef.current;
        const becameNearestAt = tickBecameNearestAtRef.current;
        const active = activeTickIndicesRef.current;
        const history = tickHistoryRef.current;

        const lastNearest = lastNearestTickRef.current;
        if (lastNearest !== nearest) {
          if (lastNearest !== null) {
            lastDirectionRef.current = nearest >= lastNearest ? 1 : -1;
          }
          // Backfill every tick actually crossed since the last frame (not
          // just the endpoint) so a fast fling smears continuously through
          // the trail instead of frame-sampling sparse, jumpy steps. Only
          // the tail closest to `nearest` matters — anything further back
          // than the cap would just get evicted immediately anyway.
          const gap =
            lastNearest === null ? 1 : Math.abs(nearest - lastNearest);
          const step = lastNearest === null || nearest >= lastNearest ? 1 : -1;
          const backfillCount = Math.min(gap, DAY_TICK_MAX_SIMULTANEOUS);

          for (let k = backfillCount - 1; k >= 0; k--) {
            const idx = nearest - step * k;
            const dupeIndex = history.indexOf(idx);
            if (dupeIndex !== -1) history.splice(dupeIndex, 1);
            history.push(idx);
            active.add(idx);
            peakAt[idx] = now;
          }

          while (history.length > DAY_TICK_MAX_SIMULTANEOUS) {
            const evicted = history.shift();
            if (evicted !== undefined) {
              active.delete(evicted);
              resetTick(evicted);
            }
          }

          lastNearestTickRef.current = nearest;

          // Continuity: if this tick was the ahead-bump a moment ago, it
          // was already partway elevated — don't reset its rise to zero
          // (that reads as a dip: elevated, then suddenly low, then back
          // up) — seed the rise curve so it picks up from where the
          // ahead-bump already had it and keeps climbing from there.
          const priorFraction =
            aheadIndexRef.current === nearest
              ? DAY_TICK_AHEAD_FACTOR * speedFactor
              : 0;
          if (priorFraction > 0.001) {
            const riseSigma =
              DAY_TICK_RISE_SIGMA_MS -
              speedFactor * (DAY_TICK_RISE_SIGMA_MS - DAY_TICK_RISE_SIGMA_MIN_MS);
            const virtualElapsed =
              riseSigma *
              Math.pow(-Math.log(1 - Math.min(0.999, priorFraction)), 1 / DAY_TICK_GAUSSIAN_POWER);
            becameNearestAt[nearest] = now - virtualElapsed;
          } else {
            becameNearestAt[nearest] = now; // marks the start of its rise, set once per transition
          }
        }

        active.add(nearest);
        peakAt[nearest] = now; // keeps refreshing while it stays the nearest tick

        // The single tick just ahead of current, in the direction of travel,
        // builds up while actively moving (own short-lived timestamp, not
        // part of the recency-ranked trail behind) and fades out fast the
        // moment it's no longer being refreshed — no lingering memory ahead
        // of you, unlike the trail behind.
        if (speedFactor > 0.02) {
          const ahead = Math.min(
            ticks.length - 1,
            Math.max(0, nearest + lastDirectionRef.current)
          );
          if (ahead !== nearest) {
            active.add(ahead);
            peakAt[ahead] = now;
            aheadIndexRef.current = ahead;
          }
        }

        // rank 0 = current, rank 1 = the one right before it in the trail, etc.
        const rankByIndex = new Map<number, number>();
        for (let r = 0; r < history.length; r++) {
          rankByIndex.set(history[history.length - 1 - r], r);
        }

        for (const i of active) {
          const isAhead = i !== nearest && i === aheadIndexRef.current;
          const elapsed = now - peakAt[i];
          const cutoff = isAhead ? DAY_TICK_AHEAD_CUTOFF_MS : DAY_TICK_CUTOFF_MS;
          const el = dayTickRefs.current[i];

          if (i !== nearest && elapsed > cutoff) {
            active.delete(i);
            const historyIndex = history.indexOf(i);
            if (historyIndex !== -1) history.splice(historyIndex, 1);
            if (aheadIndexRef.current === i) aheadIndexRef.current = null;
            resetTick(i);
            continue;
          }

          if (el) {
            let fraction: number;
            if (i === nearest) {
              // eases up to its ceiling instead of snapping there instantly —
              // the "rise" half of sink-and-rise. Rise speed itself scales
              // with scroll speed (slow rise only when scrolling is slow
              // enough to actually see it; near-instant once scrolling fast
              // enough that "nearest" is changing faster than a slow rise
              // could ever complete).
              const riseSigma =
                DAY_TICK_RISE_SIGMA_MS -
                speedFactor * (DAY_TICK_RISE_SIGMA_MS - DAY_TICK_RISE_SIGMA_MIN_MS);
              const riseElapsed = now - becameNearestAt[i];
              const riseFraction =
                1 - Math.exp(-Math.pow(riseElapsed / riseSigma, DAY_TICK_GAUSSIAN_POWER));
              fraction = riseFraction * peakScale;
            } else {
              let ceilingFraction: number;
              if (isAhead) {
                // scales continuously with speed — at a slow scroll this is
                // ~0, so there's no forward wave, just the sink-and-rise.
                ceilingFraction = DAY_TICK_AHEAD_FACTOR * speedFactor;
              } else {
                const rank = rankByIndex.get(i) ?? 0;
                ceilingFraction = Math.exp(-Math.pow(rank / DAY_TICK_RANK_SIGMA, 2));
              }
              const sigma = isAhead ? DAY_TICK_AHEAD_SIGMA_MS : DAY_TICK_GAUSSIAN_SIGMA_MS;
              const timeFraction = Math.exp(
                -Math.pow(elapsed / sigma, DAY_TICK_GAUSSIAN_POWER)
              );
              fraction = timeFraction * ceilingFraction * peakScale;
            }
            const height =
              DAY_TICK_BASE_HEIGHT + fraction * (DAY_TICK_MAX_HEIGHT - DAY_TICK_BASE_HEIGHT);
            const opacity =
              DAY_TICK_BASE_OPACITY + fraction * (DAY_TICK_MAX_OPACITY - DAY_TICK_BASE_OPACITY);
            el.style.height = `${height}px`;
            el.style.opacity = String(opacity);
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [layout]);

  return (
    <div className="relative bg-white">
      <div ref={wrapperRef} className="relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div className="absolute top-20 inset-x-0 text-center px-6 pointer-events-none z-20">
            <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight">
              HEMPELMANN
            </h1>
          </div>

          <div
            ref={monthLabelRef}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs uppercase tracking-wide opacity-70 z-20 pointer-events-none whitespace-nowrap"
          />

          <div className="h-full flex items-center overflow-visible">
            <div
              ref={trackRef}
              className="relative h-[480px] will-change-transform"
              style={{ width: layout.trackWidth }}
            >
              {layout.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/trips/${item.tripSlug}`}
                  onClick={playClick}
                  className="group absolute block overflow-hidden bg-black/5 hover:z-30 transition-transform duration-300 hover:-translate-y-1"
                  style={{
                    left: item.x,
                    bottom: 64,
                    width: CARD_WIDTH,
                    height: item.height,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.caption ?? item.tripTitle}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[11px] uppercase tracking-wide truncate">
                      {item.tripTitle}
                    </p>
                  </div>
                </Link>
              ))}

              <div className="absolute left-0 right-0 bottom-0 h-14 border-t border-black/10">
                {layout.minorTicks.map((x, i) => (
                  <div
                    key={`m-${i}`}
                    ref={(el) => {
                      dayTickRefs.current[i] = el;
                    }}
                    className="absolute bottom-0 w-[2px] bg-black"
                    style={{
                      left: x,
                      height: DAY_TICK_BASE_HEIGHT,
                      opacity: DAY_TICK_BASE_OPACITY,
                    }}
                  />
                ))}
                {layout.majorTicks.map((t, i) => (
                  <div
                    key={`M-${i}`}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ left: t.x }}
                  >
                    <div className="w-px h-4 bg-black/80" />
                    <span className="mt-1 text-[10px] uppercase tracking-wide whitespace-nowrap opacity-70">
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-6 text-[10px] uppercase tracking-wide opacity-40 pointer-events-none">
            Scroll
          </div>
        </div>
      </div>
    </div>
  );
}
