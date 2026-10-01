import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addApplicationContactAction,
  updateApplicationAction,
  uploadApplicationDocumentAction,
} from "@/app/(admin)/admin/actions";
import { applicationFields, applicationFormValues, contactFields, statusLabels } from "@/components/admin/application-form";
import { ApplicationStatusSelect } from "@/components/admin/application-status-select";
import { ApplicationTimeline } from "@/components/admin/application-timeline";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import { EntityForm } from "@/components/admin/entity-form";
import { getApplicationDetail } from "@/lib/db/repositories/job-applications";

export const dynamic = "force-dynamic";

type ApplicationPageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}>;

export default async function ApplicationPage({ params, searchParams }: ApplicationPageProps) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const detail = await getApplicationDetail(id);

  if (!detail) notFound();

  const { application, contacts, documents, activities } = detail;

  return (
    <div className="space-y-8">
      <Link href="/admin/applications" className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline">
        ← All applications
      </Link>
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-950">
          {application.role} · {application.company}
        </h2>
        <p className="text-sm text-slate-600">
          {statusLabels[application.status]}
          {application.jobUrl ? (
            <>
              {" · "}
              <a href={application.jobUrl} rel="noopener noreferrer" className="text-sky-700 underline">Job posting</a>
            </>
          ) : null}
        </p>
        {saved ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Saved.</p> : null}
        <ApplicationStatusSelect id={application.id} status={application.status} />
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="timeline-heading" className="space-y-3">
          <h3 id="timeline-heading" className="text-lg font-semibold">Timeline</h3>
          <ApplicationTimeline activities={activities} />
        </section>

        <section aria-labelledby="notes-heading" className="space-y-3">
          <h3 id="notes-heading" className="text-lg font-semibold">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{application.notes ?? "No notes."}</p>
        </section>

        <section aria-labelledby="contacts-heading" className="space-y-3">
          <h3 id="contacts-heading" className="text-lg font-semibold">Contacts</h3>
          {contacts.length === 0 ? <p className="text-sm text-slate-600">No contacts yet.</p> : (
            <ul className="space-y-2 text-sm">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <span className="font-semibold">{contact.name}</span>
                  {contact.role ? ` · ${contact.role}` : null}
                  {contact.email ? <> · <a href={`mailto:${contact.email}`} className="text-sky-700 underline">{contact.email}</a></> : null}
                  {contact.phone ? ` · ${contact.phone}` : null}
                  {contact.notes ? <span className="block text-slate-600">{contact.notes}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-sky-700">Add contact</summary>
            <div className="mt-3">
              <EntityForm action={addApplicationContactAction.bind(null, application.id)} fields={contactFields} initialValues={{}} submitLabel="Add contact" />
            </div>
          </details>
        </section>

        <section aria-labelledby="documents-heading" className="space-y-3">
          <h3 id="documents-heading" className="text-lg font-semibold">Documents</h3>
          {documents.length === 0 ? <p className="text-sm text-slate-600">No documents yet.</p> : (
            <ul className="space-y-1 text-sm">
              {documents.map((document) => (
                <li key={document.id}>
                  <a href={`/admin/applications/${application.id}/documents/${document.id}`} className="text-sky-700 underline">
                    {document.filename}
                  </a>{" "}
                  <span className="text-slate-500">· {document.category} · {Math.ceil(document.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          )}
          <DocumentUploadForm action={uploadApplicationDocumentAction.bind(null, application.id)} />
        </section>
      </div>

      <section aria-labelledby="edit-heading" className="max-w-2xl space-y-3">
        <h3 id="edit-heading" className="text-lg font-semibold">Edit details</h3>
        <EntityForm
          action={updateApplicationAction.bind(null, application.id)}
          fields={applicationFields}
          initialValues={applicationFormValues(application)}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
