import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date as pgDate,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp as pgTimestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const publicationStateEnum = pgEnum("publication_state", publicationStateValues);
export const contactMessageStatusEnum = pgEnum("contact_message_status", contactMessageStatusValues);
export const applicationStatusEnum = pgEnum("application_status", applicationStatusValues);

const publicationState = (name: string) => publicationStateEnum(name);
const contactMessageStatus = (name: string) => contactMessageStatusEnum(name);
const applicationStatus = (name: string) => applicationStatusEnum(name);

// Ids stay text holding UUIDs, as in SQLite: a malformed id in a URL then
// simply matches nothing instead of failing a uuid cast.
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) => pgTimestamp(name, { withTimezone: true, mode: "date" });

// ISO YYYY-MM-DD strings, as before.
const date = (name: string) => pgDate(name, { mode: "string" });

const jsonArray = <T>(name: string) =>
  jsonb(name)
    .$type<T[]>()
    .notNull()
    .default(sql`'[]'::jsonb`);

const timestamps = {
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
};

export const profiles = pgTable("profile", {
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

export const experiences = pgTable("experience", {
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

export const education = pgTable("education", {
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

export const skills = pgTable("skill", {
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

export const projects = pgTable(
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

export const resumeDocuments = pgTable(
  "resume_document",
  {
    id: id(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    publicationState: publicationState("publication_state")
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("resume_document_current_unique")
      .on(table.isCurrent)
      .where(sql`${table.isCurrent} = true`),
  ],
);

export const socialLinks = pgTable("social_link", {
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

export const contactMessages = pgTable("contact_message", {
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

export const jobApplications = pgTable("job_application", {
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

export const applicationContacts = pgTable("application_contact", {
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

export const applicationDocuments = pgTable("application_document", {
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

export const applicationActivities = pgTable("application_activity", {
  id: id(),
  // Breaks ties between entries recorded in the same millisecond.
  sequence: integer("sequence").generatedAlwaysAsIdentity(),
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

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
});

// Uploaded file contents, addressed by the storage keys that
// resume_document and application_document already record.
export const storedFiles = pgTable("stored_file", {
  key: text("key").primaryKey(),
  bytes: bytea("bytes").notNull(),
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
export type ApplicationContact = InferSelectModel<typeof applicationContacts>;
export type ApplicationDocument = InferSelectModel<typeof applicationDocuments>;
export const applicationStatuses = applicationStatusValues;
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
export type NewApplicationContact = Omit<
  InferInsertModel<typeof applicationContacts>,
  "id" | "createdAt" | "updatedAt"
>;
export type NewApplicationDocument = Omit<
  InferInsertModel<typeof applicationDocuments>,
  "id" | "createdAt" | "updatedAt"
>;
