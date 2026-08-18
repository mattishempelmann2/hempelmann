import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black px-4">
      <form
        action={loginAction}
        className="w-full max-w-xs flex flex-col gap-4"
      >
        <h1 className="text-lg font-bold uppercase tracking-tight">
          Admin
        </h1>
        <input type="hidden" name="next" value={next ?? "/admin"} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black"
        />
        {error && (
          <p className="text-xs text-red-600">Wrong password. Try again.</p>
        )}
        <button
          type="submit"
          className="bg-black text-white text-sm uppercase tracking-wide py-2 hover:opacity-80 transition-opacity"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
