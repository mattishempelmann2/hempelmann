export default function BlobWarning() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return null;

  return (
    <p className="text-xs bg-yellow-50 border border-yellow-300 text-yellow-800 px-3 py-2">
      Uploads are disabled: <code>BLOB_READ_WRITE_TOKEN</code> is not set in{" "}
      <code>.env</code>. Get one free from your Vercel project&apos;s Storage
      tab (create a Blob store) and add it, then restart the dev server.
    </p>
  );
}
