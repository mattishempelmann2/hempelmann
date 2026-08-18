"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/blob";
import { checkPassword, createSessionToken, verifySessionToken, COOKIE_NAME } from "@/lib/auth";

async function requireAdmin() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    throw new Error("Unauthorized");
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ---- auth ----

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!checkPassword(password)) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = createSessionToken();
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next || "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(COOKIE_NAME);
  redirect("/admin/login");
}

// ---- trips ----

export async function createTrip(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();

  if (!title || !category || !dateStr) {
    throw new Error("Title, category, and date are required");
  }

  if (!slug) slug = slugify(title);
  else slug = slugify(slug);

  const trip = await prisma.trip.create({
    data: {
      title,
      slug,
      category,
      date: new Date(dateStr),
      endDate: endDateStr ? new Date(endDateStr) : null,
      description: description || null,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/trips/${trip.id}`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      title,
      category,
      date: new Date(dateStr),
      endDate: endDateStr ? new Date(endDateStr) : null,
      description: description || null,
      slug: slugify(slugRaw || title),
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath("/timeline");
  revalidatePath("/trips");
}

export async function deleteTrip(tripId: string) {
  await requireAdmin();

  const photos = await prisma.photo.findMany({ where: { tripId } });
  await Promise.all(photos.map((p) => deleteFile(p.url)));
  await prisma.trip.delete({ where: { id: tripId } });

  revalidatePath("/admin");
  revalidatePath("/timeline");
  revalidatePath("/trips");
  redirect("/admin");
}

export async function setCoverPhoto(tripId: string, photoId: string) {
  await requireAdmin();
  await prisma.trip.update({ where: { id: tripId }, data: { coverPhotoId: photoId } });
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath("/trips");
}

// ---- photos ----

export async function uploadPhotos(tripId: string, formData: FormData) {
  await requireAdmin();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const maxOrder = await prisma.photo.aggregate({
    where: { tripId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  for (const file of files) {
    const url = await uploadFile(file, `trips/${tripId}`);
    await prisma.photo.create({
      data: { tripId, url, order: nextOrder },
    });
    nextOrder += 1;
  }

  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath("/timeline");
  revalidatePath("/trips");
}

export async function updatePhoto(
  photoId: string,
  data: { caption?: string; showOnTimeline?: boolean }
) {
  await requireAdmin();
  await prisma.photo.update({
    where: { id: photoId },
    data,
  });
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (photo) revalidatePath(`/admin/trips/${photo.tripId}`);
  revalidatePath("/timeline");
}

export async function deletePhoto(photoId: string) {
  await requireAdmin();
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return;
  await deleteFile(photo.url);
  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/admin/trips/${photo.tripId}`);
  revalidatePath("/timeline");
  revalidatePath("/trips");
}

export async function reorderPhotos(tripId: string, orderedIds: string[]) {
  await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.photo.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath("/timeline");
}

// ---- tracks ----

export async function createTrack(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const file = formData.get("file");

  if (!title || !(file instanceof File) || file.size === 0) {
    throw new Error("Title and audio file are required");
  }

  const url = await uploadFile(file, "tracks");
  const maxOrder = await prisma.track.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? -1) + 1;

  await prisma.track.create({
    data: { title, artist: artist || null, url, order },
  });

  revalidatePath("/admin/tracks");
  revalidatePath("/timeline");
}

export async function deleteTrack(trackId: string) {
  await requireAdmin();
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) return;
  await deleteFile(track.url);
  await prisma.track.delete({ where: { id: trackId } });
  revalidatePath("/admin/tracks");
  revalidatePath("/timeline");
}

export async function reorderTracks(orderedIds: string[]) {
  await requireAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.track.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath("/admin/tracks");
  revalidatePath("/timeline");
}
