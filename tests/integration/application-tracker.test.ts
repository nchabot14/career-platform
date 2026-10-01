// @vitest-environment node

import "@/tests/integration/test-database";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  getApplicationDetail,
  listApplications,
} from "@/lib/db/repositories/job-applications";
import {
  addApplicationContact,
  addApplicationDocument,
  changeApplicationStatus,
  createApplication,
} from "@/lib/services/application-management";

let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "applications-int-"));
  process.env.FILE_STORAGE_DIR = root;
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const draft = {
  company: "Pioneer Circuits", role: "Analyst", source: "", jobUrl: "",
  status: "saved", appliedAt: "", notes: "Follow up with hiring manager.", nextFollowUpAt: "2026-10-10",
};

it("tracks an application from saved to applied with contacts, documents, and a timeline", async () => {
  const created = await createApplication(draft);
  if (!created.ok) throw new Error("create failed");

  await changeApplicationStatus(created.id, "applied");
  await addApplicationContact(created.id, { name: "Dana Recruiter", email: "dana@example.com", role: "Recruiter" });
  const bytes = new TextEncoder().encode("%PDF-1.7\n");
  await addApplicationDocument(created.id, { name: "resume.pdf", type: "application/pdf", size: bytes.length, bytes }, "Resume");

  const detail = await getApplicationDetail(created.id);
  expect(detail?.application.status).toBe("applied");
  expect(detail?.contacts.map((contact) => contact.name)).toEqual(["Dana Recruiter"]);
  expect(detail?.documents.map((document) => document.filename)).toEqual(["resume.pdf"]);
  expect(detail?.activities).toEqual([
    expect.objectContaining({ type: "created", resultingStatus: "saved" }),
    expect.objectContaining({ type: "status_transition", priorStatus: "saved", resultingStatus: "applied" }),
  ]);
  await expect(fs.stat(path.join(root, detail!.documents[0].storageKey))).resolves.toBeTruthy();
});

it("filters applications by status and follow-up date", async () => {
  const a = await createApplication({ ...draft, company: "A", nextFollowUpAt: "2026-10-05" });
  const b = await createApplication({ ...draft, company: "B", nextFollowUpAt: "2026-11-20" });
  const c = await createApplication({ ...draft, company: "C", status: "offer", nextFollowUpAt: "" });
  if (!a.ok || !b.ok || !c.ok) throw new Error("create failed");

  expect((await listApplications({ status: "offer" })).map((row) => row.company)).toEqual(["C"]);
  expect(
    (await listApplications({ followUpBy: new Date("2026-10-31T00:00:00Z") })).map((row) => row.company),
  ).toEqual(["A"]);
  expect((await listApplications({})).map((row) => row.company).sort()).toEqual(["A", "B", "C"]);
});
