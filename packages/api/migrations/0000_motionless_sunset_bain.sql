CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date_text` text,
	`year` integer,
	`month` integer,
	`day` integer,
	`is_lunar` integer DEFAULT false,
	`is_recurring` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`parent1_id` text,
	`parent2_id` text,
	`order_p1` integer DEFAULT 1 NOT NULL,
	`order_p2` integer DEFAULT 1 NOT NULL,
	`married_year` integer,
	`married_month` integer,
	`married_day` integer,
	`married_is_lunar` integer DEFAULT false,
	`end_year` integer,
	`end_month` integer,
	`end_day` integer,
	`status` text DEFAULT 'active',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`parent1_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent2_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`family_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`family_id`, `person_id`),
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_person_id_unique` ON `family_members` (`person_id`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gender` text,
	`nickname` text,
	`bio` text,
	`address` text,
	`email` text,
	`phone` text,
	`avatar_key` text,
	`birth_year` integer,
	`birth_month` integer,
	`birth_day` integer,
	`birth_is_lunar` integer DEFAULT false,
	`death_year` integer,
	`death_month` integer,
	`death_day` integer,
	`death_is_lunar` integer DEFAULT false,
	`is_alive` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `persons_name_idx` ON `persons` (`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);