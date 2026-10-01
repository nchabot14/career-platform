// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentPublishedResume: vi.fn(),
  getPublishedProfile: vi.fn(),
  listPublishedProjects: vi.fn(),
  readStoredFile: vi.fn(),
}));

vi.mock("@/lib/db/repositories/public-content", () => ({
  getCurrentPublishedResume: mocks.getCurrentPublishedResume,
  getPublishedProfile: mocks.getPublishedProfile,
  listPublishedProjects: mocks.listPublishedProjects,
}));
vi.mock("@/lib/storage/files", () => ({ readStoredFile: mocks.readStoredFile }));

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as getResume } from "@/app/resume/route";

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
});

it("blocks admin and API routes in robots.txt and links the sitemap", () => {
  const rules = robots();

  expect(rules.rules).toEqual(
    expect.objectContaining({ disallow: expect.arrayContaining(["/admin", "/api"]) }),
  );
  expect(rules.sitemap).toBe("https://example.com/sitemap.xml");
});

it("lists the home page and only published projects in the sitemap", async () => {
  mocks.listPublishedProjects.mockResolvedValue([
    { slug: "alpha", updatedAt: new Date("2026-01-02T00:00:00Z") },
  ]);

  const entries = await sitemap();

  expect(entries.map((entry) => entry.url)).toEqual([
    "https://example.com/",
    "https://example.com/projects/alpha",
  ]);
});

it("returns 404 from /resume when no current resume is published", async () => {
  mocks.getCurrentPublishedResume.mockResolvedValue(undefined);

  const response = await getResume();

  expect(response.status).toBe(404);
});

it("returns 404 from /resume when the stored file is missing", async () => {
  mocks.getCurrentPublishedResume.mockResolvedValue({ storageKey: "resumes/a.pdf" });
  mocks.getPublishedProfile.mockResolvedValue({ name: "Ada Lovelace" });
  mocks.readStoredFile.mockResolvedValue(null);

  expect((await getResume()).status).toBe(404);
});

it("serves the current resume as a PDF attachment with a safe filename", async () => {
  mocks.getCurrentPublishedResume.mockResolvedValue({ storageKey: "resumes/a.pdf" });
  mocks.getPublishedProfile.mockResolvedValue({ name: 'Ada "Countess" Lovelace' });
  mocks.readStoredFile.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));

  const response = await getResume();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toBe(
    'attachment; filename="ada-countess-lovelace-resume.pdf"',
  );
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array([37, 80, 68, 70]),
  );
});
