// @vitest-environment node

import "@/tests/integration/test-database";
import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { applicationActivities, jobApplications } from "@/lib/db/schema";
import {
  createApplication,
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
