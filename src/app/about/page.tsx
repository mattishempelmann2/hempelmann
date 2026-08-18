export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 max-w-xl mx-auto flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold uppercase tracking-tight">
        About
      </h1>
      <p className="text-sm opacity-70 leading-relaxed">
        This is a running photo timeline — a personal lookback through trips,
        people, and moments, sorted by date. Edit this text in{" "}
        <code className="text-xs bg-black/5 px-1 py-0.5">
          src/app/about/page.tsx
        </code>{" "}
        to make it yours.
      </p>
    </div>
  );
}
