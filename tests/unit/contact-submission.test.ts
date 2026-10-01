// @vitest-environment node

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContactMessage: vi.fn(),
  setContactNotificationStatus: vi.fn(),
  sendContactNotification: vi.fn(),
  calls: [] as string[],
}));

vi.mock("@/lib/db/repositories/contact-messages", () => ({
  createContactMessage: mocks.createContactMessage,
  setContactNotificationStatus: mocks.setContactNotificationStatus,
}));
vi.mock("@/lib/email/contact-notification", () => ({
  sendContactNotification: mocks.sendContactNotification,
}));

import { submitContactMessage } from "@/lib/services/contact-submission";
import { resetContactRateLimiter } from "@/lib/security/rate-limit";

const valid = {
  name: "Grace Hopper",
  email: "grace@example.com",
  subject: "Opportunity",
  message: "Would you like to talk about a role?",
};

beforeEach(() => {
  resetContactRateLimiter();
  mocks.calls.length = 0;
  mocks.createContactMessage.mockReset().mockImplementation(async (row) => {
    mocks.calls.push("persist");
    return { id: "m1", ...row };
  });
  mocks.sendContactNotification.mockReset().mockImplementation(async () => {
    mocks.calls.push("notify");
  });
  mocks.setContactNotificationStatus.mockReset();
});

it("returns field errors for blank or invalid fields without saving", async () => {
  const result = await submitContactMessage(
    { name: " ", email: "not-an-email", subject: "", message: "" },
    "key-a",
  );

  expect(result.ok).toBe(false);
  if (result.ok || result.reason !== "validation") throw new Error("expected validation failure");
  expect(Object.keys(result.fieldErrors).sort()).toEqual(["email", "message", "name", "subject"]);
  expect(mocks.createContactMessage).not.toHaveBeenCalled();
});

it("persists the message before sending the notification and reports it sent", async () => {
  const result = await submitContactMessage(valid, "key-a");

  expect(result).toEqual({ ok: true, id: "m1", notificationStatus: "sent" });
  expect(mocks.calls).toEqual(["persist", "notify"]);
  expect(mocks.createContactMessage).toHaveBeenCalledWith({
    senderName: "Grace Hopper",
    senderEmail: "grace@example.com",
    subject: "Opportunity",
    message: "Would you like to talk about a role?",
    notificationStatus: "pending",
  });
  expect(mocks.setContactNotificationStatus).toHaveBeenCalledWith("m1", "sent");
});

it("keeps the message and reports a failed notification when the email adapter throws", async () => {
  mocks.sendContactNotification.mockRejectedValue(new Error("provider exploded: secret detail"));

  const result = await submitContactMessage(valid, "key-a");

  expect(result).toEqual({ ok: true, id: "m1", notificationStatus: "failed" });
  expect(mocks.setContactNotificationStatus).toHaveBeenCalledWith("m1", "failed");
});

it("allows five requests per key per hour and rejects the sixth", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await submitContactMessage(valid, "key-a")).ok).toBe(true);
  }

  const sixth = await submitContactMessage(valid, "key-a");
  expect(sixth).toEqual({ ok: false, reason: "rate_limited" });
  expect(mocks.createContactMessage).toHaveBeenCalledTimes(5);

  expect((await submitContactMessage(valid, "key-b")).ok).toBe(true);
});
