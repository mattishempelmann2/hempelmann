import Link from "next/link";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const authed = verifySessionToken(token);

  if (!authed) {
    // login page renders its own chrome
    return <div className="bg-white text-black min-h-screen">{children}</div>;
  }

  return (
    <div className="bg-white text-black min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/10 text-xs uppercase tracking-wide">
        <nav className="flex gap-4">
          <Link href="/admin" className="font-bold">
            Admin
          </Link>
          <Link href="/admin/tracks" className="opacity-60 hover:opacity-100">
            Music
          </Link>
          <Link href="/timeline" className="opacity-60 hover:opacity-100">
            View site ↗
          </Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="opacity-60 hover:opacity-100">
            Log out
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
