import { and, asc, desc, eq, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  applicationActivities,
  applicationContacts,
  applicationDocuments,
  jobApplications,
  type ApplicationActivity,
  type ApplicationContact,
  type ApplicationDocument,
  type ApplicationStatus,
  type JobApplication,
  type NewApplication,
  type NewApplicationActivity,
  type NewApplicationContact,
  type NewApplicationDocument,
} from "@/lib/db/schema";

export { type ApplicationStatus } from "@/lib/db/schema";

export async function createApplication(
  input: NewApplication,
): Promise<JobApplication> {
  const [application] = await db
    .insert(jobApplications)
    .values(input)
    .returning();

  return application;
}

export async function appendApplicationActivity(
  input: NewApplicationActivity,
) {
  const [activity] = await db
    .insert(applicationActivities)
    .values(input)
    .returning();

  return activity;
}

export async function transitionApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<JobApplication> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Job application ${id} was not found.`);
    }

    const now = new Date();
    const [updatedApplication] = await tx
      .update(jobApplications)
      .set({ status, updatedAt: now })
      .where(eq(jobApplications.id, id))
      .returning();

    await tx.insert(applicationActivities).values({
      applicationId: id,
      type: "status_transition",
      occurredAt: now,
      note: null,
      priorStatus: current.status,
      resultingStatus: status,
    });

    return updatedApplication;
  });
}

export async function getApplicationRow(id: string): Promise<JobApplication | undefined> {
  const [application] = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, id))
    .limit(1);

  return application;
}

export async function updateApplicationRow(
  id: string,
  values: Partial<NewApplication>,
): Promise<JobApplication | undefined> {
  const [application] = await db
    .update(jobApplications)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(jobApplications.id, id))
    .returning();

  return application;
}

export type ApplicationFilters = {
  status?: ApplicationStatus;
  followUpBy?: Date;
};

export async function listApplications(filters: ApplicationFilters): Promise<JobApplication[]> {
  const conditions: SQL[] = [];

  if (filters.status) conditions.push(eq(jobApplications.status, filters.status));
  if (filters.followUpBy) {
    conditions.push(isNotNull(jobApplications.nextFollowUpAt));
    conditions.push(lte(jobApplications.nextFollowUpAt, filters.followUpBy));
  }

  return db
    .select()
    .from(jobApplications)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobApplications.updatedAt));
}

export async function insertApplicationContact(
  input: NewApplicationContact,
): Promise<ApplicationContact> {
  const [contact] = await db.insert(applicationContacts).values(input).returning();

  return contact;
}

export async function insertApplicationDocument(
  input: NewApplicationDocument,
): Promise<ApplicationDocument> {
  const [document] = await db.insert(applicationDocuments).values(input).returning();

  return document;
}

export async function getApplicationDocument(
  applicationId: string,
  documentId: string,
): Promise<ApplicationDocument | undefined> {
  const [document] = await db
    .select()
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId),
      ),
    )
    .limit(1);

  return document;
}

export type ApplicationDetail = {
  application: JobApplication;
  contacts: ApplicationContact[];
  documents: ApplicationDocument[];
  activities: ApplicationActivity[];
};

export async function getApplicationDetail(id: string): Promise<ApplicationDetail | undefined> {
  const application = await getApplicationRow(id);
  if (!application) return undefined;

  const [contacts, documents, activities] = await Promise.all([
    db.select().from(applicationContacts).where(eq(applicationContacts.applicationId, id)).orderBy(asc(applicationContacts.createdAt)),
    db.select().from(applicationDocuments).where(eq(applicationDocuments.applicationId, id)).orderBy(desc(applicationDocuments.createdAt)),
    // rowid breaks ties between entries recorded in the same millisecond.
    db.select().from(applicationActivities).where(eq(applicationActivities.applicationId, id)).orderBy(asc(applicationActivities.occurredAt), sql`rowid`),
  ]);

  return { application, contacts, documents, activities };
}
