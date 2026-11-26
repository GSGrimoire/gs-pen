CREATE TABLE `failed_link_attempts` (
 `id` text PRIMARY KEY NOT NULL,
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
CREATE INDEX `failed_link_owner_source_time` ON `failed_link_attempts` (`owner_id`,`source_url`,`created_at`,`id`);
