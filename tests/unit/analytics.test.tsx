import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("next/script", () => ({
  default: (props: Record<string, string>) => <script data-testid="umami" {...props} />,
}));

import { Analytics, GoogleAnalytics } from "@/components/analytics";

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

it("renders no Google tag unless a valid measurement id is configured", () => {
  for (const id of ["", "G-ABC'); alert(1); //"]) {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", id);

    const { container, unmount } = render(<GoogleAnalytics />);

    expect(container.querySelector("script")).toBeNull();
    unmount();
  }
});

it("sets consent to denied by default before configuring the Google tag", () => {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-JTFJE8DS7S");

  const { container } = render(<GoogleAnalytics />);
  const [inline, external] = Array.from(container.querySelectorAll("script"));
  const code = inline.textContent ?? "";

  expect(external.getAttribute("src")).toBe("https://www.googletagmanager.com/gtag/js?id=G-JTFJE8DS7S");
  expect(code).toContain('analytics_storage: granted ? "granted" : "denied"');
  expect(code).toContain('ad_storage: "denied"');
  expect(code.indexOf('gtag("consent", "default"')).toBeLessThan(code.indexOf('gtag("config", "G-JTFJE8DS7S")'));
});
