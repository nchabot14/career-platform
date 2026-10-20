import Script from "next/script";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";

// Umami is cookieless, aggregate-only analytics. Nothing third-party loads
// unless both settings are present.
export function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

  if (!websiteId || !scriptUrl) return null;

  return <Script src={scriptUrl} data-website-id={websiteId} strategy="afterInteractive" />;
}

const measurementIdPattern = /^G-[A-Z0-9]+$/;

export function googleAnalyticsId() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return id && measurementIdPattern.test(id) ? id : null;
}

// Google Analytics 4 under Consent Mode. Analytics cookies stay denied until
// the visitor accepts in the consent banner; ad features are always denied.
// The id is checked before it goes into the inline script.
export function GoogleAnalytics() {
  const measurementId = googleAnalyticsId();

  if (!measurementId) return null;

  const setup = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var granted = false;
try { granted = localStorage.getItem("${CONSENT_STORAGE_KEY}") === "granted"; } catch (e) {}
gtag("consent", "default", {
  analytics_storage: granted ? "granted" : "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
});
gtag("js", new Date());
gtag("config", "${measurementId}");`;

  return (
    <>
      <Script id="google-analytics-setup" strategy="afterInteractive">
        {setup}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
