// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertContent: vi.fn(),
  updateContent: vi.fn(),
  setContentPublicationState: vi.fn(),
  deleteContentRow: vi.fn(),
  getProfileRow: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db/repositories/content", () => ({
  insertContent: mocks.insertContent,
  updateContent: mocks.updateContent,
  setContentPublicationState: mocks.setContentPublicationState,
  deleteContentRow: mocks.deleteContentRow,
  getProfileRow: mocks.getProfileRow,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  deleteContent,
  publishProject,
  saveExperience,
  saveProfile,
  saveProject,
  unpublishProject,
} from "@/lib/services/content-management";

const validProject = {
  title: "Engine Notes",
  slug: "engine-notes",
  summary: "Notes.",
  body: "Body.",
  role: "",
  technologies: "Next.js\nSQLite\n\n",
  links: "Repository | https://example.com/repo",
  coverImage: "",
  sortOrder: "2",
};

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.insertContent.mockResolvedValue("new-id");
});

it("returns field errors for a missing title and an invalid link URL without saving", async () => {
  const result = await saveProject({
    ...validProject,
    title: "  ",
    links: "Repository | javascript:alert(1)",
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.fieldErrors.title?.[0]).toMatch(/required/i);
  expect(result.fieldErrors.links?.[0]).toMatch(/url/i);
  expect(mocks.insertContent).not.toHaveBeenCalled();
});

it("rejects slugs that are not lowercase words joined by hyphens", async () => {
  const result = await saveProject({ ...validProject, slug: "Engine Notes!" });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.fieldErrors.slug).toBeDefined();
});

it("saves a new project with parsed lists and revalidates public paths", async () => {
  const result = await saveProject(validProject);

  expect(result).toEqual({ ok: true, id: "new-id" });
  expect(mocks.insertContent).toHaveBeenCalledWith("project", {
    title: "Engine Notes",
    slug: "engine-notes",
    summary: "Notes.",
    body: "Body.",
    role: null,
    technologies: ["Next.js", "SQLite"],
    links: [{ label: "Repository", href: "https://example.com/repo" }],
    coverImage: null,
    sortOrder: 2,
  });
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects/engine-notes");
});

it("updates an existing project when an id is supplied", async () => {
  mocks.updateContent.mockResolvedValue({ id: "p1", slug: "engine-notes" });

  await expect(saveProject({ ...validProject, id: "p1" })).resolves.toEqual({
    ok: true,
    id: "p1",
  });
  expect(mocks.updateContent).toHaveBeenCalledWith(
    "project",
    "p1",
    expect.objectContaining({ title: "Engine Notes", updatedAt: expect.any(Date) }),
  );
});

it("reports a duplicate slug as a field error", async () => {
  mocks.insertContent.mockRejectedValue(
    Object.assign(new Error("UNIQUE constraint failed: project.slug"), {
      code: "SQLITE_CONSTRAINT_UNIQUE",
    }),
  );

  const result = await saveProject(validProject);

  expect(result).toEqual({
    ok: false,
    fieldErrors: { slug: ["Another project already uses this slug."] },
  });
});

it("publishing and unpublishing a project revalidates its public page", async () => {
  mocks.setContentPublicationState.mockResolvedValue({ id: "p1", slug: "engine-notes" });

  await publishProject("p1");
  expect(mocks.setContentPublicationState).toHaveBeenCalledWith("project", "p1", "published");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/projects/engine-notes");

  await unpublishProject("p1");
  expect(mocks.setContentPublicationState).toHaveBeenLastCalledWith("project", "p1", "draft");
});

it("throws when publishing content that does not exist", async () => {
  mocks.setContentPublicationState.mockResolvedValue(undefined);

  await expect(publishProject("missing")).rejects.toThrow(/not found/i);
});

it("validates experience dates and keeps highlights as a list", async () => {
  const bad = await saveExperience({
    employer: "Co", title: "Dev", startDate: "May 2026", endDate: "",
    description: "Did things.", highlights: "", sortOrder: "0",
  });
  expect(bad.ok).toBe(false);

  await saveExperience({
    employer: "Co", title: "Dev", startDate: "2026-05-01", endDate: "",
    description: "Did things.", highlights: "One\nTwo", sortOrder: "0",
  });
  expect(mocks.insertContent).toHaveBeenCalledWith(
    "experience",
    expect.objectContaining({ startDate: "2026-05-01", endDate: null, highlights: ["One", "Two"] }),
  );
});

it("rejects an end date before the start date", async () => {
  const result = await saveExperience({
    employer: "Co", title: "Dev", startDate: "2026-05-01", endDate: "2025-01-01",
    description: "Did things.", highlights: "", sortOrder: "0",
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.fieldErrors.endDate).toBeDefined();
});

it("updates the single existing profile instead of creating a second one", async () => {
  mocks.getProfileRow.mockResolvedValue({ id: "profile-1" });
  mocks.updateContent.mockResolvedValue({ id: "profile-1" });

  await saveProfile({
    name: "Ada", headline: "Analyst", summary: "Summary.", location: "", availability: "",
  });

  expect(mocks.insertContent).not.toHaveBeenCalled();
  expect(mocks.updateContent).toHaveBeenCalledWith(
    "profile",
    "profile-1",
    expect.objectContaining({ name: "Ada", location: null }),
  );
});

it("deletes content and revalidates", async () => {
  mocks.deleteContentRow.mockResolvedValue({ id: "s1" });

  await deleteContent("skill", "s1");

  expect(mocks.deleteContentRow).toHaveBeenCalledWith("skill", "s1");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
});
