// @vitest-environment node

import "@/tests/integration/test-database";
import { expect, it } from "vitest";
import {
  deleteStoredFile,
  readStoredFile,
  writeStoredFile,
} from "@/lib/storage/files";

it("writes, reads, and deletes a file by key", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);

  await writeStoredFile("resumes/abc.pdf", bytes);
  expect(await readStoredFile("resumes/abc.pdf")).toEqual(bytes);

  await deleteStoredFile("resumes/abc.pdf");
  expect(await readStoredFile("resumes/abc.pdf")).toBeNull();
});

it("replaces the bytes when the same key is written twice", async () => {
  await writeStoredFile("resumes/same.pdf", new Uint8Array([1, 2, 3]));
  await writeStoredFile("resumes/same.pdf", new Uint8Array([4, 5]));

  expect(await readStoredFile("resumes/same.pdf")).toEqual(new Uint8Array([4, 5]));
});

it("round-trips a 10 MiB file", async () => {
  const bytes = new Uint8Array(10 * 1024 * 1024).map((_, index) => index % 251);

  await writeStoredFile("application-documents/owner/a/b-big.pdf", bytes);
  const stored = await readStoredFile("application-documents/owner/a/b-big.pdf");

  // Compared without toEqual: a failing diff of two 10 MiB arrays exhausts memory.
  expect(stored?.byteLength).toBe(bytes.byteLength);
  expect(Buffer.compare(Buffer.from(stored!), Buffer.from(bytes))).toBe(0);
});

it("returns null when a file is missing and ignores deleting a missing file", async () => {
  expect(await readStoredFile("resumes/missing.pdf")).toBeNull();
  await expect(deleteStoredFile("resumes/missing.pdf")).resolves.toBeUndefined();
});

it.each(["../escape.pdf", "/etc/passwd", "resumes/../../x.pdf", "resumes/", "", "a\\b.pdf"])(
  "rejects the unsafe key %j",
  async (key) => {
    await expect(readStoredFile(key)).rejects.toThrow(/invalid storage key/i);
    await expect(writeStoredFile(key, new Uint8Array())).rejects.toThrow(/invalid storage key/i);
  },
);
