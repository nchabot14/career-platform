import type { SocialLink } from "@/lib/db/schema";

const linkClass =
  "inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

type ContactLinksProps = Readonly<{
  links: SocialLink[];
  resumeAvailable: boolean;
}>;

export function ContactLinks({ links, resumeAvailable }: ContactLinksProps) {
  if (!resumeAvailable && links.length === 0) return null;

  return (
    <ul aria-label="Contact and resume links" className="flex flex-wrap gap-3">
      {resumeAvailable ? (
        <li>
          <a
            href="/resume"
            className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Resume PDF
          </a>
        </li>
      ) : null}
      {links.map((link) => (
        <li key={link.id}>
          <a href={link.url} rel="noopener noreferrer" className={linkClass}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
