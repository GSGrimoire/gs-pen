CREATE TABLE `content_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_owner_input` ON `content_jobs` (`owner_id`,`input_hash`);--> statement-breakpoint
CREATE INDEX `content_owner_updated` ON `content_jobs` (`owner_id`,`updated_at`);