// @vitest-environment node

import { expect, it } from "vitest";
import { createRateLimiter, hashRequestKey } from "@/lib/security/rate-limit";

it("frees capacity once requests age out of the window", () => {
  let now = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });

  expect(limiter.take("k")).toBe(true);
  expect(limiter.take("k")).toBe(true);
  expect(limiter.take("k")).toBe(false);

  now = 1001;
  expect(limiter.take("k")).toBe(true);
});

it("hashes IP addresses so raw IPs are never stored", () => {
  const key = hashRequestKey("203.0.113.9", "secret");

  expect(key).toMatch(/^[0-9a-f]{64}$/);
  expect(key).not.toContain("203.0.113.9");
  expect(hashRequestKey("203.0.113.9", "secret")).toBe(key);
  expect(hashRequestKey("203.0.113.9", "other")).not.toBe(key);
});
