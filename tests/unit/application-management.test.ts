// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertApplication: vi.fn(),
  updateApplicationRow: vi.fn(),
  getApplicationRow: vi.fn(),
  appendApplicationActivity: vi.fn(),
  transitionApplicationStatus: vi.fn(),
  insertApplicationContact: vi.fn(),
  insertApplicationDocument: vi.fn(),
  writeStoredFile: vi.fn(),
  deleteStoredFile: vi.fn(),
}));

vi.mock("@/lib/db/repositories/job-applications", () => ({
  createApplication: mocks.insertApplication,
  updateApplicationRow: mocks.updateApplicationRow,
  getApplicationRow: mocks.getApplicationRow,
  appendApplicationActivity: mocks.appendApplicationActivity,
  transitionApplicationStatus: mocks.transitionApplicationStatus,
  insertApplicationContact: mocks.insertApplicationContact,
  insertApplicationDocument: mocks.insertApplicationDocument,
}));
vi.mock("@/lib/storage/files", () => ({
  writeStoredFile: mocks.writeStoredFile,
  deleteStoredFile: mocks.deleteStoredFile,
}));

import {
  addApplicationContact,
  addApplicationDocument,
  ApplicationDocumentError,
  changeApplicationStatus,
  createApplication,
  updateApplication,
} from "@/lib/services/application-management";

const draft = {
  company: "Pioneer Circuits",
  role: "Analyst",
  source: "Referral",
  jobUrl: "https://example.com/jobs/1",
  status: "saved",
  appliedAt: "",
  notes: "",
  nextFollowUpAt: "2026-10-15",
};

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.insertApplication.mockImplementation(async (row) => ({ id: "a1", ...row }));
  mocks.getApplicationRow.mockResolvedValue({ id: "a1", status: "saved" });
  mocks.insertApplicationDocument.mockImplementation(async (row) => ({ id: "d1", ...row }));
});

it("requires company and role and validates URL, dates, and status", async () => {
  const result = await createApplication({
    ...draft,
    company: " ",
    role: "",
    jobUrl: "not a url",
    nextFollowUpAt: "2026-02-30",
    status: "hired",
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(Object.keys(result.fieldErrors).sort()).toEqual(
    ["company", "jobUrl", "nextFollowUpAt", "role", "status"],
  );
  expect(mocks.insertApplication).not.toHaveBeenCalled();
});

it("creates an application with dates as UTC midnights and records a created entry", async () => {
  const result = await createApplication(draft);

  expect(result).toEqual({ ok: true, id: "a1" });
  expect(mocks.insertApplication).toHaveBeenCalledWith({
    company: "Pioneer Circuits",
    role: "Analyst",
    source: "Referral",
    jobUrl: "https://example.com/jobs/1",
    status: "saved",
    appliedAt: null,
    notes: null,
    nextFollowUpAt: new Date("2026-10-15T00:00:00Z"),
  });
  expect(mocks.appendApplicationActivity).toHaveBeenCalledWith(
    expect.objectContaining({ applicationId: "a1", type: "created", resultingStatus: "saved" }),
  );
});

it("routes a status change made while editing through the timeline transaction", async () => {
  mocks.updateApplicationRow.mockResolvedValue({ id: "a1" });

  await updateApplication("a1", { ...draft, status: "applied", appliedAt: "2026-10-02" });

  expect(mocks.updateApplicationRow).toHaveBeenCalledWith(
    "a1",
    expect.not.objectContaining({ status: expect.anything() }),
  );
  expect(mocks.transitionApplicationStatus).toHaveBeenCalledWith("a1", "applied");
});

it("does not record a transition when the status is unchanged", async () => {
  mocks.updateApplicationRow.mockResolvedValue({ id: "a1" });

  await updateApplication("a1", draft);

  expect(mocks.transitionApplicationStatus).not.toHaveBeenCalled();
});

it("rejects an unknown status on a direct status change", async () => {
  await expect(changeApplicationStatus("a1", "hired" as never)).rejects.toThrow(/status/i);
  expect(mocks.transitionApplicationStatus).not.toHaveBeenCalled();
});

it("requires a contact name and a valid optional email", async () => {
  const result = await addApplicationContact("a1", { name: "", email: "nope" });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(Object.keys(result.fieldErrors).sort()).toEqual(["email", "name"]);
});

const pdfBytes = new TextEncoder().encode("%PDF-1.7\n");
const docxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
const txtBytes = new TextEncoder().encode("Cover letter notes");

it.each([
  ["a PNG image", { name: "x.png", type: "image/png", size: 4, bytes: new Uint8Array([137, 80, 78, 71]) }],
  ["an executable renamed to .pdf", { name: "x.pdf", type: "application/pdf", size: 2, bytes: new Uint8Array([77, 90]) }],
  ["a file over 10 MiB", { name: "x.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1, bytes: pdfBytes }],
  ["a binary .txt", { name: "x.txt", type: "text/plain", size: 3, bytes: new Uint8Array([0, 1, 2]) }],
])("rejects %s before storing anything", async (_label, file) => {
  await expect(addApplicationDocument("a1", file, "Other")).rejects.toBeInstanceOf(ApplicationDocumentError);
  expect(mocks.writeStoredFile).not.toHaveBeenCalled();
});

it.each([
  ["PDF", { name: "Offer Letter.PDF", type: "application/pdf", size: pdfBytes.length, bytes: pdfBytes }, "offer-letter.pdf"],
  ["DOCX", { name: "CV.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: docxBytes.length, bytes: docxBytes }, "cv.docx"],
  ["TXT", { name: "notes.txt", type: "text/plain", size: txtBytes.length, bytes: txtBytes }, "notes.txt"],
])("stores a %s under the owner's application folder", async (_label, file, safeName) => {
  const document = await addApplicationDocument("a1", file, "Resume");

  const [key] = mocks.writeStoredFile.mock.calls[0];
  expect(key).toMatch(new RegExp(`^application-documents/owner/a1/[0-9a-f-]{36}-${safeName.replace(".", "\\.")}$`));
  expect(document).toEqual(expect.objectContaining({ applicationId: "a1", storageKey: key, filename: safeName, category: "Resume" }));
});

it("deletes the stored file when saving document metadata fails", async () => {
  mocks.insertApplicationDocument.mockRejectedValue(new Error("db down"));

  await expect(
    addApplicationDocument("a1", { name: "x.pdf", type: "application/pdf", size: pdfBytes.length, bytes: pdfBytes }, "Other"),
  ).rejects.toBeInstanceOf(ApplicationDocumentError);

  const [key] = mocks.writeStoredFile.mock.calls[0];
  expect(mocks.deleteStoredFile).toHaveBeenCalledWith(key);
});

it("refuses documents for an application that does not exist", async () => {
  mocks.getApplicationRow.mockResolvedValue(undefined);

  await expect(
    addApplicationDocument("missing", { name: "x.pdf", type: "application/pdf", size: pdfBytes.length, bytes: pdfBytes }, "Other"),
  ).rejects.toThrow(/not found/i);
  expect(mocks.writeStoredFile).not.toHaveBeenCalled();
});
