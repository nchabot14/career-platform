import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-6 py-16 sm:px-10">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Software engineer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Building reliable product experiences for teams that move quickly.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          I design and deliver full-stack systems with a focus on clear user
          journeys, maintainable architecture, and measurable business impact.
        </p>
      </div>

      <div>
        <Link
          href="/resume"
          className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          View resume
        </Link>
      </div>
    </section>
  );
}
