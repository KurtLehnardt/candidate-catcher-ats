CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`question` text NOT NULL,
	`related_requirement_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `interview_questions_applicant_idx` ON `interview_questions` (`applicant_id`);