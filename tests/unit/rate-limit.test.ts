// @vitest-environment node

import { expect, it } from "vitest";
import { clientIp, createRateLimiter, hashRequestKey } from "@/lib/security/rate-limit";

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

it("prefers X-Real-IP, which the proxy overwrites", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 203.0.113.9" });

  expect(clientIp(headers)).toBe("203.0.113.9");
});

it("a forged X-Forwarded-For can't change the key when X-Real-IP is set", () => {
  const first = clientIp(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }));
  const second = clientIp(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "2.2.2.2" }));

  expect(first).toBe(second);
});

it("falls back to the first X-Forwarded-For entry", () => {
  expect(clientIp(new Headers({ "x-forwarded-for": " 198.51.100.7 , 10.0.0.1" }))).toBe("198.51.100.7");
});

it("returns unknown without either header", () => {
  expect(clientIp(new Headers())).toBe("unknown");
});
