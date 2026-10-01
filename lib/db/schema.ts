import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const publicationStateValues = ["draft", "published"] as const;
const contactMessageStatusValues = ["unread", "read", "archived"] as const;
const applicationStatusValues = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
const contactNotificationStatusValues = ["pending", "sent", "failed"] as const;

export type PublicationState = (typeof publicationStateValues)[number];
export type ContactMessageStatus = (typeof contactMessageStatusValues)[number];
export type ApplicationStatus = (typeof applicationStatusValues)[number];
export type ContactNotificationStatus =
  (typeof contactNotificationStatusValues)[number];

// SQLite has no enum type, so these are text columns whose allowed values
// are enforced by TypeScript rather than by the database.
const publicationState = (name: string) =>
  text(name, { enum: publicationStateValues });
const contactMessageStatus = (name: string) =>
  text(name, { enum: contactMessageStatusValues });
const applicationStatus = (name: string) =>
  text(name, { enum: applicationStatusValues });

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// Stored as Unix epoch milliseconds; Drizzle maps them to Date objects.
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

// Stored as ISO YYYY-MM-DD strings, matching the former PostgreSQL date mode.
const date = (name: string) => text(name);

const jsonArray = <T>(name: string) =>
  text(name, { mode: "json" })
    .$type<T[]>()
    .notNull()
    .default(sql`'[]'`);

const timestamps = {
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
};

export const profiles = sqliteTable("profile", {
  id: id(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  location: text("location"),
  availability: text("availability"),
  visibility: text("visibility").notNull().default("public"),
  publicationState: publicationState("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const experiences = sqliteTable("experience", {
  id: id(),
  employer: text("employer").notNull(),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  description: text("description").notNull(),
  highlights: jsonArray<string>("highlights"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationState("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const education = sqliteTable("education", {
  id: id(),
  institution: text("institution").notNull(),
  credential: text("credential").notNull(),
  fieldOfStudy: text("field_of_study"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationState("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const skills = sqliteTable("skill", {
  id: id(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  proficiencyOrContext: text("proficiency_or_context"),
  certificationDetails: text("certification_details"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationState("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const projects = sqliteTable(
  "project",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    role: text("role"),
    technologies: jsonArray<string>("technologies"),
    links: jsonArray<{ label: string; href: string }>("links"),
    coverImage: text("cover_image"),
    sortOrder: integer("sort_order").notNull().default(0),
    publicationState: publicationState("publication_state")
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (table) => [uniqueIndex("project_slug_unique").on(table.slug)],
);

export const resumeDocuments = sqliteTable(
  "resume_document",
  {
    id: id(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    publicationState: publicationState("publication_state")
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("resume_document_current_unique")
      .on(table.isCurrent)
      .where(sql`${table.isCurrent} = 1`),
  ],
);

export const socialLinks = sqliteTable("social_link", {
  id: id(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationState("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const contactMessages = sqliteTable("contact_message", {
  id: id(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  submittedAt: timestamp("submitted_at")
    .notNull()
    .$defaultFn(() => new Date()),
  status: contactMessageStatus("status").notNull().default("unread"),
  notificationStatus: text("notification_status")
    .$type<ContactNotificationStatus>()
    .notNull()
    .default("pending"),
  ...timestamps,
});

export const jobApplications = sqliteTable("job_application", {
  id: id(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  jobUrl: text("job_url"),
  source: text("source"),
  status: applicationStatus("status").notNull().default("saved"),
  appliedAt: timestamp("applied_at"),
  notes: text("notes"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  ...timestamps,
});

export const applicationContacts = sqliteTable("application_contact", {
  id: id(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  phone: text("phone"),
  profileUrl: text("profile_url"),
  notes: text("notes"),
  ...timestamps,
});

export const applicationDocuments = sqliteTable("application_document", {
  id: id(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  category: text("category").notNull(),
  ...timestamps,
});

export const applicationActivities = sqliteTable("application_activity", {
  id: id(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  occurredAt: timestamp("occurred_at")
    .notNull()
    .$defaultFn(() => new Date()),
  note: text("note"),
  priorStatus: applicationStatus("prior_status"),
  resultingStatus: applicationStatus("resulting_status"),
  ...timestamps,
});

export type Profile = InferSelectModel<typeof profiles>;
export type Experience = InferSelectModel<typeof experiences>;
export type Project = InferSelectModel<typeof projects>;
export type Education = InferSelectModel<typeof education>;
export type Skill = InferSelectModel<typeof skills>;
export type SocialLink = InferSelectModel<typeof socialLinks>;
export type ResumeDocument = InferSelectModel<typeof resumeDocuments>;
export type JobApplication = InferSelectModel<typeof jobApplications>;
export type ApplicationActivity = InferSelectModel<typeof applicationActivities>;
export type ContactMessage = InferSelectModel<typeof contactMessages>;

export type NewContactMessage = Omit<
  InferInsertModel<typeof contactMessages>,
  "id" | "createdAt" | "updatedAt"
>;
export type NewApplication = Omit<
  InferInsertModel<typeof jobApplications>,
  "id" | "createdAt" | "updatedAt"
>;
export type NewApplicationActivity = Omit<
  InferInsertModel<typeof applicationActivities>,
  "id" | "createdAt" | "updatedAt"
>;
