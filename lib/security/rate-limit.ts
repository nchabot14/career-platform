import { createHmac, randomBytes } from "node:crypto";

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

// Sliding-window limiter held in this server process's memory. The app runs
// as a single process on one VM, so a shared store isn't needed; counts
// reset when the process restarts.
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  return {
    take(key: string) {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((time) => current - time < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }

      recent.push(current);
      hits.set(key, recent);
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}

export const CONTACT_LIMIT = 5;
export const CONTACT_WINDOW_SECONDS = 60 * 60;

const contactLimiter = createRateLimiter({
  limit: CONTACT_LIMIT,
  windowMs: CONTACT_WINDOW_SECONDS * 1000,
});

export function takeContactAttempt(requestKey: string) {
  return contactLimiter.take(requestKey);
}

export function resetContactRateLimiter() {
  contactLimiter.reset();
}

// Without RATE_LIMIT_SECRET, a random per-process secret still keeps raw IPs
// out of memory; keys simply stop matching after a restart.
const fallbackSecret = randomBytes(32).toString("hex");

export function hashRequestKey(ip: string, secret = process.env.RATE_LIMIT_SECRET || fallbackSecret) {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
