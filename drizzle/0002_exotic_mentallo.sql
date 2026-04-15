ALTER TABLE "events" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ALTER COLUMN "cover_asset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_lineup" ADD COLUMN IF NOT EXISTS "lineup_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "search_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN IF NOT EXISTS "aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "talents" ADD COLUMN IF NOT EXISTS "search_keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint

UPDATE "event_lineup" AS "lineup"
SET "lineup_date" = COALESCE("events"."starts_at", "events"."ends_at")
FROM "events"
WHERE "lineup"."event_id" = "events"."id"
  AND "lineup"."lineup_date" IS NULL;
