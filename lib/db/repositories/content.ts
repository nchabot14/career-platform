import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  education,
  experiences,
  profiles,
  projects,
  skills,
  socialLinks,
  type PublicationState,
} from "@/lib/db/schema";

export const contentTables = {
  profile: profiles,
  experience: experiences,
  education,
  skill: skills,
  socialLink: socialLinks,
  project: projects,
} as const;

export type ContentKind = keyof typeof contentTables;

type ContentRow = { id: string; publicationState: PublicationState; slug?: string };

// Every content table shares id, publicationState, sortOrder (except
// profile), createdAt and updatedAt, so the operations below treat them
// through one representative table type.
function tableFor(kind: ContentKind) {
  return contentTables[kind] as unknown as typeof projects;
}

export async function insertContent(
  kind: ContentKind,
  values: Record<string, unknown>,
): Promise<string> {
  const table = tableFor(kind);
  const [row] = await db
    .insert(table)
    .values(values as typeof table.$inferInsert)
    .returning({ id: table.id });

  return row.id;
}

export async function updateContent(
  kind: ContentKind,
  id: string,
  values: Record<string, unknown>,
): Promise<ContentRow | undefined> {
  const table = tableFor(kind);
  const [row] = await db
    .update(table)
    .set(values as Partial<typeof table.$inferInsert>)
    .where(eq(table.id, id))
    .returning();

  return row;
}

export async function setContentPublicationState(
  kind: ContentKind,
  id: string,
  publicationState: PublicationState,
): Promise<ContentRow | undefined> {
  return updateContent(kind, id, { publicationState, updatedAt: new Date() });
}

export async function deleteContentRow(
  kind: ContentKind,
  id: string,
): Promise<ContentRow | undefined> {
  const table = tableFor(kind);
  const [row] = await db.delete(table).where(eq(table.id, id)).returning();

  return row;
}

export async function getProfileRow() {
  const [row] = await db.select().from(profiles).limit(1);

  return row;
}

export async function listExperienceRows() {
  return db.select().from(experiences).orderBy(asc(experiences.sortOrder));
}

export async function listEducationRows() {
  return db.select().from(education).orderBy(asc(education.sortOrder));
}

export async function listSkillRows() {
  return db.select().from(skills).orderBy(asc(skills.sortOrder), asc(skills.name));
}

export async function listSocialLinkRows() {
  return db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));
}

export async function listProjectRows() {
  return db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.title));
}

export async function getProjectRow(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  return row;
}
