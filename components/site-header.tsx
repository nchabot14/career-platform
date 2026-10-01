import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-950">
          Career Platform
        </Link>
        <nav aria-label="Primary" className="text-sm text-slate-600">
          <ul className="flex items-center gap-6">
            <li>
              <Link href="/" className="transition hover:text-slate-950">
                Home
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
