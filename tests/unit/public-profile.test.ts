// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  getPublishedProfile: vi.fn(),
  listPublishedExperience: vi.fn(),
  listPublishedEducation: vi.fn(),
  listPublishedSkills: vi.fn(),
  listPublishedSocialLinks: vi.fn(),
  listPublishedProjects: vi.fn(),
  getCurrentPublishedResume: vi.fn(),
}));

vi.mock("@/lib/db/repositories/public-content", () => repo);

import {
  getPublicProfilePage,
  resumeDownloadFilename,
} from "@/lib/services/public-profile";

beforeEach(() => {
  for (const fn of Object.values(repo)) fn.mockReset();
  repo.getPublishedProfile.mockResolvedValue({ name: "Ada Lovelace" });
  repo.listPublishedExperience.mockResolvedValue([{ employer: "Engines" }]);
  repo.listPublishedEducation.mockResolvedValue([{ institution: "Home" }]);
  repo.listPublishedSkills.mockResolvedValue([{ name: "Maths" }]);
  repo.listPublishedSocialLinks.mockResolvedValue([{ label: "Site" }]);
  repo.listPublishedProjects.mockResolvedValue([{ slug: "notes" }]);
  repo.getCurrentPublishedResume.mockResolvedValue(undefined);
});

it("combines every published section into one page model", async () => {
  repo.getCurrentPublishedResume.mockResolvedValue({ storageKey: "resumes/a.pdf" });

  await expect(getPublicProfilePage()).resolves.toEqual({
    profile: { name: "Ada Lovelace" },
    experience: [{ employer: "Engines" }],
    education: [{ institution: "Home" }],
    skills: [{ name: "Maths" }],
    socialLinks: [{ label: "Site" }],
    projects: [{ slug: "notes" }],
    resume: { filename: "ada-lovelace-resume.pdf" },
  });
});

it("reports no profile and no resume when nothing is published", async () => {
  repo.getPublishedProfile.mockResolvedValue(undefined);

  const page = await getPublicProfilePage();

  expect(page.profile).toBeNull();
  expect(page.resume).toBeNull();
});

it.each([
  ["Nicholas Chabot", "nicholas-chabot-resume.pdf"],
  ['../Evil"Name\r\nX', "evil-name-x-resume.pdf"],
  ["José Núñez", "jose-nunez-resume.pdf"],
  [undefined, "resume.pdf"],
  ["***", "resume.pdf"],
])("builds a safe download filename from %j", (name, expected) => {
  expect(resumeDownloadFilename(name)).toBe(expected);
});
