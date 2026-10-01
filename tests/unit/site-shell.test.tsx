import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

it("renders a recruiter-oriented resume call to action", () => {
  render(<Home />);

  expect(screen.getByRole("link", { name: /view resume/i })).toBeVisible();
});

it("keeps the header navigation limited to implemented routes", () => {
  render(<SiteHeader />);

  expect(screen.getByRole("link", { name: /^home$/i })).toBeVisible();
  expect(screen.queryByRole("link", { name: /^resume$/i })).not.toBeInTheDocument();
});

it("hydrates the footer year without a recoverable mismatch", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-12-31T23:59:59Z"));

  const serverHtml = renderToString(<SiteFooter initialYear={2025} />);
  const container = document.createElement("div");
  container.innerHTML = serverHtml;
  document.body.append(container);

  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

  const recoverableErrors: string[] = [];

  await act(async () => {
    hydrateRoot(container, <SiteFooter initialYear={2025} />, {
      onRecoverableError(error) {
        const message = error instanceof Error ? error.message : String(error);
        recoverableErrors.push(message);
      },
    });
  });

  expect(serverHtml).toContain("© <time dateTime=\"2025\">2025</time> Career Platform");
  expect(container).toHaveTextContent("© 2026 Career Platform");
  expect(recoverableErrors).toHaveLength(0);
});
