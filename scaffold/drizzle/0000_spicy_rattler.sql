CREATE TABLE `applicants` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`resume_id` text,
	`stage` text DEFAULT 'New' NOT NULL,
	`overall_score` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `applicants_job_idx` ON `applicants` (`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `manual_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`job_id` text NOT NULL,
	`score` real NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `manual_scores_applicant_idx` ON `manual_scores` (`applicant_id`);--> statement-breakpoint
CREATE TABLE `reference_hires` (
	`id` text PRIMARY KEY NOT NULL,
	`job_family` text NOT NULL,
	`resume_text` text NOT NULL,
	`embedding` text,
	`embedding_provider` text,
	`embedding_model` text,
	`promoted_from_applicant_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`promoted_from_applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reference_hires_job_family_idx` ON `reference_hires` (`job_family`);--> statement-breakpoint
CREATE TABLE `requirement_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`ai_score` real NOT NULL,
	`evidence_snippet` text,
	`substance_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `requirement_scores_applicant_idx` ON `requirement_scores` (`applicant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `requirement_scores_applicant_requirement_unique` ON `requirement_scores` (`applicant_id`,`requirement_id`);--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`text` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `requirements_job_idx` ON `requirements` (`job_id`);--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`file_path` text,
	`parsed_json` text,
	`bias_stripped` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resumes_applicant_idx` ON `resumes` (`applicant_id`);