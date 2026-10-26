// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}));

import { GET } from "@/app/auth/callback/route";
import { proxy } from "@/proxy";

// Behind a TLS-terminating proxy the app sees its own internal address,
// while the visitor is on the public site.
const behindProxy = (path: string) =>
  new NextRequest(`http://localhost:8080${path}`, {
    headers: { host: "nickchabot.com", "x-forwarded-proto": "https", "x-forwarded-host": "evil.example" },
  });

beforeEach(() => {
  mocks.exchangeCodeForSession.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nickchabot.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("OWNER_EMAIL", "owner@example.com");
});

it("callback without a code returns to the site's login page", async () => {
  const response = await GET(behindProxy("/auth/callback"));

  expect(response.headers.get("location")).toBe("https://nickchabot.com/login?error=callback");
});

it("callback with a rejected code returns to the site's login page", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error("bad") });

  const response = await GET(behindProxy("/auth/callback?code=c"));

  expect(response.headers.get("location")).toBe("https://nickchabot.com/login?error=callback");
});

it("successful callback lands on the requested admin page", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });

  const response = await GET(behindProxy("/auth/callback?code=c&next=/admin/messages"));

  expect(response.headers.get("location")).toBe("https://nickchabot.com/admin/messages");
});

it("callback never redirects off-site", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });

  const response = await GET(behindProxy("/auth/callback?code=c&next=//evil.example/x"));

  expect(response.headers.get("location")).toBe("https://nickchabot.com/admin");
});

it("proxy sends signed-out visitors to the site's login page", async () => {
  const response = await proxy(behindProxy("/admin"));

  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://nickchabot.com/login");
});
