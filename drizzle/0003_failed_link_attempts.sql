CREATE TABLE `failed_link_attempts` (
 `seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `id` text NOT NULL,
 `case_id` text NOT NULL,
 `owner_id` text NOT NULL,
 `source_url` text NOT NULL,
 `platform` text NOT NULL,
 `created_at` integer NOT NULL,
 `status` text NOT NULL,
 `code` text NOT NULL,
 `trace_id` text NOT NULL,
 `build` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `failed_link_attempt_id` ON `failed_link_attempts` (`id`);
--> statement-breakpoint
CREATE INDEX `failed_link_owner_source_seq` ON `failed_link_attempts` (`owner_id`,`source_url`,`seq`);
--> statement-breakpoint
CREATE INDEX `failed_link_owner_case_seq` ON `failed_link_attempts` (`owner_id`,`case_id`,`seq`);
