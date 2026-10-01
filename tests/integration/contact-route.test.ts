// @vitest-environment node

import "@/tests/integration/test-database";
import { beforeEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { contactMessages } from "@/lib/db/schema";
import { resetContactRateLimiter } from "@/lib/security/rate-limit";

const { sendContactNotification } = vi.hoisted(() => ({ sendContactNotification: vi.fn() }));
vi.mock("@/lib/email/contact-notification", () => ({ sendContactNotification }));

import { POST } from "@/app/api/contact/route";

const valid = {
  name: "Grace Hopper",
  email: "grace@example.com",
  subject: "Opportunity",
  message: "Would you like to talk?",
};

function post(body: unknown, ip = "198.51.100.7") {
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetContactRateLimiter();
  sendContactNotification.mockReset().mockResolvedValue(undefined);
});

it("returns 422 with field errors for blank fields", async () => {
  const response = await post({ name: "", email: "", subject: "", message: "" });

  expect(response.status).toBe(422);
  expect((await response.json()).fieldErrors).toHaveProperty("email");
});

it("returns 400 for a body that is not JSON", async () => {
  expect((await post("{not json")).status).toBe(400);
});

it("saves a valid message, notifies the owner, and returns 201", async () => {
  const response = await post(valid);

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.notificationStatus).toBe("sent");

  const [row] = await db.select().from(contactMessages);
  expect(row).toEqual(
    expect.objectContaining({ id: body.id, senderEmail: "grace@example.com", notificationStatus: "sent" }),
  );
  expect(sendContactNotification).toHaveBeenCalledTimes(1);
});

it("keeps the message and returns 202 without provider details when email fails", async () => {
  sendContactNotification.mockRejectedValue(new Error("Resend 500: internal key sk_live_123"));

  const response = await post(valid);

  expect(response.status).toBe(202);
  const text = await response.text();
  expect(text).not.toContain("sk_live_123");
  expect(text).not.toContain("Resend");
  expect(JSON.parse(text).notificationStatus).toBe("failed");

  const [row] = await db.select().from(contactMessages);
  expect(row.notificationStatus).toBe("failed");
});

it("returns 429 after five requests from one IP in an hour", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await post(valid)).status).toBe(201);
  }

  const limited = await post(valid);
  expect(limited.status).toBe(429);
  expect(limited.headers.get("retry-after")).toBe("3600");
  expect((await post(valid, "192.0.2.44")).status).toBe(201);
});
