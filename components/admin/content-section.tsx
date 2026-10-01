import Link from "next/link";
import { saveContentAction } from "@/app/(admin)/admin/actions";
import { ContentStatusControl } from "@/components/admin/content-status-control";
import { EntityForm, type FieldConfig } from "@/components/admin/entity-form";
import type { PublicationState } from "@/lib/db/schema";
import type { ContentKind } from "@/lib/services/content-management";

export type SectionItem = {
  id: string;
  label: string;
  detail?: string;
  publicationState: PublicationState;
  values: Record<string, string>;
  extraLinks?: React.ReactNode;
};

type ContentSectionProps = Readonly<{
  kind: ContentKind;
  title: string;
  path: string;
  items: SectionItem[];
  fields: FieldConfig[];
  editId?: string;
  notice?: string;
}>;

export function ContentSection({ kind, title, path, items, fields, editId, notice }: ContentSectionProps) {
  const editing = items.find((item) => item.id === editId);
  const save = saveContentAction.bind(null, kind);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)]">
      <section aria-labelledby="items-heading" className="space-y-4">
        <h2 id="items-heading" className="text-2xl font-semibold text-slate-950">
          {title}
        </h2>
        {notice ? (
          <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="text-slate-600">Nothing here yet. Add the first one with the form.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-950">{item.label}</p>
                  <div className="flex gap-3 text-sm">
                    {item.extraLinks}
                    <Link href={`${path}?edit=${item.id}`} className="font-semibold text-sky-700 underline-offset-4 hover:underline">
                      Edit<span className="sr-only"> {item.label}</span>
                    </Link>
                  </div>
                </div>
                {item.detail ? <p className="text-sm text-slate-600">{item.detail}</p> : null}
                <ContentStatusControl kind={kind} id={item.id} label={item.label} publicationState={item.publicationState} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="form-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="form-heading" className="text-xl font-semibold text-slate-950">
            {editing ? `Edit ${editing.label}` : "Add new"}
          </h2>
          {editing ? (
            <Link href={path} className="text-sm text-sky-700 underline-offset-4 hover:underline">
              Cancel
            </Link>
          ) : null}
        </div>
        <EntityForm
          key={editing?.id ?? "new"}
          action={save}
          fields={fields}
          initialValues={editing ? { ...editing.values, id: editing.id } : {}}
          submitLabel={editing ? "Save changes" : "Add"}
        />
        <p className="text-xs text-slate-500">New items start as drafts. Publish them to show them on the public site.</p>
      </section>
    </div>
  );
}
