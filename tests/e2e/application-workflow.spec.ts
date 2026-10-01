import { expect, test } from "@playwright/test";

for (const path of ["/admin/applications", "/admin/applications/new", "/admin/applications/some-id"]) {
  test(`unauthenticated visit to ${path} ends at /login`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/login$/);
  });
}

test("unauthenticated document downloads end at /login", async ({ request }) => {
  const response = await request.get("/admin/applications/a1/documents/d1", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toMatch(/\/login$/);
});
