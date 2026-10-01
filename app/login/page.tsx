import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Owner login | Career Platform",
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

type LoginPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function getOwnerEmail() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) {
    throw new Error("Missing required OWNER_EMAIL environment variable.");
  }

  return ownerEmail;
}

function getSearchParamValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(params: SearchParams) {
  if (getSearchParamValue(params.sent) === "1") {
    return {
      tone: "success" as const,
      text: "Check your inbox for the sign-in link.",
    };
  }

  const error = getSearchParamValue(params.error);

  switch (error) {
    case "unauthorized":
      return {
        tone: "error" as const,
        text: "Only the configured owner email can request a sign-in link.",
      };
    case "send_failed":
      return {
        tone: "error" as const,
        text: "The sign-in link could not be sent. Please try again.",
      };
    case "callback":
      return {
        tone: "error" as const,
        text: "The sign-in link was invalid or expired. Request a new link.",
      };
    default:
      return null;
  }
}

async function requestMagicLink(formData: FormData) {
  "use server";

  const submittedEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const ownerEmail = getOwnerEmail();

  if (submittedEmail !== ownerEmail) {
    redirect("/login?error=unauthorized");
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: submittedEmail,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/admin`,
    },
  });

  if (error) {
    redirect("/login?error=send_failed");
  }

  redirect("/login?sent=1");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams
    ? await searchParams
    : ({} as SearchParams);
  const statusMessage = getStatusMessage(resolvedSearchParams);

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Private access
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Owner sign in
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Request a passwordless magic link for the owner dashboard.
          </p>
        </div>

        {statusMessage ? (
          <p
            className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
              statusMessage.tone === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
            role="status"
          >
            {statusMessage.text}
          </p>
        ) : null}

        <form action={requestMagicLink} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label
              className="block text-sm font-medium text-slate-900"
              htmlFor="email"
            >
              Owner email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200"
              placeholder="owner@example.com"
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Email me a sign-in link
          </button>
        </form>
      </div>
    </section>
  );
}
