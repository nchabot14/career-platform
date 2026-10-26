import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PublicProfilePage } from "@/lib/services/public-profile";

const { getPublicProfilePageMock } = vi.hoisted(() => ({
  getPublicProfilePageMock: vi.fn<() => Promise<PublicProfilePage>>(),
}));

vi.mock("@/lib/services/public-profile", () => ({
  getPublicProfilePage: getPublicProfilePageMock,
}));

import HomePage, { generateMetadata } from "@/app/(public)/page";

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

// Braces matter: a function returned from beforeEach runs as its cleanup.
beforeEach(() => {
  getPublicProfilePageMock.mockResolvedValue(page);
});
// Unmount, not just clear the DOM: React work left scheduled on a mounted tree
// can run after jsdom is torn down and fail the run with "window is not defined".
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

it("always shows a LinkedIn button that opens the owner's profile in a new tab", async () => {
  getPublicProfilePageMock.mockResolvedValue({ ...page, socialLinks: [], resume: null });

  render(await HomePage());

  const link = screen.getByRole("link", { name: "LinkedIn (opens in new tab)" });
  expect(link).toHaveAttribute("href", "https://www.linkedin.com/in/nicholas-chabot-309527348/");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringMatching(/noopener/));
  expect(link).toHaveAttribute("rel", expect.stringMatching(/noreferrer/));
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

it("links each published section from the section menu", async () => {
  render(await HomePage());

  const menu = screen.getByRole("navigation", { name: /resume sections/i });
  const links = within(menu).getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "#experience", "#projects", "#skills", "#education", "#contact",
  ]);
  for (const link of links) {
    const id = link.getAttribute("href")!.slice(1);
    expect(document.getElementById(id)).toHaveAccessibleName(link.textContent!);
  }
});

it("leaves unpublished sections out of the section menu", async () => {
  getPublicProfilePageMock.mockResolvedValue({ ...page, experience: [], skills: [] });

  render(await HomePage());

  const menu = screen.getByRole("navigation", { name: /resume sections/i });
  expect(within(menu).queryByRole("link", { name: "Experience" })).not.toBeInTheDocument();
  expect(within(menu).queryByRole("link", { name: "Skills" })).not.toBeInTheDocument();
});

it("says so when no projects are published, instead of hiding the section", async () => {
  getPublicProfilePageMock.mockResolvedValue({ ...page, projects: [] });

  render(await HomePage());

  const projects = screen.getByRole("region", { name: "Projects" });
  expect(within(projects).getByText("No projects published yet.")).toBeVisible();
});

it("keeps the profile and says projects are unavailable when the database fails", async () => {
  getPublicProfilePageMock.mockImplementation(async () => {
    throw new Error("connect ECONNREFUSED");
  });
  vi.spyOn(console, "error").mockImplementation(() => {});

  render(await HomePage());

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nicholas Chabot");
  expect(screen.getByText(/Loyola Marymount University with strong analytical/)).toBeVisible();
  expect(screen.getByRole("link", { name: "LinkedIn (opens in new tab)" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Loyola Marymount University" })).toBeVisible();
  const projects = screen.getByRole("region", { name: "Projects" });
  expect(within(projects).getByText("Projects temporarily unavailable.")).toBeVisible();
  expect(within(projects).queryAllByRole("link")).toHaveLength(0);
  expect(screen.queryByText("connect ECONNREFUSED")).not.toBeInTheDocument();
});

it("builds page metadata from the fallback profile when the database fails", async () => {
  getPublicProfilePageMock.mockImplementation(async () => {
    throw new Error("connect ECONNREFUSED");
  });
  vi.spyOn(console, "error").mockImplementation(() => {});

  const metadata = await generateMetadata();

  expect(metadata.title).toMatch(/^Nicholas Chabot/);
});

it("lists direct email and phone contact details beside the form", async () => {
  render(await HomePage());

  const contact = screen.getByRole("region", { name: "Contact" });
  expect(within(contact).getByRole("link", { name: "nchabot14@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:nchabot14@gmail.com",
  );
  expect(within(contact).getByRole("link", { name: "626-695-8932" })).toHaveAttribute(
    "href",
    "tel:+16266958932",
  );
  expect(within(contact).getByRole("button", { name: /send message/i })).toBeVisible();
});
