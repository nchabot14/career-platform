import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUserMock, redirectMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/server", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

import { OwnerAuthorizationError, requireOwner } from "@/lib/auth/owner";

describe("requireOwner", () => {
  const originalOwnerEmail = process.env.OWNER_EMAIL;

  beforeEach(() => {
    process.env.OWNER_EMAIL = "owner@example.com";
    getAuthenticatedUserMock.mockReset();
    redirectMock.mockClear();
  });

  afterEach(() => {
    process.env.OWNER_EMAIL = originalOwnerEmail;
  });

  it("redirects unauthenticated requests to the login page", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);

    await expect(requireOwner()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("rejects authenticated users whose email is not the owner email", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "user-123",
      email: "someone@example.com",
    });

    await expect(requireOwner()).rejects.toMatchObject({
      code: "OWNER_FORBIDDEN",
      status: 403,
    } satisfies Pick<OwnerAuthorizationError, "code" | "status">);
  });

  it("returns the validated owner identity for the configured owner email", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      id: "owner-123",
      email: "OWNER@example.com",
    });

    await expect(requireOwner()).resolves.toEqual({
      id: "owner-123",
      email: "owner@example.com",
    });
  });
});
