import { ContentSection } from "@/components/admin/content-section";
import type { FieldConfig } from "@/components/admin/entity-form";
import { editIdFrom, noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { listSkillRows } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "name", label: "Skill", required: true },
  { name: "category", label: "Category", required: true, help: "Skills are grouped by category on the public page." },
  { name: "proficiencyOrContext", label: "Detail", help: "For example: Pivot Tables, VLOOKUP." },
  { name: "certificationDetails", label: "Certification" },
  { name: "sortOrder", label: "Order", type: "number", help: "Lower numbers appear first." },
];

export default async function AdminSkillsPage({ searchParams }: AdminPageProps) {
  const [rows, params] = await Promise.all([listSkillRows(), searchParams]);

  return (
    <ContentSection
      kind="skill"
      title="Skills"
      path="/admin/skills"
      fields={fields}
      editId={editIdFrom(params)}
      notice={noticeFrom(params)}
      items={rows.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.category,
        publicationState: row.publicationState,
        values: {
          name: row.name,
          category: row.category,
          proficiencyOrContext: row.proficiencyOrContext ?? "",
          certificationDetails: row.certificationDetails ?? "",
          sortOrder: String(row.sortOrder),
        },
      }))}
    />
  );
}
