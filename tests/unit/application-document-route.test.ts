// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  getApplicationDocument: vi.fn(),
  readStoredFile: vi.fn(),
}));

vi.mock("@/lib/auth/owner", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/db/repositories/job-applications", () => ({
  getApplicationDocument: mocks.getApplicationDocument,
}));
vi.mock("@/lib/storage/files", () => ({ readStoredFile: mocks.readStoredFile }));

import { GET } from "@/app/(admin)/admin/applications/[id]/documents/[documentId]/route";

const context = { params: Promise.resolve({ id: "a1", documentId: "d1" }) };

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.requireOwner.mockResolvedValue({ id: "o", email: "o@example.com" });
});

it("checks the owner before reading anything", async () => {
  const forbidden = new Error("forbidden");
  mocks.requireOwner.mockRejectedValue(forbidden);

  await expect(GET(new Request("http://x"), context)).rejects.toBe(forbidden);
  expect(mocks.getApplicationDocument).not.toHaveBeenCalled();
  expect(mocks.readStoredFile).not.toHaveBeenCalled();
});

it("returns 404 for a document that is not attached to the application", async () => {
  mocks.getApplicationDocument.mockResolvedValue(undefined);

  const response = await GET(new Request("http://x"), context);

  expect(response.status).toBe(404);
  expect(mocks.getApplicationDocument).toHaveBeenCalledWith("a1", "d1");
});

it("sends the document as a private attachment", async () => {
  mocks.getApplicationDocument.mockResolvedValue({
    storageKey: "application-documents/owner/a1/x-cv.docx",
    filename: "cv.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  mocks.readStoredFile.mockResolvedValue(new Uint8Array([0x50, 0x4b, 3, 4]));

  const response = await GET(new Request("http://x"), context);

  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="cv.docx"');
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex");
});
