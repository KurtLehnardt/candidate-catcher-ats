CREATE TABLE `error_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`level` text DEFAULT 'error' NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`context` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `error_logs_created_at_idx` ON `error_logs` (`created_at`);