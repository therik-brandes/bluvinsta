CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoKey` varchar(512) NOT NULL,
	`videoUrl` varchar(2048),
	`videoSize` bigint,
	`videoMimeType` varchar(100),
	`caption` text,
	`scheduledDate` date NOT NULL,
	`scheduledTime` time NOT NULL,
	`status` enum('pending','scheduled','published','failed') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int,
	`webhookUrl` varchar(2048) NOT NULL,
	`payload` json,
	`responseStatus` int,
	`responseBody` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `webhookUrl` varchar(2048);