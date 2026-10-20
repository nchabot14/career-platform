"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { reopenConsent, saveConsent, shouldAskForConsent, subscribeToConsent } from "@/lib/consent";

const buttonClass =
  "rounded-full border border-slate-950 px-5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

// The server can't see the stored choice, so it renders nothing and the
// banner appears after hydration only for visitors who haven't chosen yet.
export function ConsentBanner() {
  const ask = useSyncExternalStore(subscribeToConsent, shouldAskForConsent, () => false);

  if (!ask) return null;

  return (
    <section
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-lg"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p className="max-w-2xl text-sm leading-6 text-slate-700">
          May this site use Google Analytics cookies to count visits and see which links people
          follow? No analytics cookies are set unless you accept. Details are on the{" "}
          <Link href="/privacy" className="text-sky-700 underline underline-offset-4">
            privacy page
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => saveConsent("denied")}
            className={`${buttonClass} bg-white text-slate-950 hover:bg-slate-100`}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => saveConsent("granted")}
            className={`${buttonClass} bg-slate-950 text-white hover:bg-slate-800`}
          >
            Accept
          </button>
        </div>
      </div>
    </section>
  );
}

export function ReopenConsentButton() {
  return (
    <button
      type="button"
      onClick={reopenConsent}
      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      Change your cookie choice
    </button>
  );
}
