// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const { databaseIsReachableMock } = vi.hoisted(() => ({
  databaseIsReachableMock: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@/lib/db/health", () => ({ databaseIsReachable: databaseIsReachableMock }));

import { proxy } from "@/proxy";

const request = (method = "GET") => new NextRequest("http://localhost:8080/", { method });

beforeEach(() => {
  databaseIsReachableMock.mockReset();
});

it("lets the homepage render normally when the database answers", async () => {
  databaseIsReachableMock.mockResolvedValue(true);

  const response = await proxy(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("x-middleware-next")).toBe("1");
});

it("marks the homepage 503 when the database doesn't answer, and still renders it", async () => {
  databaseIsReachableMock.mockResolvedValue(false);

  const response = await proxy(request());

  expect(response.status).toBe(503);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("checks the database again on every request, so a refresh recovers without a restart", async () => {
  databaseIsReachableMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

  expect((await proxy(request())).status).toBe(503);
  expect((await proxy(request())).status).toBe(200);
});

it("doesn't check the database for form posts to the homepage", async () => {
  const response = await proxy(request("POST"));

  expect(databaseIsReachableMock).not.toHaveBeenCalled();
  expect(response.headers.get("x-middleware-next")).toBe("1");
});
