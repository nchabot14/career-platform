CREATE TABLE `application_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`note` text,
	`prior_status` text,
	`resulting_status` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `job_application`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `application_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`email` text,
	`phone` text,
	`profile_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `job_application`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `application_document` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `job_application`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contact_message` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_name` text NOT NULL,
	`sender_email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`notification_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `education` (
	`id` text PRIMARY KEY NOT NULL,
	`institution` text NOT NULL,
	`credential` text NOT NULL,
	`field_of_study` text,
	`start_date` text,
	`end_date` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `experience` (
	`id` text PRIMARY KEY NOT NULL,
	`employer` text NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`description` text NOT NULL,
	`highlights` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_application` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`job_url` text,
	`source` text,
	`status` text DEFAULT 'saved' NOT NULL,
	`applied_at` integer,
	`notes` text,
	`next_follow_up_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`location` text,
	`availability` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`role` text,
	`technologies` text DEFAULT '[]' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`cover_image` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_slug_unique` ON `project` (`slug`);--> statement-breakpoint
CREATE TABLE `resume_document` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_document_current_unique` ON `resume_document` (`is_current`) WHERE "resume_document"."is_current" = 1;--> statement-breakpoint
CREATE TABLE `skill` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`proficiency_or_context` text,
	`certification_details` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_link` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`publication_state` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
