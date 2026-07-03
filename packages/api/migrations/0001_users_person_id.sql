ALTER TABLE `users` ADD `person_id` text REFERENCES `persons`(`id`) ON DELETE set null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_person_id_unique` ON `users` (`person_id`);
