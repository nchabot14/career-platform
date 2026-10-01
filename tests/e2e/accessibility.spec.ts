import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { name: "home page and contact form", path: "/" },
  { name: "project page", path: "/projects/engine-notes" },
  { name: "login page", path: "/login" },
];

for (const { name, path } of pages) {
  test(`${name} has no serious automatically detected accessibility violations`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);

    expect(serious).toEqual([]);
  });
}

test("the contact form is reachable and has labelled fields", async ({ page }) => {
  await page.goto("/#contact");

  for (const label of ["Name", "Email", "Subject", "Message"]) {
    await expect(page.getByLabel(label)).toBeVisible();
  }
});

test("security headers are sent", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("the health check reports ok", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
