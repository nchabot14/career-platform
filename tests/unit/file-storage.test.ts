// @vitest-environment node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import {
  deleteStoredFile,
  readStoredFile,
  writeStoredFile,
} from "@/lib/storage/files";

let root: string;
const originalDir = process.env.FILE_STORAGE_DIR;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "career-files-"));
  process.env.FILE_STORAGE_DIR = root;
});

afterEach(async () => {
  process.env.FILE_STORAGE_DIR = originalDir;
  await fs.rm(root, { recursive: true, force: true });
});

it("writes, reads, and deletes a file under the storage root", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70]);

  await writeStoredFile("resumes/abc.pdf", bytes);
  expect(await fs.readFile(path.join(root, "resumes/abc.pdf"))).toEqual(
    Buffer.from(bytes),
  );
  expect(await readStoredFile("resumes/abc.pdf")).toEqual(bytes);

  await deleteStoredFile("resumes/abc.pdf");
  expect(await readStoredFile("resumes/abc.pdf")).toBeNull();
});

it("returns null when a file is missing and ignores deleting a missing file", async () => {
  expect(await readStoredFile("resumes/missing.pdf")).toBeNull();
  await expect(deleteStoredFile("resumes/missing.pdf")).resolves.toBeUndefined();
});

it.each(["../escape.pdf", "/etc/passwd", "resumes/../../x.pdf", "resumes/", "", "a\\b.pdf"])(
  "rejects the unsafe key %j",
  async (key) => {
    await expect(readStoredFile(key)).rejects.toThrow(/invalid storage key/i);
    await expect(writeStoredFile(key, new Uint8Array())).rejects.toThrow(
      /invalid storage key/i,
    );
  },
);
