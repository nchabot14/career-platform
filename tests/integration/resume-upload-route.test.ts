// @vitest-environment node

import "@/tests/integration/test-database";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { resumeDocuments } from "@/lib/db/schema";
import { getCurrentPublishedResume } from "@/lib/db/repositories/public-content";
import { readStoredFile } from "@/lib/storage/files";
import { replaceCurrentResume } from "@/lib/storage/resumes";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const pdf = (label: string) => {
  const bytes = new TextEncoder().encode(`%PDF-1.7\n% ${label}\n%%EOF\n`);
  return { name: `${label}.pdf`, type: "application/pdf", size: bytes.length, bytes };
};

it("replacing the resume leaves exactly one current, published record", async () => {
  const first = await replaceCurrentResume(pdf("first"));
  const second = await replaceCurrentResume(pdf("second"));

  const current = await db
    .select()
    .from(resumeDocuments)
    .where(eq(resumeDocuments.isCurrent, true));

  expect(current.map((row) => row.id)).toEqual([second.id]);
  expect((await getCurrentPublishedResume())?.id).toBe(second.id);

  const [previous] = await db
    .select()
    .from(resumeDocuments)
    .where(eq(resumeDocuments.id, first.id));
  expect(previous.isCurrent).toBe(false);

  const stored = await readStoredFile(second.storageKey);
  expect(new TextDecoder().decode(stored!)).toContain("second");
});
