import Link from "next/link";
import type { Project } from "@/lib/db/schema";

type ProjectCardProps = Readonly<{ project: Project }>;

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-950">
        <Link
          href={`/projects/${project.slug}`}
          className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          {project.title}
        </Link>
      </h3>
      <p className="leading-7 text-slate-700">{project.summary}</p>
      {project.technologies.length > 0 ? (
        <ul aria-label={`Technologies used in ${project.title}`} className="flex flex-wrap gap-2">
          {project.technologies.map((technology) => (
            <li
              key={technology}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {technology}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
