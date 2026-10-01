// @vitest-environment node

import "@/tests/integration/test-database";
import { expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import {
  getPublishedProjectBySlug,
  listPublishedProjects,
} from "@/lib/db/repositories/public-content";

it("lists only published projects in sort order and resolves published project slugs", async () => {
  await db.insert(projects).values([
    {
      title: "Draft case study",
      slug: "draft-case-study",
      summary: "Draft summary",
      body: "Draft body",
      role: "Author",
      technologies: ["Next.js"],
      links: [{ label: "Preview", href: "https://example.com/draft" }],
      coverImage: "draft.png",
      sortOrder: 0,
      publicationState: "draft",
    },
    {
      title: "Stable resume search",
      slug: "stable-search",
      summary: "Published summary",
      body: "Published body",
      role: "Engineer",
      technologies: ["PostgreSQL"],
      links: [{ label: "Case study", href: "https://example.com/stable" }],
      coverImage: "stable.png",
      sortOrder: 2,
      publicationState: "published",
    },
    {
      title: "Accessible search",
      slug: "accessible-search",
      summary: "Accessible summary",
      body: "Accessible body",
      role: "Lead engineer",
      technologies: ["Next.js", "TypeScript"],
      links: [{ label: "Repository", href: "https://example.com/accessible-search" }],
      coverImage: "accessible-search.png",
      sortOrder: 1,
      publicationState: "published",
    },
  ]);

  expect(await listPublishedProjects()).toEqual([
    expect.objectContaining({
      slug: "accessible-search",
      publicationState: "published",
      sortOrder: 1,
    }),
    expect.objectContaining({
      slug: "stable-search",
      publicationState: "published",
      sortOrder: 2,
    }),
  ]);

  expect(await getPublishedProjectBySlug("draft-case-study")).toBeUndefined();
  expect(await getPublishedProjectBySlug("accessible-search")).toEqual(
    expect.objectContaining({
      slug: "accessible-search",
      publicationState: "published",
    }),
  );
});
