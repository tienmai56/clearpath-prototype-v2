CREATE TABLE `photo_files` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`delivered` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`session`) REFERENCES `photo_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photo_files_session` ON `photo_files` (`session`);--> statement-breakpoint
CREATE TABLE `photo_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`token_hash` text NOT NULL,
	`student` text NOT NULL,
	`objective` text NOT NULL,
	`expires` integer NOT NULL,
	`max_files` integer NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `photo_sessions_owner` ON `photo_sessions` (`owner`);--> statement-breakpoint
CREATE INDEX `photo_sessions_expiry` ON `photo_sessions` (`expires`);