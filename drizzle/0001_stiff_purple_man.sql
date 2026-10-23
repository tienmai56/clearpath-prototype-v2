CREATE TABLE `intake_files` (
	`id` text PRIMARY KEY NOT NULL,
	`intake` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`source` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`intake`) REFERENCES `student_intakes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `intake_files_intake` ON `intake_files` (`intake`);--> statement-breakpoint
CREATE TABLE `student_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`student` text NOT NULL,
	`drafts` text DEFAULT '{}' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_intakes_owner_student` ON `student_intakes` (`owner`,`student`);--> statement-breakpoint
ALTER TABLE `photo_sessions` ADD `intake_id` text REFERENCES student_intakes(id);