# HEMPELMANN

A personal photo timeline, inspired by [tlb.betteroff.studio](https://tlb.betteroff.studio/):
trips/events grouped by date, a horizontal scroll-jacked timeline with a tick
ruler and scrub sound effects, background music, and a password-protected
admin panel to manage everything.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- GSAP + ScrollTrigger for the horizontal timeline scroll
- Howler.js for background music, Web Audio API for synthesized UI/tick sounds
- Vercel Blob for photo/audio file storage
- Cookie-based admin auth (single password, no user accounts)

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database.** No Docker required — Prisma can run a local Postgres for you:

   ```bash
   npx prisma dev
   ```

   Leave that running in a terminal. It prints a `DATABASE_URL` — this repo's
   `.env` is already pointed at it. (This is a throwaway local dev database;
   for anything you want to keep, use a real hosted Postgres — see Deploy
   below.)

3. **Env vars.** Edit `.env`:
   - `ADMIN_PASSWORD` — the password for `/admin`. Change it from `change-me`.
   - `ADMIN_SESSION_SECRET` — any long random string.
   - `BLOB_READ_WRITE_TOKEN` — needed to upload photos/music. Get one free:
     create a Vercel project, open its **Storage** tab, create a **Blob**
     store, copy the `BLOB_READ_WRITE_TOKEN` it gives you. Works for local
     dev too, no deploy required.

4. **Migrate + seed**

   ```bash
   npx prisma migrate dev
   npx prisma db seed   # adds a few placeholder trips so the timeline isn't empty
   ```

5. **Run it**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, and `http://localhost:3000/admin` to log in
   and manage trips.

## Using it

- **Add a trip**: `/admin` → *New trip* → set title, category, date (this
  date drives its position on the timeline), optional description.
- **Add photos**: open the trip in `/admin`, upload images. Each photo has an
  **"on timeline"** checkbox — only checked photos appear in the scrolling
  timeline; *all* photos always show on that trip's own gallery page
  (`/trips/<slug>`).
- **Reorder / cover photo**: ↑↓ reorder photos within a trip, ★ sets the
  cover shown on the `/trips` index.
- **Music**: `/admin/tracks` — upload mp3/etc, they play in order as
  background music on the timeline. No tracks = silent timeline, no error.
- **Delete the seed data** once you've added real trips: just delete each
  seeded trip from `/admin` (Iceland Road Trip, Spring in Kyoto, etc).

## How the timeline works

`src/components/TimelineExperience.tsx` places every timeline-flagged photo
along a real date axis (pixels-per-day), so gaps and clusters reflect actual
time between trips. Mouse-wheel/trackpad scroll drives a GSAP ScrollTrigger
tween that translates the whole track horizontally; a fixed vertical line
marks the "playhead" in the center of the screen. As ruler ticks (weekly
minor, monthly major) cross the playhead, a short synthesized click plays
(`src/lib/sfx.ts`, plain Web Audio oscillators — no audio files needed) and
the month/year label updates.

## Deploying to Vercel

1. Push this repo to GitHub (or run `vercel` directly from this folder).
2. Import the repo in Vercel.
3. In the Vercel project: **Storage** → create a **Postgres** database
   (this replaces your local `npx prisma dev` database) and a **Blob** store.
   Vercel auto-injects `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` for you.
4. Add `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` as env vars in the Vercel
   project settings.
5. Deploy. Then run migrations against the production database once:

   ```bash
   DATABASE_URL="<paste production DATABASE_URL>" npx prisma migrate deploy
   ```

## Project structure

```
prisma/schema.prisma        Trip, Photo, Track models
src/app/admin/...           password-gated CMS (trips, photos, music)
src/app/(public pages)      /, /timeline, /trips, /trips/[slug], /about
src/components/             TimelineExperience, AudioProvider, admin widgets
src/lib/                    prisma client, blob upload, auth, sfx synth
```
