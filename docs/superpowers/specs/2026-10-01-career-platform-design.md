# Career Platform Design Specification

## Status

Design approved in principle. This document is the implementation gate: no
application code is in scope until the owner reviews and explicitly approves
this written specification.

## Product Goal

Create a database-driven personal resume website that gives recruiters, hiring
managers, clients, and professional contacts a polished, recruiter-first view
of the owner's background. The primary public call to action is to review or
download the resume.

The same application must establish a durable foundation for a private,
owner-only job-application tracker. The future platform may later expand, but
multi-user accounts, employer portals, community features, and public
opportunity listings are explicitly out of scope for the first release.

## Scope

### Public site

- A minimal, professional, responsive design.
- An about/professional summary section.
- A scan-friendly experience timeline.
- Project and case-study pages.
- Skills, tools, and certifications.
- A contact form and social links.
- A prominent downloadable resume.
- An uploaded PDF resume at launch, with a data model that permits a generated
  PDF later.
- SEO for the public profile and project pages: canonical metadata, share
  previews, sitemap, robots configuration, and structured page metadata.
- Privacy-first aggregate analytics without marketing profiling.

### Private owner workspace

- Passwordless authentication for exactly one initial administrator.
- A browser-based dashboard to manage public content, uploaded resume files,
  contact messages, and job applications.
- A job-application tracker with company, role, source, status, notes,
  contacts, documents, and a chronological activity history.
- Application states: saved, applied, interviewing, offer, rejected, and
  withdrawn.

### Out of scope

- Candidate, employer, client, or community accounts.
- Public application submission or job listing workflows.
- Billing, booking, mentoring, chat, or social networking.
- A separate API service or native mobile application.
- Generated resume PDFs in the initial implementation.

## Architecture

Use an integrated TypeScript full-stack application built with Next.js and
PostgreSQL. Deploy the web application as one managed service and use managed
providers for PostgreSQL, object storage, passwordless authentication, and
transactional email. This minimizes first-release operating cost and
maintenance while preserving a clean path to future platform features.

Public requests render the resume and portfolio through server-rendered,
cacheable routes. Authenticated dashboard requests and all mutations execute
server-side. Domain services own business rules; repository modules own
database access. Route and UI layers do not execute database queries directly.
This boundary permits later APIs, roles, and multi-user behavior without
rewriting the public site.

## Components and Responsibilities

| Component | Responsibility |
| --- | --- |
| Public site | Render the profile, experience, projects, skills, contact, and downloadable resume. |
| Admin dashboard | Authenticate the owner and provide validated forms for all private content and workflows. |
| Content service | Apply publishing, ordering, slug, preview, and cache-revalidation rules. |
| Application service | Manage private job-application state transitions, contacts, documents, and activities. |
| Contact service | Validate, rate-limit, persist, notify, and expose owner-only contact messages. |
| Repositories | Execute typed PostgreSQL persistence operations only. |
| Object storage adapter | Store PDFs and application attachments; persist only file metadata in PostgreSQL. |
| Email adapter | Send contact notifications and surface delivery failures to monitoring. |

## Data Model

Every record has a primary key, `created_at`, and `updated_at`. Public content
that can be visible has `draft` or `published` state. Public records use
stable slugs where applicable.

| Entity | Purpose | Important fields |
| --- | --- | --- |
| `profile` | Singleton professional identity and summary. | name, headline, summary, location, availability, visibility |
| `experience` | Ordered career history. | employer, title, start_date, end_date, description, highlights, sort_order, publication_state |
| `education` | Ordered education history. | institution, credential, field_of_study, dates, sort_order, publication_state |
| `skill` | Skills, tools, and certifications. | name, category, proficiency_or_context, certification_details, sort_order, publication_state |
| `project` | Public project or case study. | title, slug, summary, body, role, technologies, links, cover_image, sort_order, publication_state |
| `resume_document` | Current and historical downloadable resume metadata. | storage_key, filename, MIME type, size, is_current, publication_state |
| `social_link` | Public contact destinations. | label, URL, icon, sort_order, publication_state |
| `contact_message` | Valid contact-form submissions. | sender name, sender email, subject, message, submitted_at, status, notification status |
| `job_application` | Private job application lifecycle. | company, role, URL, source, status, applied_at, notes, next_follow_up_at |
| `application_contact` | A contact associated with an application. | name, role, email, phone, profile URL, notes |
| `application_document` | Private attachment metadata. | application ID, storage key, filename, MIME type, size, category |
| `application_activity` | Immutable application timeline. | application ID, type, occurred_at, note, prior status, resulting status |

`resume_document` and `application_document` reference object-storage keys;
binary file content is never kept in PostgreSQL. Future database migrations
may add owner and role foreign keys, but the first release does not create
public user accounts.

## Data Flow

1. Public pages read only published content. Draft records never appear in
   public queries, metadata, sitemap generation, or previews.
2. The owner signs in through passwordless authentication. Server-side guards
   protect every dashboard route and mutation.
3. Dashboard mutations validate input, call a domain service, persist through
   a repository, and revalidate the affected public route if published content
   changed.
4. A contact submission receives server-side validation and rate limiting,
   then persists as a `contact_message` and sends a transactional email.
   A delivery failure is visible to monitoring and does not hide the stored
   message.
5. Resume and private attachments upload through authorized server-mediated
   storage flows. Download permissions distinguish public current resumes from
   owner-only application documents.
6. An application status change writes both the new status and an
   `application_activity` entry in one database transaction.

## Security and Privacy

- The initial account allowlist permits only the owner's approved identity.
- All authorization happens server-side; hiding dashboard controls is not an
  authorization mechanism.
- Validate and normalize every mutation, including contact submissions.
- Rate-limit contact submission and use a non-invasive spam control.
- Escape or safely render rich public content to prevent cross-site scripting.
- Keep secrets in deployment configuration, never in source or browser
  bundles.
- Mark dashboard, contact-message, and application routes as non-indexable.
- Use cookie-free or consent-aware privacy-first analytics with only aggregate
  traffic and referral reporting.

## Experience and Accessibility

The visual language is minimal and professional. The resume download is the
primary action. Public pages use semantic landmarks and heading order, visible
keyboard focus, sufficient color contrast, accessible labels and error text,
responsive layouts, and meaningful image alternatives. Resume PDF downloads
include descriptive filenames and accessible link text.

Admin forms support save-as-draft, publish/unpublish where relevant, a preview
of public content, field-level validation messages, and explicit confirmation
before destructive operations. Dashboard errors preserve entered form data
when possible and identify the failed action without revealing internals.

## Error Handling and Operations

- Display actionable public failures without exposing provider or database
  details.
- Log server, upload, email, authentication, and validation failures with
  request context suitable for diagnosis.
- Treat storage upload and deletion failures as explicit failed operations,
  not silent success.
- Monitor server errors, failed email notifications, and failed uploads.
- Configure automated managed-database backups and document a restore
  procedure before launch.
- Use managed free or low-cost tiers initially, while retaining environment
  configuration that can move to higher plans without application rewrites.

## Testing and Acceptance Criteria

Automated tests must cover:

- Repository and domain-service behavior against PostgreSQL, including
  published-content filtering and application status transitions.
- Owner-only authentication and authorization for every dashboard mutation.
- Contact validation, rate limiting, persistence, and notification failure
  behavior.
- Upload authorization and the separation of public resume documents from
  private application attachments.
- Critical public-page rendering, metadata, sitemap inclusion, and no-index
  rules for private routes.
- Keyboard and responsive smoke coverage for the public resume download and
  contact form.

The first release is acceptable when:

1. A visitor can review the profile, experience, projects, skills, contact
   details, and current resume PDF on a mobile or desktop browser.
2. Only the owner can enter the dashboard or read private records.
3. The owner can create, edit, draft, publish, reorder, and unpublish public
   content without a code deployment.
4. A valid contact submission is stored and notifies the owner; invalid or
   rate-limited requests receive a clear failure response.
5. The owner can manage a job application through the defined lifecycle,
   retaining its contacts, documents, notes, and activity history.
6. Public content is indexable where intended, while every private route is
   excluded from indexing.

## Delivery Sequence

1. Establish the application foundation, managed services, schema, owner
   authentication, authorization, and observability.
2. Deliver public resume content and PDF management.
3. Deliver the admin content dashboard and contact workflow.
4. Deliver private application tracking and attachments.
5. Add SEO, privacy-first analytics, accessibility checks, and production
   acceptance coverage.

Future phases may introduce content publishing, referrals, opportunities,
employer interaction, or multi-user accounts only after their actor model,
permissions, moderation needs, and migration plan receive a separate design.
