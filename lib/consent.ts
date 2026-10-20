// The visitor's analytics choice. It is stored in the browser, never sent to
// the server, and read by the inline Google tag before it configures itself.
export const CONSENT_STORAGE_KEY = "analytics-consent";

export type Consent = "granted" | "denied";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const listeners = new Set<() => void>();
// Fallbacks for browsers that block storage, so a choice still holds for the
// rest of the visit.
let sessionChoice: Consent | null = null;
let reopened = false;

function notify() {
  for (const listener of listeners) listener();
}

export function readConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    // Storage is blocked; fall back to this visit's choice.
  }
  return sessionChoice;
}

// Google Analytics sets _ga and _ga_<id> on the top-level domain, so clear
// them on every domain level of the current host.
function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  const parts = window.location.hostname.split(".");
  const domains = parts.map((_, index) => parts.slice(index).join("."));

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  }
}

export function saveConsent(choice: Consent) {
  sessionChoice = choice;
  reopened = false;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage is blocked; the choice lasts for this visit only.
  }
  window.gtag?.("consent", "update", { analytics_storage: choice });
  if (choice === "denied") clearAnalyticsCookies();
  notify();
}

export function reopenConsent() {
  reopened = true;
  notify();
}

export function subscribeToConsent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function shouldAskForConsent() {
  return reopened || readConsent() === null;
}

export function resetConsentForTests() {
  sessionChoice = null;
  reopened = false;
}
