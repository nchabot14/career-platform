import { siteOwner } from "@/lib/site-owner";

const detailLinkClass =
  "text-lg font-medium text-slate-950 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-sky-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

export function ContactDetails() {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-1">
        <dt className="text-sm font-semibold text-slate-600">Email</dt>
        <dd>
          <a href={`mailto:${siteOwner.email}`} className={detailLinkClass}>
            {siteOwner.email}
          </a>
        </dd>
      </div>
      <div className="space-y-1">
        <dt className="text-sm font-semibold text-slate-600">Phone</dt>
        <dd>
          <a href={siteOwner.phone.href} className={detailLinkClass}>
            {siteOwner.phone.display}
          </a>
        </dd>
      </div>
    </dl>
  );
}
