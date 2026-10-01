import Link from "next/link";
import { ContentSection } from "@/components/admin/content-section";
import type { FieldConfig } from "@/components/admin/entity-form";
import { editIdFrom, noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { listProjectRows } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "title", label: "Title", required: true },
  { name: "slug", label: "Slug", required: true, help: "Used in the page address: /projects/your-slug." },
  { name: "summary", label: "Summary", type: "textarea", required: true, rows: 3 },
  { name: "body", label: "Body", type: "textarea", required: true, rows: 8, help: 'Blank lines separate paragraphs; start lines with "- " for a list.' },
  { name: "role", label: "Your role" },
  { name: "technologies", label: "Technologies", type: "textarea", rows: 3, help: "One per line." },
  { name: "links", label: "Links", type: "textarea", rows: 3, help: "One per line, as: Label | https://example.com" },
  { name: "coverImage", label: "Cover image URL", type: "url" },
  { name: "sortOrder", label: "Order", type: "number", help: "Lower numbers appear first." },
];

export default async function AdminProjectsPage({ searchParams }: AdminPageProps) {
  const [rows, params] = await Promise.all([listProjectRows(), searchParams]);

  return (
    <ContentSection
      kind="project"
      title="Projects"
      path="/admin/projects"
      fields={fields}
      editId={editIdFrom(params)}
      notice={noticeFrom(params)}
      items={rows.map((row) => ({
        id: row.id,
        label: row.title,
        detail: `/projects/${row.slug}`,
        publicationState: row.publicationState,
        extraLinks: (
          <Link href={`/admin/projects/${row.id}/preview`} className="font-semibold text-sky-700 underline-offset-4 hover:underline">
            Preview<span className="sr-only"> {row.title}</span>
          </Link>
        ),
        values: {
          title: row.title,
          slug: row.slug,
          summary: row.summary,
          body: row.body,
          role: row.role ?? "",
          technologies: row.technologies.join("\n"),
          links: row.links.map((link) => `${link.label} | ${link.href}`).join("\n"),
          coverImage: row.coverImage ?? "",
          sortOrder: String(row.sortOrder),
        },
      }))}
    />
  );
}
