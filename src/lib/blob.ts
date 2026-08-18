import { put, del } from "@vercel/blob";

export async function uploadFile(file: File, folder: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function deleteFile(url: string) {
  try {
    await del(url);
  } catch {
    // best-effort; ignore if already gone or blob not configured
  }
}
