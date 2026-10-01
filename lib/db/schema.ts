import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

export const publicationStateEnum = pgEnum(
  "publication_state",
  publicationStateValues,
);
export const contactMessageStatusEnum = pgEnum(
  "contact_message_status",
  contactMessageStatusValues,
);
export const applicationStatusEnum = pgEnum(
  "application_status",
  applicationStatusValues,
);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const profiles = pgTable("profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  location: text("location"),
  availability: text("availability"),
  visibility: text("visibility").notNull().default("public"),
  publicationState: publicationStateEnum("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const experiences = pgTable("experience", {
  id: uuid("id").defaultRandom().primaryKey(),
  employer: text("employer").notNull(),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  description: text("description").notNull(),
  highlights: jsonb("highlights")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationStateEnum("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const education = pgTable("education", {
  id: uuid("id").defaultRandom().primaryKey(),
  institution: text("institution").notNull(),
  credential: text("credential").notNull(),
  fieldOfStudy: text("field_of_study"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationStateEnum("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const skills = pgTable("skill", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  proficiencyOrContext: text("proficiency_or_context"),
  certificationDetails: text("certification_details"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationStateEnum("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const projects = pgTable(
  "project",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    role: text("role"),
    technologies: jsonb("technologies")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    links: jsonb("links")
      .$type<Array<{ label: string; href: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    coverImage: text("cover_image"),
    sortOrder: integer("sort_order").notNull().default(0),
    publicationState: publicationStateEnum("publication_state")
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (table) => [uniqueIndex("project_slug_unique").on(table.slug)],
);

export const resumeDocuments = pgTable(
  "resume_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    publicationState: publicationStateEnum("publication_state")
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
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  publicationState: publicationStateEnum("publication_state")
    .notNull()
    .default("draft"),
  ...timestamps,
});

export const contactMessages = pgTable("contact_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: contactMessageStatusEnum("status").notNull().default("unread"),
  notificationStatus: text("notification_status")
    .$type<ContactNotificationStatus>()
    .notNull()
    .default("pending"),
  ...timestamps,
});

export const jobApplications = pgTable("job_application", {
  id: uuid("id").defaultRandom().primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  jobUrl: text("job_url"),
  source: text("source"),
  status: applicationStatusEnum("status").notNull().default("saved"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  notes: text("notes"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  ...timestamps,
});

export const applicationContacts = pgTable("application_contact", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
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
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  category: text("category").notNull(),
  ...timestamps,
});

export const applicationActivities = pgTable("application_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => jobApplications.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
  priorStatus: applicationStatusEnum("prior_status"),
  resultingStatus: applicationStatusEnum("resulting_status"),
  ...timestamps,
});

export type Profile = InferSelectModel<typeof profiles>;
export type Experience = InferSelectModel<typeof experiences>;
export type Project = InferSelectModel<typeof projects>;
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
