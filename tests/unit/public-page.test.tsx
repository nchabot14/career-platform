import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PublicProfilePage } from "@/lib/services/public-profile";

const { getPublicProfilePageMock } = vi.hoisted(() => ({
  getPublicProfilePageMock: vi.fn<() => Promise<PublicProfilePage>>(),
}));

vi.mock("@/lib/services/public-profile", () => ({
  getPublicProfilePage: getPublicProfilePageMock,
}));

import HomePage from "@/app/(public)/page";

const now = new Date("2026-01-01T00:00:00Z");
const page: PublicProfilePage = {
  profile: {
    id: "p1", name: "Ada Lovelace", headline: "Analyst", summary: "Writes notes.",
    location: "London", availability: "Open to roles", visibility: "public",
    publicationState: "published", createdAt: now, updatedAt: now,
  },
  experience: [{
    id: "e1", employer: "Engines Ltd", title: "Programmer", startDate: "1842-01-01",
    endDate: null, description: "Wrote the first program.", highlights: ["Note G"],
    sortOrder: 0, publicationState: "published", createdAt: now, updatedAt: now,
  }],
  education: [{
    id: "d1", institution: "Home School", credential: "Tutored", fieldOfStudy: "Mathematics",
    startDate: null, endDate: null, sortOrder: 0, publicationState: "published",
    createdAt: now, updatedAt: now,
  }],
  skills: [{
    id: "s1", name: "Mathematics", category: "Analysis", proficiencyOrContext: "Expert",
    certificationDetails: null, sortOrder: 0, publicationState: "published",
    createdAt: now, updatedAt: now,
  }],
  socialLinks: [{
    id: "l1", label: "LinkedIn", url: "https://example.com/ada", icon: null, sortOrder: 0,
    publicationState: "published", createdAt: now, updatedAt: now,
  }],
  projects: [{
    id: "pr1", title: "Analytical Engine Notes", slug: "engine-notes", summary: "Notes.",
    body: "Body", role: "Author", technologies: ["Punch cards"], links: [], coverImage: null,
    sortOrder: 0, publicationState: "published", createdAt: now, updatedAt: now,
  }],
  resume: { filename: "ada-lovelace-resume.pdf" },
};

beforeEach(() => getPublicProfilePageMock.mockResolvedValue(page));
afterEach(() => { document.body.innerHTML = ""; });

it("renders the profile name as the only h1 and every published section", async () => {
  render(await HomePage());

  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ada Lovelace");
  expect(screen.getByText("Analyst")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Experience" })).toBeVisible();
  expect(screen.getByText(/Engines Ltd/)).toBeVisible();
  expect(screen.getByText("Note G")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Education" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Skills" })).toBeVisible();
  expect(screen.getByRole("link", { name: /analytical engine notes/i })).toHaveAttribute(
    "href",
    "/projects/engine-notes",
  );
  expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://example.com/ada",
  );
});

it("shows an accessible Resume PDF link when a resume is published", async () => {
  render(await HomePage());

  const link = screen.getByRole("link", { name: /resume pdf/i });
  expect(link).toHaveAttribute("href", "/resume");
});

it("hides the Resume PDF link when no resume is published", async () => {
  getPublicProfilePageMock.mockResolvedValue({ ...page, resume: null });

  render(await HomePage());

  expect(screen.queryByRole("link", { name: /resume pdf/i })).not.toBeInTheDocument();
});

it("renders a placeholder h1 when no profile is published", async () => {
  getPublicProfilePageMock.mockResolvedValue({ ...page, profile: null });

  render(await HomePage());

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/coming soon/i);
});
