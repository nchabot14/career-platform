// @vitest-environment node

import "@/tests/integration/test-database";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { GET } from "@/app/api/health/route";

afterEach(() => {
  vi.restoreAllMocks();
});

it("returns 200 ok when the database answers", async () => {
  const response = await GET();

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 degraded without error details when the database fails", async () => {
  vi.spyOn(db, "execute").mockRejectedValue(
    new Error("connect ECONNREFUSED postgres://app:secret-password@db.internal:5432/railway"),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET();

  expect(response.status).toBe(503);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ status: "degraded" });
  expect(text).not.toContain("secret");
});
