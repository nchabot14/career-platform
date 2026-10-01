// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  saveProject: vi.fn(),
  publishContent: vi.fn(),
  deleteContent: vi.fn(),
  replaceCurrentResume: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/owner", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/services/content-management", () => ({
  saveProject: mocks.saveProject,
  saveProfile: vi.fn(), saveExperience: vi.fn(), saveEducation: vi.fn(),
  saveSkill: vi.fn(), saveSocialLink: vi.fn(),
  publishContent: mocks.publishContent, unpublishContent: vi.fn(),
  deleteContent: mocks.deleteContent,
}));
vi.mock("@/lib/storage/resumes", () => ({
  replaceCurrentResume: mocks.replaceCurrentResume,
  ResumeUploadError: class extends Error {},
}));

import {
  deleteContentAction,
  saveContentAction,
  setPublicationAction,
  uploadResumeAction,
} from "@/app/(admin)/admin/actions";

const forbidden = Object.assign(new Error("forbidden"), { code: "OWNER_FORBIDDEN" });

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockClear();
  mocks.requireOwner.mockReset();
});

it("checks the owner before any save, publish, delete, or upload", async () => {
  mocks.requireOwner.mockRejectedValue(forbidden);
  const form = new FormData();
  form.set("title", "x");
  form.set("confirm", "yes");
  form.set("resume", new File(["%PDF-"], "r.pdf", { type: "application/pdf" }));

  await expect(saveContentAction("project", { fieldErrors: {}, values: {} }, form)).rejects.toBe(forbidden);
  await expect(setPublicationAction("project", "p1", "published")).rejects.toBe(forbidden);
  await expect(deleteContentAction("project", "p1", form)).rejects.toBe(forbidden);
  await expect(uploadResumeAction({}, form)).rejects.toBe(forbidden);

  expect(mocks.saveProject).not.toHaveBeenCalled();
  expect(mocks.publishContent).not.toHaveBeenCalled();
  expect(mocks.deleteContent).not.toHaveBeenCalled();
  expect(mocks.replaceCurrentResume).not.toHaveBeenCalled();
});

it("returns field errors with the submitted values so the form can redisplay them", async () => {
  mocks.requireOwner.mockResolvedValue({ id: "o", email: "o@example.com" });
  mocks.saveProject.mockResolvedValue({ ok: false, fieldErrors: { title: ["Title is required."] } });
  const form = new FormData();
  form.set("title", "");
  form.set("slug", "kept-slug");

  const state = await saveContentAction("project", { fieldErrors: {}, values: {} }, form);

  expect(state.fieldErrors).toEqual({ title: ["Title is required."] });
  expect(state.values).toEqual({ title: "", slug: "kept-slug" });
});

it("refuses to delete without the confirmation box", async () => {
  mocks.requireOwner.mockResolvedValue({ id: "o", email: "o@example.com" });

  await expect(deleteContentAction("project", "p1", new FormData())).rejects.toThrow(
    "REDIRECT:/admin/projects?error=confirm",
  );
  expect(mocks.deleteContent).not.toHaveBeenCalled();
});
