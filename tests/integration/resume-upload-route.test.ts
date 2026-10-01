// @vitest-environment node

import "@/tests/integration/test-database";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { resumeDocuments } from "@/lib/db/schema";
import { getCurrentPublishedResume } from "@/lib/db/repositories/public-content";
import { replaceCurrentResume } from "@/lib/storage/resumes";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "resume-int-"));
  process.env.FILE_STORAGE_DIR = root;
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

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

  const stored = await fs.readFile(path.join(root, second.storageKey), "utf8");
  expect(stored).toContain("second");
});
