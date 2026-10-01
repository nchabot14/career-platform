import { ContentSection } from "@/components/admin/content-section";
import type { FieldConfig } from "@/components/admin/entity-form";
import { editIdFrom, noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { listSocialLinkRows } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "label", label: "Label", required: true, help: "For example: LinkedIn." },
  { name: "url", label: "URL", type: "url", required: true },
  { name: "sortOrder", label: "Order", type: "number", help: "Lower numbers appear first." },
];

export default async function AdminLinksPage({ searchParams }: AdminPageProps) {
  const [rows, params] = await Promise.all([listSocialLinkRows(), searchParams]);

  return (
    <ContentSection
      kind="socialLink"
      title="Links"
      path="/admin/links"
      fields={fields}
      editId={editIdFrom(params)}
      notice={noticeFrom(params)}
      items={rows.map((row) => ({
        id: row.id,
        label: row.label,
        detail: row.url,
        publicationState: row.publicationState,
        values: { label: row.label, url: row.url, sortOrder: String(row.sortOrder) },
      }))}
    />
  );
}
