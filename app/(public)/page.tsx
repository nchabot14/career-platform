import type { Metadata } from "next";
import { ContactForm } from "@/components/public/contact-form";
import { ContactLinks } from "@/components/public/contact-links";
import { EducationList } from "@/components/public/education-list";
import { ExperienceTimeline } from "@/components/public/experience-timeline";
import { ProjectCard } from "@/components/public/project-card";
import { Section } from "@/components/public/section";
import { SkillsList } from "@/components/public/skills-list";
import { getPublicProfilePage } from "@/lib/services/public-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getPublicProfilePage();

  if (!profile) return { alternates: { canonical: "/" } };

  const title = `${profile.name} — ${profile.headline}`;

  return {
    title,
    description: profile.summary,
    alternates: { canonical: "/" },
    openGraph: {
      type: "profile",
      url: "/",
      title,
      description: profile.summary,
    },
  };
}

export default async function HomePage() {
  const page = await getPublicProfilePage();
  const { profile } = page;

  if (!profile) {
    return (
      <section className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Profile coming soon
        </h1>
        <p className="text-lg leading-8 text-slate-700">
          This resume hasn&apos;t been published yet. Please check back later.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="space-y-5">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          {profile.name}
        </h1>
        <p className="text-xl font-medium text-slate-800">{profile.headline}</p>
        {profile.location || profile.availability ? (
          <p className="text-sm text-slate-600">
            {[profile.location, profile.availability].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="max-w-2xl text-lg leading-8 text-slate-700">{profile.summary}</p>
        <ContactLinks links={page.socialLinks} resumeAvailable={page.resume !== null} />
      </header>

      {page.experience.length > 0 ? (
        <Section id="experience" title="Experience">
          <ExperienceTimeline items={page.experience} />
        </Section>
      ) : null}

      {page.projects.length > 0 ? (
        <Section id="projects" title="Projects">
          <ul className="grid gap-4 sm:grid-cols-2">
            {page.projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {page.skills.length > 0 ? (
        <Section id="skills" title="Skills">
          <SkillsList items={page.skills} />
        </Section>
      ) : null}

      {page.education.length > 0 ? (
        <Section id="education" title="Education">
          <EducationList items={page.education} />
        </Section>
      ) : null}

      <Section id="contact" title="Contact">
        <ContactForm />
      </Section>
    </>
  );
}
