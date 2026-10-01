// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  writeStoredFile: vi.fn(),
  deleteStoredFile: vi.fn(),
  insertCurrentResume: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage/files", () => ({
  writeStoredFile: mocks.writeStoredFile,
  deleteStoredFile: mocks.deleteStoredFile,
}));
vi.mock("@/lib/db/repositories/resumes", () => ({
  insertCurrentResume: mocks.insertCurrentResume,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  MAX_UPLOAD_BYTES,
  ResumeUploadError,
  replaceCurrentResume,
} from "@/lib/storage/resumes";

const pdfBytes = new TextEncoder().encode("%PDF-1.7\n%%EOF\n");
const pdf = { name: "My Resume.pdf", type: "application/pdf", size: pdfBytes.length, bytes: pdfBytes };

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.insertCurrentResume.mockImplementation(async (row) => ({ id: "r1", ...row }));
});

it.each([
  ["a non-PDF content type", { ...pdf, type: "image/png" }],
  ["a file that is not really a PDF", { ...pdf, bytes: new TextEncoder().encode("hello") }],
  ["a PDF larger than 10 MiB", { ...pdf, size: MAX_UPLOAD_BYTES + 1 }],
  ["an empty file", { ...pdf, size: 0, bytes: new Uint8Array() }],
])("rejects %s before touching storage", async (_label, file) => {
  await expect(replaceCurrentResume(file)).rejects.toBeInstanceOf(ResumeUploadError);
  expect(mocks.writeStoredFile).not.toHaveBeenCalled();
  expect(mocks.insertCurrentResume).not.toHaveBeenCalled();
});

it("stores the file under a server-generated key and records it as current", async () => {
  const resume = await replaceCurrentResume(pdf);

  const [key] = mocks.writeStoredFile.mock.calls[0];
  expect(key).toMatch(/^resumes\/[0-9a-f-]{36}\.pdf$/);
  expect(mocks.insertCurrentResume).toHaveBeenCalledWith({
    storageKey: key,
    filename: "my-resume.pdf",
    mimeType: "application/pdf",
    size: pdfBytes.length,
  });
  expect(resume.storageKey).toBe(key);
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
});

it("deletes the uploaded file and reports failure when saving metadata fails", async () => {
  mocks.insertCurrentResume.mockRejectedValue(new Error("disk full"));

  await expect(replaceCurrentResume(pdf)).rejects.toThrow(/could not save/i);

  const [key] = mocks.writeStoredFile.mock.calls[0];
  expect(mocks.deleteStoredFile).toHaveBeenCalledWith(key);
});
