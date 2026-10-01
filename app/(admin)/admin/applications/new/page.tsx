import Link from "next/link";
import { createApplicationAction } from "@/app/(admin)/admin/actions";
import { applicationFields } from "@/components/admin/application-form";
import { EntityForm } from "@/components/admin/entity-form";

export default function NewApplicationPage() {
  return (
    <section aria-labelledby="new-application-heading" className="max-w-2xl space-y-5">
      <Link href="/admin/applications" className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline">
        ← All applications
      </Link>
      <h2 id="new-application-heading" className="text-2xl font-semibold text-slate-950">
        Add application
      </h2>
      <EntityForm action={createApplicationAction} fields={applicationFields} initialValues={{ status: "saved" }} submitLabel="Add application" />
    </section>
  );
}
