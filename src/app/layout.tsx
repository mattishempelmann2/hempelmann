import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { AudioProvider } from "@/components/AudioProvider";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "HEMPELMANN",
  description: "A personal photo timeline.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Falls back to an empty playlist instead of taking the whole site down —
  // this query runs on every page (including static ones like /about), so a
  // transient DB hiccup at build/prerender time shouldn't be fatal.
  const tracks = await prisma.track
    .findMany({ orderBy: { order: "asc" } })
    .catch(() => []);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black">
        <AudioProvider tracks={tracks}>
          <NavBar />
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
