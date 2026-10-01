import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { OwnerAuthorizationError, requireOwner } from "@/lib/auth/owner";

export const metadata: Metadata = {
  title: "Admin | Career Platform",
  robots: {
    index: false,
    follow: false,
  },
};

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const result = await requireOwner()
    .then((owner) => ({ owner, error: null }))
    .catch((error: unknown) => ({ owner: null, error }));

  if (result.error) {
    if (result.error instanceof OwnerAuthorizationError) {
      return (
        <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16 text-center sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
            403
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Access denied
          </h1>
          <p className="text-base leading-7 text-slate-600">
            This dashboard is restricted to the configured owner account.
          </p>
        </section>
      );
    }

    throw result.error;
  }

  if (!result.owner) {
    throw new Error("Owner authentication unexpectedly resolved without a user.");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Owner dashboard
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Career Platform admin
          </h1>
          <p className="text-sm text-slate-600">{result.owner.email}</p>
        </div>
        <AdminNav />
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
