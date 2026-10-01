import { expect, test } from "@playwright/test";

test("home page shows only published content with one h1", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ada Lovelace");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText("Analytical Engines Ltd")).toBeVisible();
  await expect(page.getByRole("link", { name: "Engine Notes" })).toBeVisible();
  await expect(page.getByText("Secret Draft")).toHaveCount(0);
  await expect(page).toHaveTitle(/Ada Lovelace/);
});

test("keyboard focus reaches the Resume PDF link", async ({ page }) => {
  await page.goto("/");
  const resumeLink = page.getByRole("link", { name: "Resume PDF" });
  await expect(resumeLink).toBeVisible();

  for (let presses = 0; presses < 15; presses += 1) {
    await page.keyboard.press("Tab");
    if (await resumeLink.evaluate((element) => element === document.activeElement)) break;
  }

  await expect(resumeLink).toBeFocused();
});

test("the Resume PDF link downloads a PDF attachment", async ({ request }) => {
  const response = await request.get("/resume");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(response.headers()["content-disposition"]).toBe(
    'attachment; filename="ada-lovelace-resume.pdf"',
  );
  expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("published projects have pages and drafts return 404", async ({ page }) => {
  await page.goto("/projects/engine-notes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engine Notes");
  await expect(page.getByRole("listitem").filter({ hasText: "Second point" })).toBeVisible();

  const draft = await page.goto("/projects/secret-draft");
  expect(draft?.status()).toBe(404);
});

test("robots.txt blocks admin and API routes, and the sitemap lists published pages", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Disallow: /api");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/projects/engine-notes");
  expect(sitemap).not.toContain("secret-draft");
});
