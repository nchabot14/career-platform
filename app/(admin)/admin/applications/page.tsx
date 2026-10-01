import Link from "next/link";
import { statusLabels, statusOptions } from "@/components/admin/application-form";
import { listApplications } from "@/lib/db/repositories/job-applications";
import { applicationStatuses, type ApplicationStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type ApplicationsPageProps = Readonly<{
  searchParams: Promise<{ status?: string; followUpBy?: string }>;
}>;

const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "—");

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const params = await searchParams;
  const status = applicationStatuses.includes(params.status as ApplicationStatus)
    ? (params.status as ApplicationStatus)
    : undefined;
  const followUpBy = /^\d{4}-\d{2}-\d{2}$/.test(params.followUpBy ?? "")
    ? new Date(`${params.followUpBy}T00:00:00Z`)
    : undefined;
  const applications = await listApplications({ status, followUpBy });

  return (
    <section aria-labelledby="applications-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="applications-heading" className="text-2xl font-semibold text-slate-950">
          Job applications
        </h2>
        <Link href="/admin/applications/new" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Add application
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="filter-status" className="block text-sm font-semibold">Status</label>
          <select id="filter-status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Any</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-follow-up" className="block text-sm font-semibold">Follow-up on or before</label>
          <input id="filter-follow-up" name="followUpBy" type="date" defaultValue={params.followUpBy ?? ""} className="mt-1 rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <button type="submit" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">Filter</button>
        {status || followUpBy ? <Link href="/admin/applications" className="text-sm text-sky-700 underline">Clear</Link> : null}
      </form>

      {applications.length === 0 ? (
        <p className="text-slate-600">No applications match.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Job applications</caption>
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Company</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Applied</th>
                <th scope="col" className="px-4 py-3">Next follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((application) => (
                <tr key={application.id}>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    <Link href={`/admin/applications/${application.id}`} className="text-sky-700 underline-offset-4 hover:underline">
                      {application.company}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{application.role}</td>
                  <td className="px-4 py-3">{statusLabels[application.status]}</td>
                  <td className="px-4 py-3">{day(application.appliedAt)}</td>
                  <td className="px-4 py-3">{day(application.nextFollowUpAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
