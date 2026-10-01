import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/public/project-detail";
import { getProjectRow } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

type PreviewPageProps = Readonly<{ params: Promise<{ id: string }> }>;

export default async function ProjectPreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const project = await getProjectRow(id);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <p role="note" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Preview — this project is <strong>{project.publicationState}</strong>.
        {project.publicationState === "draft" ? " Visitors can't see it until you publish it." : null}
      </p>
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <ProjectDetail
          project={project}
          backLink={
            <Link href="/admin/projects" className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline">
              ← Back to projects
            </Link>
          }
        />
      </div>
    </div>
  );
}
