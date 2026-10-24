CREATE TABLE `extractions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_url` text NOT NULL,
	`platform` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `extraction_owner_created` ON `extractions` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `extraction_expiry` ON `extractions` (`expires_at`);