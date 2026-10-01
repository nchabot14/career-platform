import type { Project } from "@/lib/db/schema";

// Bodies are plain text: blank lines separate paragraphs, "- " starts a list item.
function renderBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines, index) =>
      lines.every((line) => line.startsWith("- ")) ? (
        <ul key={index} className="list-disc space-y-1 pl-5">
          {lines.map((line) => (
            <li key={line}>{line.slice(2)}</li>
          ))}
        </ul>
      ) : (
        <p key={index}>{lines.join(" ")}</p>
      ),
    );
}

type ProjectDetailProps = Readonly<{
  project: Project;
  backLink?: React.ReactNode;
}>;

export function ProjectDetail({ project, backLink }: ProjectDetailProps) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        {backLink}
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          {project.title}
        </h1>
        <p className="text-lg leading-8 text-slate-700">{project.summary}</p>
        {project.role ? <p className="text-sm text-slate-600">Role: {project.role}</p> : null}
      </header>

      {project.coverImage ? (
        // Cover images are owner-supplied URLs of unknown dimensions.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverImage}
          alt={`Cover image for ${project.title}`}
          className="w-full rounded-2xl border border-slate-200"
        />
      ) : null}

      <div className="space-y-4 leading-7 text-slate-700">{renderBody(project.body)}</div>

      {project.technologies.length > 0 ? (
        <section aria-labelledby="technologies-heading" className="space-y-2">
          <h2 id="technologies-heading" className="font-semibold text-slate-950">
            Technologies
          </h2>
          <ul className="flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {technology}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.links.length > 0 ? (
        <section aria-labelledby="links-heading" className="space-y-2">
          <h2 id="links-heading" className="font-semibold text-slate-950">
            Links
          </h2>
          <ul className="space-y-1">
            {project.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  rel="noopener noreferrer"
                  className="text-sky-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
