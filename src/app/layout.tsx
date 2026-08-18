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
  const tracks = await prisma.track.findMany({ orderBy: { order: "asc" } });

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
