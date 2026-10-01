import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

it("keeps the header navigation limited to implemented routes", () => {
  render(<SiteHeader />);

  expect(screen.getByRole("link", { name: /^home$/i })).toBeVisible();
  expect(screen.queryByRole("link", { name: /^resume$/i })).not.toBeInTheDocument();
});

it("hydrates the footer year without a recoverable mismatch", async () => {
  vi.useFakeTimers();
  // Local-time dates: getFullYear() reads the local zone, so UTC instants
  // would land in a different year west of Greenwich.
  vi.setSystemTime(new Date(2025, 11, 31, 23, 59, 59));

  const serverHtml = renderToString(<SiteFooter initialYear={2025} />);
  const container = document.createElement("div");
  container.innerHTML = serverHtml;
  document.body.append(container);

  vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));

  const recoverableErrors: string[] = [];

  let root: ReturnType<typeof hydrateRoot> | null = null;

  await act(async () => {
    root = hydrateRoot(container, <SiteFooter initialYear={2025} />, {
      onRecoverableError(error) {
        const message = error instanceof Error ? error.message : String(error);
        recoverableErrors.push(message);
      },
    });
  });

  expect(serverHtml).toContain("© <time dateTime=\"2025\">2025</time> Career Platform");
  expect(container).toHaveTextContent("© 2026 Career Platform");
  expect(recoverableErrors).toHaveLength(0);

  await act(async () => {
    root?.unmount();
  });
});
