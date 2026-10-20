import { GoogleAnalytics, googleAnalyticsId } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent-banner";

type PublicLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

// Analytics and the consent banner cover the public pages only, so the
// owner's admin and sign-in pages are never measured.
export default function PublicLayout({ children }: PublicLayoutProps) {
  const analyticsEnabled = googleAnalyticsId() !== null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-14 px-6 py-16 sm:px-10">
      {children}
      {analyticsEnabled ? (
        <>
          <ConsentBanner />
          <GoogleAnalytics />
        </>
      ) : null}
    </div>
  );
}
