// @vitest-environment node

import "@/tests/integration/test-database";
import { expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  education,
  resumeDocuments,
  skills,
  socialLinks,
} from "@/lib/db/schema";
import {
  getCurrentPublishedResume,
  listPublishedEducation,
  listPublishedSkills,
  listPublishedSocialLinks,
} from "@/lib/db/repositories/public-content";

it("lists only published education, skills, and social links in sort order", async () => {
  await db.insert(education).values([
    { institution: "Draft U", credential: "Draft", sortOrder: 0, publicationState: "draft" },
    { institution: "Second U", credential: "BS", sortOrder: 2, publicationState: "published" },
    { institution: "First U", credential: "MS", sortOrder: 1, publicationState: "published" },
  ]);
  await db.insert(skills).values([
    { name: "Hidden", category: "Data", sortOrder: 0, publicationState: "draft" },
    { name: "SQL", category: "Data", sortOrder: 2, publicationState: "published" },
    { name: "Python", category: "Programming", sortOrder: 1, publicationState: "published" },
  ]);
  await db.insert(socialLinks).values([
    { label: "Draft", url: "https://example.com/draft", sortOrder: 0, publicationState: "draft" },
    { label: "LinkedIn", url: "https://example.com/in", sortOrder: 1, publicationState: "published" },
  ]);

  expect((await listPublishedEducation()).map((row) => row.institution)).toEqual([
    "First U",
    "Second U",
  ]);
  expect((await listPublishedSkills()).map((row) => row.name)).toEqual([
    "Python",
    "SQL",
  ]);
  expect((await listPublishedSocialLinks()).map((row) => row.label)).toEqual([
    "LinkedIn",
  ]);
});

it("returns the current resume only when it is published", async () => {
  expect(await getCurrentPublishedResume()).toBeUndefined();

  await db.insert(resumeDocuments).values({
    storageKey: "resumes/draft.pdf",
    filename: "draft.pdf",
    mimeType: "application/pdf",
    size: 10,
    isCurrent: true,
    publicationState: "draft",
  });

  expect(await getCurrentPublishedResume()).toBeUndefined();

  await db.delete(resumeDocuments);
  await db.insert(resumeDocuments).values([
    {
      storageKey: "resumes/old.pdf",
      filename: "old.pdf",
      mimeType: "application/pdf",
      size: 10,
      isCurrent: false,
      publicationState: "published",
    },
    {
      storageKey: "resumes/current.pdf",
      filename: "current.pdf",
      mimeType: "application/pdf",
      size: 20,
      isCurrent: true,
      publicationState: "published",
    },
  ]);

  expect(await getCurrentPublishedResume()).toEqual(
    expect.objectContaining({ storageKey: "resumes/current.pdf" }),
  );
});
