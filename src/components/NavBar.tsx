"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { playClick } from "@/lib/sfx";
import SoundToggle from "./SoundToggle";

const links = [
  { href: "/timeline", label: "Timeline" },
  { href: "/trips", label: "Index" },
  { href: "/about", label: "About" },
];

export default function NavBar() {
  const pathname = usePathname();

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
      <nav className="flex gap-4 text-xs uppercase tracking-wide pointer-events-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={playClick}
            className={
              pathname === link.href
                ? "font-bold"
                : "opacity-50 hover:opacity-100 transition-opacity"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="pointer-events-auto">
        <SoundToggle />
      </div>
    </header>
  );
}
