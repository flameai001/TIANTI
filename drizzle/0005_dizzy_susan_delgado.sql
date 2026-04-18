ALTER TABLE "events" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
UPDATE "events" SET "slug" = NULL;--> statement-breakpoint
UPDATE "talents" SET "slug" = NULL;
