import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  education,
  experiences,
  profiles,
  projects,
  resumeDocuments,
  skills,
  socialLinks,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type ResumeDocument,
  type Skill,
  type SocialLink,
} from "@/lib/db/schema";

export async function getPublishedProfile(): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.publicationState, "published"))
    .orderBy(desc(profiles.updatedAt))
    .limit(1);

  return profile;
}

export async function listPublishedExperience(): Promise<Experience[]> {
  return db
    .select()
    .from(experiences)
    .where(eq(experiences.publicationState, "published"))
    .orderBy(asc(experiences.sortOrder), desc(experiences.startDate));
}

export async function listPublishedProjects(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.publicationState, "published"))
    .orderBy(asc(projects.sortOrder), asc(projects.title));
}

export async function getPublishedProjectBySlug(
  slug: string,
): Promise<Project | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.slug, slug),
        eq(projects.publicationState, "published"),
      ),
    )
    .limit(1);

  return project;
}

export async function listPublishedEducation(): Promise<Education[]> {
  return db
    .select()
    .from(education)
    .where(eq(education.publicationState, "published"))
    .orderBy(asc(education.sortOrder));
}

export async function listPublishedSkills(): Promise<Skill[]> {
  return db
    .select()
    .from(skills)
    .where(eq(skills.publicationState, "published"))
    .orderBy(asc(skills.sortOrder), asc(skills.name));
}

export async function listPublishedSocialLinks(): Promise<SocialLink[]> {
  return db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.publicationState, "published"))
    .orderBy(asc(socialLinks.sortOrder));
}

export async function getCurrentPublishedResume(): Promise<
  ResumeDocument | undefined
> {
  const [resume] = await db
    .select()
    .from(resumeDocuments)
    .where(
      and(
        eq(resumeDocuments.isCurrent, true),
        eq(resumeDocuments.publicationState, "published"),
      ),
    )
    .limit(1);

  return resume;
}
