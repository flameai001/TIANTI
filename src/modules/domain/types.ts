export type EditorSlug = "lin" | "yu";
export type EventStatus = "future" | "past";
export type ParticipationStatus = "confirmed" | "pending";
export type AssetKind =
  | "talent_cover"
  | "talent_representation"
  | "event_scene"
  | "shared_photo";

export type TalentTag =
  | "国风"
  | "cosplay"
  | "汉服"
  | "舞台"
  | "写真"
  | "嘉宾"
  | "原创"
  | "游戏";

export interface EditorProfile {
  id: string;
  slug: EditorSlug;
  name: string;
  title: string;
  bio: string;
  accent: string;
  intro: string;
  email: string;
  passwordHash: string;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  title: string;
  alt: string;
  url: string;
  width: number;
  height: number;
}

export interface TalentLink {
  id: string;
  label: string;
  url: string;
}

export interface TalentRepresentation {
  id: string;
  title: string;
  assetId: string;
}

export interface Talent {
  id: string;
  slug: string;
  nickname: string;
  bio: string;
  mcn: string;
  aliases: string[];
  searchKeywords: string[];
  tags: TalentTag[];
  coverAssetId: string;
  links: TalentLink[];
  representations: TalentRepresentation[];
  updatedAt: string;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  searchKeywords: string[];
  startsAt: string;
  endsAt?: string | null;
  city: string;
  venue: string;
  status: EventStatus;
  note: string;
  updatedAt: string;
}

export interface EventLineup {
  id: string;
  eventId: string;
  talentId: string;
  status: ParticipationStatus;
  source: string;
  note: string;
}

export interface LadderTier {
  id: string;
  name: string;
  order: number;
  talentIds: string[];
}

export interface EditorLadder {
  id: string;
  editorId: string;
  title: string;
  subtitle: string;
  tiers: LadderTier[];
}

export interface ArchiveEntry {
  id: string;
  talentId: string;
  sceneAssetId: string;
  sharedPhotoAssetId?: string | null;
  cosplayTitle: string;
  recognized: boolean;
  hasSharedPhoto: boolean;
}

export interface EditorArchive {
  id: string;
  editorId: string;
  eventId: string;
  note: string;
  updatedAt: string;
  entries: ArchiveEntry[];
}

export interface SessionRecord {
  id: string;
  editorId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface ContentState {
  editors: EditorProfile[];
  assets: Asset[];
  talents: Talent[];
  events: Event[];
  lineups: EventLineup[];
  ladders: EditorLadder[];
  archives: EditorArchive[];
  sessions: SessionRecord[];
}

export interface TalentSummary {
  id: string;
  slug: string;
  nickname: string;
  bio: string;
  aliases: string[];
  tags: TalentTag[];
  cover: Asset;
  recentHint: string | null;
  hasFutureEvent: boolean;
  archiveCount: number;
  relevanceScore?: number;
}

export interface RelatedTalentSummary {
  talent: TalentSummary;
  reason: string;
}

export interface EventSummary {
  event: Event;
  lineups: Array<{
    lineup: EventLineup;
    talent: Talent;
    cover: Asset;
  }>;
  lineupSize: number;
  relevanceScore?: number;
}

export interface RelatedEventSummary {
  event: EventSummary;
  reason: string;
}

export interface TalentDetail {
  talent: Talent;
  cover: Asset;
  representationAssets: Array<TalentRepresentation & { asset: Asset }>;
  futureEvents: Event[];
  pastEvents: Event[];
  relatedTalents: RelatedTalentSummary[];
  relatedEvents: RelatedEventSummary[];
  editorSummaries: Array<{
    editor: EditorProfile;
    tierName: string | null;
    seenCount: number;
    sharedPhotoCount: number;
  }>;
}

export interface EventDetail {
  event: Event;
  lineups: Array<{
    lineup: EventLineup;
    talent: Talent;
    cover: Asset;
  }>;
  archives: Array<{
    editor: EditorProfile;
    archive: EditorArchive;
    entries: Array<{
      entry: ArchiveEntry;
      talent: Talent;
      sceneAsset: Asset;
      sharedPhotoAsset?: Asset | null;
    }>;
  }>;
  relatedEvents: RelatedEventSummary[];
  relatedTalents: RelatedTalentSummary[];
}

export interface SiteSearchResult {
  talents: TalentSummary[];
  events: EventSummary[];
}

export interface DiscoverySection<T> {
  title: string;
  href: string;
  description: string;
  items: T[];
}

export interface HomepageDiscovery {
  featuredTalents: TalentSummary[];
  futureEvents: EventSummary[];
  recentTalents: TalentSummary[];
  tagSpotlights: Array<{
    tag: TalentTag;
    count: number;
    href: string;
  }>;
  editorSpotlights: Array<{
    editor: EditorProfile;
    href: string;
    summary: string;
  }>;
  ladderSpotlights: Array<{
    ladder: EditorLadder;
    topTier: LadderTier;
    href: string;
  }>;
}

export interface DashboardSummary {
  recentTalents: Talent[];
  recentEvents: Event[];
  upcomingEvents: Event[];
  myRecentArchives: EditorArchive[];
}
