"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { siteOwner } from "@/lib/site-owner";

const emptySubscribe = () => () => {};

type SiteFooterProps = Readonly<{
  initialYear: number;
}>;

export function SiteFooter({ initialYear }: SiteFooterProps) {
  const currentYear = useSyncExternalStore(
    emptySubscribe,
    () => new Date().getFullYear(),
    () => initialYear,
  );

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 text-sm text-slate-600 sm:px-10">
        <p>Building recruiter-ready software experiences.</p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="underline decoration-slate-300 underline-offset-4 hover:decoration-sky-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Privacy
          </Link>
          <p>
            &copy; <time dateTime={String(currentYear)}>{currentYear}</time>{` ${siteOwner.name}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
