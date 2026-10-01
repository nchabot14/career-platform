import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  experiences,
  profiles,
  projects,
  type Experience,
  type Profile,
  type Project,
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
