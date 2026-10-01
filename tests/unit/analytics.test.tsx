import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/script", () => ({
  default: (props: Record<string, string>) => <script data-testid="umami" {...props} />,
}));

import { Analytics } from "@/components/analytics";

afterEach(() => {
  vi.unstubAllEnvs();
  document.body.innerHTML = "";
});

it("renders nothing unless both Umami settings are configured", () => {
  vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "site-123");
  vi.stubEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL", "");

  const { container } = render(<Analytics />);

  expect(container.querySelector("script")).toBeNull();
});

it("loads the Umami script with the website id when configured", () => {
  vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "site-123");
  vi.stubEnv("NEXT_PUBLIC_UMAMI_SCRIPT_URL", "https://cloud.umami.is/script.js");

  const { container } = render(<Analytics />);
  const script = container.querySelector("script");

  expect(script?.getAttribute("src")).toBe("https://cloud.umami.is/script.js");
  expect(script?.getAttribute("data-website-id")).toBe("site-123");
});
