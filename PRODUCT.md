# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: recruiters and hiring managers** filling entry-level business
strategy and business analysis roles. They arrive from a resume, LinkedIn, or
an application link, skim quickly, and decide whether to download the resume
or get in touch. Everything public should serve that short scan.

**Secondary: ISBA 4715 course reviewers** at Loyola Marymount University, who
assess the build and its operation. They matter, but they never shape the
public page ahead of recruiters.

**Owner: Nicholas Chabot**, the only signed-in user. They use `/admin` to edit
and publish content, upload the resume PDF, read contact messages, and track
their own job applications.

## Product Purpose

A recruiter-first personal resume site with a private owner dashboard. Success
on the public side is a recruiter downloading the Resume PDF or sending a
contact message. Success on the private side is the owner keeping public
content current and tracking every application (saved, applied, interviewing,
offer, rejected, withdrawn) in one place.

## Positioning

The site is its own evidence. It was built and is operated by the candidate:
Next.js, a SQLite/Drizzle database, magic-link auth, and self-hosting on an
Azure VM behind nginx, with written security and operations docs. A LinkedIn
profile or a template portfolio cannot show that an Information Systems &
Business Analytics candidate can ship and run a real system. This one does.

## Operating Context

- Recruiters often visit on a phone between other tasks, so the first screen
  has to show who the candidate is, what role they want, and where the resume is.
- The Resume PDF download is the main public call to action. The contact form
  and social links come second.
- Project pages are case studies at `/projects/[slug]`.
- The owner dashboard is a utility used now and then: forms, ordering,
  publish/draft state, previews, and an application timeline.

## Capabilities and Constraints

- Public: profile, experience timeline, projects with detail pages, skills,
  education, links, the Resume PDF, and a contact form. Only published content
  appears anywhere public, including metadata and the sitemap.
- Private: a single owner (`OWNER_EMAIL`) signs in with a Supabase magic link.
  Content CRUD with draft/published states and ordering, resume upload,
  contact inbox, and the application tracker with contacts, documents, and an
  activity timeline.
- Stack (existing): Next.js App Router, TypeScript, Tailwind CSS v4, Drizzle +
  SQLite, Resend email, privacy-first aggregate analytics. Hosted on an Azure
  VM (nginx → two Next.js workers). The site stays on Next.js.
- Out of scope: other user accounts, employer portals, public job listings,
  billing, chat, generated resume PDFs.

## Brand Commitments

None fixed yet. There's no logo, headshot, or brand mark. The name on record is
"Nicholas Chabot". Do not use LMU's official marks or branding.

## Evidence on Hand

Live database content (`data/career_platform.db`):

- Profile: name, headline, summary, location (Los Angeles, CA), and
  availability ("Seeking an entry-level position in business strategy or
  analysis").
- 2 experience entries, 2 education entries, and 4 skills.
- 1 project: "Soccer Data Analytics Pipeline".
- No Resume PDF uploaded yet, and no social links yet.
- Build and operations evidence: `docs/how-this-site-is-secured.md`,
  `docs/operations.md`, and `docs/evidence/`.

Absences that must not be invented: there are no testimonials, metrics,
employer logos, extra projects, or a headshot. Design for the empty states
(no resume, no links) instead of filling them with placeholders that pass for
real content.

## Product Principles

1. **Thirty-second recruiter scan.** Identity, target role, and the resume
   download must be clear within the first view, on any screen size.
2. **The build is the proof.** Craft, speed, and reliability are part of the
   pitch. A slow or broken detail weakens the main claim.
3. **Truthful and sparse beats padded.** Show only real, published content,
   and make thin sections look intentional rather than empty.
4. **Owner tools are quiet and dependable.** The dashboard puts clarity and
   safe publishing first, not expression.

## Accessibility & Inclusion

WCAG 2.1 AA is the floor. It is enforced by the axe-core Playwright suite
(`tests/e2e/accessibility.spec.ts`, tags wcag2a/wcag2aa/wcag21aa) across
public and admin pages.
