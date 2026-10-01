"use client";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
        Application error
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Something went wrong
      </h1>
      <p className="max-w-xl text-base leading-7 text-slate-700">
        {error.message || "Unexpected error while rendering this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Try again
      </button>
    </section>
  );
}
