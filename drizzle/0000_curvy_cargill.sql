CREATE TABLE `diagnostic_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diagnostic_expiry` ON `diagnostic_events` (`expires_at`);--> statement-breakpoint
CREATE TABLE `request_budget` (
	`scope` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`used` integer NOT NULL
);
