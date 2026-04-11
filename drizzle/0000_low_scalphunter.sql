CREATE TABLE "archive_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"archive_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"scene_asset_id" uuid NOT NULL,
	"shared_photo_asset_id" uuid,
	"cosplay_title" text NOT NULL,
	"recognized" boolean DEFAULT false NOT NULL,
	"has_shared_photo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"alt" text NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editor_archives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"editor_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"bio" text NOT NULL,
	"accent" text NOT NULL,
	"intro" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_lineup" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"city" text NOT NULL,
	"venue" text NOT NULL,
	"status" text NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladder_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tier_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladder_tiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ladder_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"editor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"editor_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"talent_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"talent_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talent_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"talent_id" uuid NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nickname" text NOT NULL,
	"bio" text NOT NULL,
	"mcn" text NOT NULL,
	"cover_asset_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_archive_id_editor_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."editor_archives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_scene_asset_id_assets_id_fk" FOREIGN KEY ("scene_asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_shared_photo_asset_id_assets_id_fk" FOREIGN KEY ("shared_photo_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_archives" ADD CONSTRAINT "editor_archives_editor_id_editors_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_archives" ADD CONSTRAINT "editor_archives_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_lineup" ADD CONSTRAINT "event_lineup_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_lineup" ADD CONSTRAINT "event_lineup_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_tier_id_ladder_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."ladder_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_tiers" ADD CONSTRAINT "ladder_tiers_ladder_id_ladders_id_fk" FOREIGN KEY ("ladder_id") REFERENCES "public"."ladders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladders" ADD CONSTRAINT "ladders_editor_id_editors_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_editor_id_editors_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."editors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_assets" ADD CONSTRAINT "talent_assets_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_assets" ADD CONSTRAINT "talent_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_links" ADD CONSTRAINT "talent_links_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_tags" ADD CONSTRAINT "talent_tags_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talents" ADD CONSTRAINT "talents_cover_asset_id_assets_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editors_slug_idx" ON "editors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "editors_email_idx" ON "editors" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "talents_slug_idx" ON "talents" USING btree ("slug");