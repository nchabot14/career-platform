// @vitest-environment node

import { afterEach, expect, it, vi } from "vitest";
import { logServerError } from "@/lib/observability/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

function captureLog() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => JSON.parse(String(spy.mock.calls[0][0]));
}

it("writes one structured JSON line with the event, error name, and context", () => {
  const read = captureLog();

  logServerError("contact_notification_failed", new TypeError("boom"), { messageId: "m1" });

  expect(read()).toEqual(
    expect.objectContaining({
      level: "error",
      event: "contact_notification_failed",
      error: { name: "TypeError", message: "boom" },
      context: { messageId: "m1" },
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    }),
  );
});

it("removes secrets and personal data from messages and context", () => {
  const read = captureLog();

  logServerError(
    "upload_failed",
    new Error("Bearer abc.def.ghi failed for ada@example.com using key re_123456789abcdef and sk_live_9999"),
    { email: "grace@example.com", note: "token=hunter2&x=1", password: "pw", apiKey: "k" },
  );

  const line = JSON.stringify(read());
  for (const leaked of ["abc.def.ghi", "ada@example.com", "re_123456789abcdef", "sk_live_9999", "grace@example.com", "hunter2", '"pw"', '"k"']) {
    expect(line).not.toContain(leaked);
  }
  expect(line).toContain("[redacted]");
});

it("handles non-Error values", () => {
  const read = captureLog();

  logServerError("odd", "plain string with bob@example.com", {});

  expect(read().error).toEqual({ name: "NonError", message: "plain string with [redacted-email]" });
});
