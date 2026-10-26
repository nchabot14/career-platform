// @vitest-environment node

import "@/tests/integration/test-database";
import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { databaseIsReachable } from "@/lib/db/health";

afterEach(() => {
  vi.restoreAllMocks();
});

it("is true when the database answers", async () => {
  expect(await databaseIsReachable()).toBe(true);
});

it("is false when the query fails", async () => {
  vi.spyOn(db, "execute").mockRejectedValue(new Error("connect ECONNREFUSED"));

  expect(await databaseIsReachable()).toBe(false);
});

it("is false when the database doesn't answer in time", async () => {
  vi.spyOn(db, "execute").mockReturnValue(new Promise(() => {}) as never);

  expect(await databaseIsReachable(50)).toBe(false);
});
