import Link from "next/link";
import {
  getProfileRow,
  listEducationRows,
  listExperienceRows,
  listProjectRows,
  listSkillRows,
  listSocialLinkRows,
} from "@/lib/db/repositories/content";
import { listContactMessages } from "@/lib/db/repositories/contact-messages";
import { getCurrentPublishedResume } from "@/lib/db/repositories/public-content";

export const dynamic = "force-dynamic";

function summarize(rows: { publicationState: string }[]) {
  const published = rows.filter((row) => row.publicationState === "published").length;
  return `${published} published · ${rows.length - published} draft`;
}

export default async function AdminOverviewPage() {
  const [profile, experience, education, skills, links, projects, resume, messages] = await Promise.all([
    getProfileRow(),
    listExperienceRows(),
    listEducationRows(),
    listSkillRows(),
    listSocialLinkRows(),
    listProjectRows(),
    getCurrentPublishedResume(),
    listContactMessages(),
  ]);

  const cards = [
    { href: "/admin/profile", title: "Profile", text: profile ? `${profile.name} · ${profile.publicationState}` : "Not created yet" },
    { href: "/admin/experience", title: "Experience", text: summarize(experience) },
    { href: "/admin/education", title: "Education", text: summarize(education) },
    { href: "/admin/skills", title: "Skills", text: summarize(skills) },
    { href: "/admin/projects", title: "Projects", text: summarize(projects) },
    { href: "/admin/links", title: "Links", text: summarize(links) },
    { href: "/admin/resume", title: "Resume PDF", text: resume ? `Current: ${resume.filename}` : "No resume uploaded" },
    { href: "/admin/messages", title: "Messages", text: `${messages.filter((m) => m.status === "unread").length} unread` },
  ];

  return (
    <section aria-labelledby="overview-heading" className="space-y-4">
      <h2 id="overview-heading" className="text-2xl font-semibold text-slate-950">
        Content overview
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <span className="block font-semibold text-slate-950">{card.title}</span>
              <span className="text-sm text-slate-600">{card.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
