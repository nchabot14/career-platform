import { ContentSection } from "@/components/admin/content-section";
import type { FieldConfig } from "@/components/admin/entity-form";
import { editIdFrom, noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { listEducationRows } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "institution", label: "Institution", required: true },
  { name: "credential", label: "Credential", required: true },
  { name: "fieldOfStudy", label: "Field of study" },
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
  { name: "sortOrder", label: "Order", type: "number", help: "Lower numbers appear first." },
];

export default async function AdminEducationPage({ searchParams }: AdminPageProps) {
  const [rows, params] = await Promise.all([listEducationRows(), searchParams]);

  return (
    <ContentSection
      kind="education"
      title="Education"
      path="/admin/education"
      fields={fields}
      editId={editIdFrom(params)}
      notice={noticeFrom(params)}
      items={rows.map((row) => ({
        id: row.id,
        label: row.institution,
        detail: row.credential,
        publicationState: row.publicationState,
        values: {
          institution: row.institution,
          credential: row.credential,
          fieldOfStudy: row.fieldOfStudy ?? "",
          startDate: row.startDate ?? "",
          endDate: row.endDate ?? "",
          sortOrder: String(row.sortOrder),
        },
      }))}
    />
  );
}
