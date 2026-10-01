CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`llm_provider` text,
	`llm_model` text,
	`embeddings_provider` text,
	`embeddings_model` text,
	`updated_at` integer NOT NULL
);
