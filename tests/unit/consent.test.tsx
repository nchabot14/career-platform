import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConsentBanner, ReopenConsentButton } from "@/components/consent-banner";
import { CONSENT_STORAGE_KEY, resetConsentForTests, saveConsent } from "@/lib/consent";

const gtag = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  resetConsentForTests();
  gtag.mockReset();
  Object.assign(window, { gtag });
});

afterEach(() => {
  document.body.innerHTML = "";
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0].trim()}=; Max-Age=0; path=/`;
  }
});

it("asks for a choice when none is stored, with a link to the privacy page", () => {
  render(<ConsentBanner />);

  expect(screen.getByRole("region", { name: /cookie choice/i })).toBeVisible();
  expect(screen.getByRole("link", { name: /privacy page/i })).toHaveAttribute("href", "/privacy");
});

it("stays hidden once a choice is stored", () => {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, "denied");

  render(<ConsentBanner />);

  expect(screen.queryByRole("region", { name: /cookie choice/i })).not.toBeInTheDocument();
});

it("grants analytics storage and remembers the choice on Accept", () => {
  render(<ConsentBanner />);

  fireEvent.click(screen.getByRole("button", { name: /accept/i }));

  expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "granted" });
  expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
  expect(screen.queryByRole("region", { name: /cookie choice/i })).not.toBeInTheDocument();
});

it("denies analytics storage and removes Google Analytics cookies on Decline", () => {
  document.cookie = "_ga=GA1.1.123; path=/";
  document.cookie = "_ga_JTFJE8DS7S=GS1.1.456; path=/";
  document.cookie = "other=keep; path=/";

  render(<ConsentBanner />);
  fireEvent.click(screen.getByRole("button", { name: /decline/i }));

  expect(gtag).toHaveBeenCalledWith("consent", "update", { analytics_storage: "denied" });
  expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
  expect(document.cookie).not.toMatch(/_ga/);
  expect(document.cookie).toContain("other=keep");
});

it("reopens the banner from the privacy page button", () => {
  render(
    <>
      <ConsentBanner />
      <ReopenConsentButton />
    </>,
  );
  act(() => saveConsent("granted"));
  expect(screen.queryByRole("region", { name: /cookie choice/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /change your cookie choice/i }));

  expect(screen.getByRole("region", { name: /cookie choice/i })).toBeVisible();
});

it("still hides the banner for this visit when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });

  render(<ConsentBanner />);
  fireEvent.click(screen.getByRole("button", { name: /decline/i }));

  expect(screen.queryByRole("region", { name: /cookie choice/i })).not.toBeInTheDocument();
  vi.restoreAllMocks();
});
