ALTER TABLE `failed_link_attempts` ADD `research_month` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `monthly_reliability` (
 `owner_id` text NOT NULL,
 `month` text NOT NULL,
 `kind` text NOT NULL,
 `platform` text NOT NULL,
 `outcome` text NOT NULL,
 `code` text NOT NULL,
 `count` integer NOT NULL,
 `last_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_reliability_bucket` ON `monthly_reliability` (`owner_id`,`month`,`kind`,`platform`,`outcome`,`code`);
