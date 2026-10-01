import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Page not found
      </h1>
      <p className="max-w-xl text-base leading-7 text-slate-700">
        The page you requested is unavailable. Return to the homepage to
        continue exploring the platform.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-white"
      >
        Back to home
      </Link>
    </section>
  );
}
