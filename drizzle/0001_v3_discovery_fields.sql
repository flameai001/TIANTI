ALTER TABLE "talents"
ADD COLUMN "aliases" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "talents"
ADD COLUMN "search_keywords" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "events"
ADD COLUMN "aliases" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "events"
ADD COLUMN "search_keywords" text[] NOT NULL DEFAULT ARRAY[]::text[];
