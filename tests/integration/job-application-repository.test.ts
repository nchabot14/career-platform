// @vitest-environment node

import "@/tests/integration/test-database";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { applicationActivities, jobApplications } from "@/lib/db/schema";
import {
  createApplication,
  getApplicationDetail,
  transitionApplicationStatus,
} from "@/lib/db/repositories/job-applications";

it("transitions application status and records exactly one activity in the same transaction", async () => {
  const application = await createApplication({
    company: "Career Platform",
    role: "Founding engineer",
    jobUrl: "https://example.com/jobs/founding-engineer",
    source: "Referral",
    status: "saved",
    notes: "Initial screening next week.",
  });

  await transitionApplicationStatus(application.id, "applied");

  const [updatedApplication] = await db
    .select()
    .from(jobApplications)
    .where(eq(jobApplications.id, application.id));

  const activities = await db
    .select()
    .from(applicationActivities)
    .where(eq(applicationActivities.applicationId, application.id));

  expect(updatedApplication).toEqual(
    expect.objectContaining({
      id: application.id,
      status: "applied",
    }),
  );

  expect(activities).toEqual([
    expect.objectContaining({
      applicationId: application.id,
      priorStatus: "saved",
      resultingStatus: "applied",
    }),
  ]);
});

it("keeps timeline entries in insertion order when they share a timestamp", async () => {
  const application = await createApplication({
    company: "Ordering Co",
    role: "Founding engineer",
    jobUrl: "https://example.com/jobs/founding-engineer",
    source: "Referral",
    status: "saved",
    notes: "Initial screening next week.",
  });

  await transitionApplicationStatus(application.id, "applied");
  await transitionApplicationStatus(application.id, "interviewing");
  await transitionApplicationStatus(application.id, "offer");

  // Force every entry onto one instant so only insertion order can separate them.
  await db
    .update(applicationActivities)
    .set({ occurredAt: new Date("2026-10-08T12:00:00.000Z") })
    .where(eq(applicationActivities.applicationId, application.id));
  // Rewriting the first entry moves its row to the end of the table, so
  // physical order no longer matches insertion order.
  await db
    .update(applicationActivities)
    .set({ note: "touched" })
    .where(eq(applicationActivities.resultingStatus, "applied"));

  const detail = await getApplicationDetail(application.id);
  expect(detail?.activities.map((activity) => activity.resultingStatus)).toEqual([
    "applied",
    "interviewing",
    "offer",
  ]);
});

it("treats a malformed application id as not found", async () => {
  await expect(getApplicationDetail("not-a-uuid")).resolves.toBeUndefined();
});
