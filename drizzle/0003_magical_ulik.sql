ALTER TABLE "archive_entries" ADD COLUMN IF NOT EXISTS "entry_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "object_key" text;--> statement-breakpoint

UPDATE "archive_entries" AS "entry"
SET "entry_date" = COALESCE(
  (
    SELECT
      CASE
        WHEN COUNT(DISTINCT COALESCE("lineup"."lineup_date", "event"."starts_at", "event"."ends_at")) = 1
          THEN MAX(COALESCE("lineup"."lineup_date", "event"."starts_at", "event"."ends_at"))
        ELSE NULL
      END
    FROM "editor_archives" AS "archive"
    JOIN "events" AS "event" ON "event"."id" = "archive"."event_id"
    LEFT JOIN "event_lineup" AS "lineup"
      ON "lineup"."event_id" = "archive"."event_id"
     AND "lineup"."talent_id" = "entry"."talent_id"
    WHERE "archive"."id" = "entry"."archive_id"
  ),
  (
    SELECT COALESCE("event"."starts_at", "event"."ends_at")
    FROM "editor_archives" AS "archive"
    JOIN "events" AS "event" ON "event"."id" = "archive"."event_id"
    WHERE "archive"."id" = "entry"."archive_id"
  )
)
WHERE "entry"."entry_date" IS NULL;
