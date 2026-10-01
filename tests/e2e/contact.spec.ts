import { expect, test } from "@playwright/test";

test("the contact form reports field errors, then saves a valid message", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Subject").fill("Hello");
  await page.getByLabel("Message").fill("Interested in your work.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Email").fill("grace@example.com");
  await page.getByRole("button", { name: "Send message" }).click();

  // No email provider is configured in the e2e environment, so the message is
  // saved and the visitor is told the alert email didn't go out.
  await expect(page.getByRole("status")).toContainText("your message was saved");
  await expect(page.getByLabel("Name")).toHaveValue("");
});
