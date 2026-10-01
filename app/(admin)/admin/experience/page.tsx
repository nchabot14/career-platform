import { ContentSection } from "@/components/admin/content-section";
import type { FieldConfig } from "@/components/admin/entity-form";
import { editIdFrom, noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { listExperienceRows } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "employer", label: "Employer", required: true },
  { name: "title", label: "Title", required: true },
  { name: "startDate", label: "Start date", type: "date", required: true },
  { name: "endDate", label: "End date", type: "date", help: "Leave blank for a current role." },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "highlights", label: "Highlights", type: "textarea", help: "One per line.", rows: 5 },
  { name: "sortOrder", label: "Order", type: "number", help: "Lower numbers appear first." },
];

export default async function AdminExperiencePage({ searchParams }: AdminPageProps) {
  const [rows, params] = await Promise.all([listExperienceRows(), searchParams]);

  return (
    <ContentSection
      kind="experience"
      title="Experience"
      path="/admin/experience"
      fields={fields}
      editId={editIdFrom(params)}
      notice={noticeFrom(params)}
      items={rows.map((row) => ({
        id: row.id,
        label: `${row.title} · ${row.employer}`,
        detail: `${row.startDate} – ${row.endDate ?? "present"}`,
        publicationState: row.publicationState,
        values: {
          employer: row.employer,
          title: row.title,
          startDate: row.startDate,
          endDate: row.endDate ?? "",
          description: row.description,
          highlights: row.highlights.join("\n"),
          sortOrder: String(row.sortOrder),
        },
      }))}
    />
  );
}
