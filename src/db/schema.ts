import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const editors = pgTable(
  "editors",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    bio: text("bio").notNull(),
    accent: text("accent").notNull(),
    intro: text("intro").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("editors_slug_idx").on(table.slug),
    emailIdx: uniqueIndex("editors_email_idx").on(table.email)
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  alt: text("alt").notNull(),
  url: text("url").notNull(),
  objectKey: text("object_key"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const talents = pgTable(
  "talents",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    nickname: text("nickname").notNull(),
    bio: text("bio").notNull(),
    mcn: text("mcn").notNull(),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    searchKeywords: text("search_keywords")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    coverAssetId: uuid("cover_asset_id").references(() => assets.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("talents_slug_idx").on(table.slug)
  })
);

export const talentTags = pgTable("talent_tags", {
  id: uuid("id").primaryKey(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  tag: text("tag").notNull()
});

export const talentLinks = pgTable("talent_links", {
  id: uuid("id").primaryKey(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const talentAssets = pgTable("talent_assets", {
  id: uuid("id").primaryKey(),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    searchKeywords: text("search_keywords")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    city: text("city").notNull(),
    venue: text("venue").notNull(),
    status: text("status").notNull(),
    note: text("note").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex("events_slug_idx").on(table.slug)
  })
);

export const eventLineup = pgTable("event_lineup", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  lineupDate: timestamp("lineup_date", { withTimezone: true }),
  status: text("status").notNull(),
  source: text("source").notNull(),
  note: text("note").notNull()
});

export const ladders = pgTable("ladders", {
  id: uuid("id").primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull()
});

export const ladderTiers = pgTable("ladder_tiers", {
  id: uuid("id").primaryKey(),
  ladderId: uuid("ladder_id")
    .notNull()
    .references(() => ladders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const ladderEntries = pgTable("ladder_entries", {
  id: uuid("id").primaryKey(),
  tierId: uuid("tier_id")
    .notNull()
    .references(() => ladderTiers.id, { onDelete: "cascade" }),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const editorArchives = pgTable("editor_archives", {
  id: uuid("id").primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const archiveEntries = pgTable("archive_entries", {
  id: uuid("id").primaryKey(),
  archiveId: uuid("archive_id")
    .notNull()
    .references(() => editorArchives.id, { onDelete: "cascade" }),
  talentId: uuid("talent_id")
    .notNull()
    .references(() => talents.id, { onDelete: "cascade" }),
  entryDate: timestamp("entry_date", { withTimezone: true }),
  sceneAssetId: uuid("scene_asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  sharedPhotoAssetId: uuid("shared_photo_asset_id").references(() => assets.id, {
    onDelete: "set null"
  }),
  cosplayTitle: text("cosplay_title").notNull(),
  recognized: boolean("recognized").notNull().default(false),
  hasSharedPhoto: boolean("has_shared_photo").notNull().default(false)
});
