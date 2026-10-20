import type { Metadata } from "next";
import { ReopenConsentButton } from "@/components/consent-banner";
import { siteOwner } from "@/lib/site-owner";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this site collects, why, who receives it, and your choices.",
  alternates: { canonical: "/privacy" },
};

const linkClass =
  "text-sky-700 underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

function Heading({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-10 text-lg leading-8 text-slate-700">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Privacy</h1>
        <p className="text-sm text-slate-600">
          Last updated <time dateTime="2026-10-20">October 20, 2026</time>
        </p>
        <p>
          This is a personal resume site run by {siteOwner.name}. It measures visits with Google
          Analytics, using cookies only if you allow them, and it keeps what you send through the
          contact form. This page explains what that involves.
        </p>
      </header>

      <section className="space-y-4">
        <Heading>Google Analytics</Heading>
        <p>
          When you load a page, your browser runs a script from Google that reports the visit to
          Google Analytics 4. I use it to see how many people visit, which pages they read, and
          which links they follow off the site, such as a project&apos;s code or demo link.
        </p>
        <p>For each visit, Google receives:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the address of the page and the page you came from</li>
          <li>your browser, device type, screen size, and language</li>
          <li>your approximate location (city or region), which Google works out from your IP address</li>
          <li>the address of any link to another site that you click</li>
          <li>a random ID stored in a cookie, so repeat visits can be counted, but only if you accept</li>
        </ul>
        <p>
          If you decline, or haven&apos;t chosen yet, the script still loads and still tells Google
          that a page was viewed, but without cookies or the random ID. Google can&apos;t link those
          visits together, and Analytics only estimates them.
        </p>
        <p>
          I see totals and trends in Google&apos;s reports, not your name or email address. Google
          handles this data under its own{" "}
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer" className={linkClass}>
            privacy policy
          </a>
          . Google Analytics keeps visit-level data for [CONFIRM: 2 or 14 months, from the property&apos;s
          data retention setting].
        </p>
      </section>

      <section className="space-y-4">
        <Heading>Cookies</Heading>
        <p>If you accept, Google Analytics sets these cookies on this site:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead className="border-b border-slate-300 text-slate-950">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">Cookie</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Purpose</th>
                <th scope="col" className="py-2 font-semibold">Lasts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 pr-4 font-mono text-sm">_ga</td>
                <td className="py-2 pr-4">Tells one visitor apart from another</td>
                <td className="py-2">2 years</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-sm">_ga_JTFJE8DS7S</td>
                <td className="py-2 pr-4">Keeps track of the current visit</td>
                <td className="py-2">2 years</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          A banner asks before they are set. Until you accept, none are set. If you decline after
          accepting, the site deletes them. Your choice is saved in your browser&apos;s local storage
          under <span className="font-mono text-sm">analytics-consent</span>, not in a cookie, and
          stays until you change it or clear your browser data.
        </p>
        <p>
          No other cookies are set for visitors. The site&apos;s private admin area uses its own
          sign-in cookies, but only for me, and it doesn&apos;t load Google Analytics.
        </p>
      </section>

      <section className="space-y-4">
        <Heading>The contact form</Heading>
        <p>
          If you send a message, the site saves your name, email address, subject, and message in
          its database, and emails me a copy so I can reply. I use them only to answer you. Messages
          stay until I delete them; nothing removes them automatically. Database backups made on the
          server are kept for [CONFIRM: 14 days, if the daily backup is running].
        </p>
        <p>
          To limit spam, the site counts messages from each network for one hour. It does this with
          a scrambled (hashed) version of your IP address that is held in memory only and never
          saved.
        </p>
        <p>
          You don&apos;t have to use the form. You can email me directly at{" "}
          <a href={`mailto:${siteOwner.email}`} className={linkClass}>
            {siteOwner.email}
          </a>{" "}
          instead.
        </p>
      </section>

      <section className="space-y-4">
        <Heading>Server logs</Heading>
        <p>
          Like most web servers, the one running this site records each request: your IP address,
          the time, the page, and your browser. [CONFIRM: These logs are kept for 14 days and then
          deleted.] I use them only to keep the site running and secure.
        </p>
      </section>

      <section className="space-y-4">
        <Heading>Who receives your information</Heading>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="font-semibold text-slate-950">Google</strong> receives the
            analytics data described above.
          </li>
          <li>
            <strong className="font-semibold text-slate-950">Microsoft Azure</strong> hosts the
            server, so contact messages, backups, and logs are stored on its machines.
          </li>
          <li>
            <strong className="font-semibold text-slate-950">Resend</strong> delivers the email
            copy of your contact message to my inbox, and my email provider stores it there.
          </li>
        </ul>
        <p>I don&apos;t sell visitor information, and I don&apos;t use it for advertising.</p>
      </section>

      <section className="space-y-4">
        <Heading>Your choices</Heading>
        <ul className="list-disc space-y-2 pl-6">
          <li>accept or decline analytics cookies in the banner, and change your mind with the button below</li>
          <li>block or clear cookies, or block Google Analytics, in your browser or with a content blocker</li>
          <li>
            install Google&apos;s{" "}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer" className={linkClass}>
              opt-out browser add-on
            </a>
          </li>
          <li>email me instead of using the contact form</li>
          <li>
            email me to ask what I hold from your contact message, or to have it deleted. I delete
            it by hand, including from my inbox.
          </li>
        </ul>
        <p>
          This site does not respond to &ldquo;Do Not Track&rdquo; or Global Privacy Control
          signals. Only the banner choice controls analytics cookies.
        </p>
        <ReopenConsentButton />
      </section>

      <section className="space-y-4">
        <Heading>Questions</Heading>
        <p>
          Email{" "}
          <a href={`mailto:${siteOwner.email}`} className={linkClass}>
            {siteOwner.email}
          </a>
          . If this page changes, the date at the top changes too.
        </p>
      </section>
    </article>
  );
}
