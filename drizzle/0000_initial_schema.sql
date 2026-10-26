CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."contact_message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."publication_state" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "application_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" integer GENERATED ALWAYS AS IDENTITY (sequence name "application_activity_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"application_id" text NOT NULL,
	"type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"prior_status" "application_status",
	"resulting_status" "application_status",
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"profile_url" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_document" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_message" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"status" "contact_message_status" DEFAULT 'unread' NOT NULL,
	"notification_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" text PRIMARY KEY NOT NULL,
	"institution" text NOT NULL,
	"credential" text NOT NULL,
	"field_of_study" text,
	"start_date" date,
	"end_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience" (
	"id" text PRIMARY KEY NOT NULL,
	"employer" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_application" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"job_url" text,
	"source" text,
	"status" "application_status" DEFAULT 'saved' NOT NULL,
	"applied_at" timestamp with time zone,
	"notes" text,
	"next_follow_up_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"location" text,
	"availability" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"role" text,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_document" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"proficiency_or_context" text,
	"certification_details" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_link" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"publication_state" "publication_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_activity" ADD CONSTRAINT "application_activity_application_id_job_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_contact" ADD CONSTRAINT "application_contact_application_id_job_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_document" ADD CONSTRAINT "application_document_application_id_job_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_unique" ON "project" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_document_current_unique" ON "resume_document" USING btree ("is_current") WHERE "resume_document"."is_current" = true;