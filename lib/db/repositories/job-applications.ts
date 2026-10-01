import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  applicationActivities,
  jobApplications,
  type ApplicationStatus,
  type JobApplication,
  type NewApplication,
  type NewApplicationActivity,
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
