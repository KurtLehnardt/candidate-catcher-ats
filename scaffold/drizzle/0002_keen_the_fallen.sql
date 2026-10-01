PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_requirement_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`ai_score` real,
	`failed` integer DEFAULT false NOT NULL,
	`evidence_snippet` text,
	`substance_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_requirement_scores`("id", "applicant_id", "requirement_id", "ai_score", "evidence_snippet", "substance_note", "created_at") SELECT "id", "applicant_id", "requirement_id", "ai_score", "evidence_snippet", "substance_note", "created_at" FROM `requirement_scores`;--> statement-breakpoint
DROP TABLE `requirement_scores`;--> statement-breakpoint
ALTER TABLE `__new_requirement_scores` RENAME TO `requirement_scores`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `requirement_scores_applicant_idx` ON `requirement_scores` (`applicant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `requirement_scores_applicant_requirement_unique` ON `requirement_scores` (`applicant_id`,`requirement_id`);