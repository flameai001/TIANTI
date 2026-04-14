import type { EditorArchive, Event, EventLineup } from "@/modules/domain/types";

export interface EditableEvent {
  id?: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  city: string;
  venue: string;
  status: "future" | "past";
  note: string;
}

export interface EditableLineup {
  id: string;
  talentId: string;
  status: "confirmed" | "pending";
  source: string;
  note: string;
}

export function toInputDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function createEmptyEventDraft(): EditableEvent {
  return {
    name: "",
    slug: "",
    startsAt: "",
    endsAt: "",
    city: "",
    venue: "",
    status: "future",
    note: ""
  };
}

export function createEventDraft(event?: Event | null): EditableEvent {
  if (!event) {
    return createEmptyEventDraft();
  }

  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    startsAt: toInputDate(event.startsAt),
    endsAt: toInputDate(event.endsAt),
    city: event.city,
    venue: event.venue,
    status: event.status,
    note: event.note
  };
}

export function createLineupDrafts(eventId: string | null, lineups: EventLineup[]): EditableLineup[] {
  if (!eventId) {
    return [];
  }

  return lineups
    .filter((lineup) => lineup.eventId === eventId)
    .map((lineup) => ({
      id: lineup.id,
      talentId: lineup.talentId,
      status: lineup.status,
      source: lineup.source,
      note: lineup.note
    }));
}

export function createArchiveDraft(eventId: string | null, archives: EditorArchive[]): EditorArchive {
  if (!eventId) {
    return {
      id: "",
      editorId: "",
      eventId: "",
      note: "",
      updatedAt: "",
      entries: []
    };
  }

  return (
    archives.find((archive) => archive.eventId === eventId) ?? {
      id: "",
      editorId: "",
      eventId,
      note: "",
      updatedAt: "",
      entries: []
    }
  );
}

export function normalizeEventDraft(value: EditableEvent) {
  return {
    id: value.id ?? "",
    name: value.name.trim(),
    slug: value.slug.trim(),
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    city: value.city.trim(),
    venue: value.venue.trim(),
    status: value.status,
    note: value.note.trim()
  };
}

export function normalizeLineupDrafts(value: EditableLineup[]) {
  return value.map((lineup) => ({
    id: lineup.id,
    talentId: lineup.talentId,
    status: lineup.status,
    source: lineup.source.trim(),
    note: lineup.note.trim()
  }));
}

export function normalizeArchiveDraft(value: EditorArchive) {
  return {
    id: value.id ?? "",
    editorId: value.editorId ?? "",
    eventId: value.eventId ?? "",
    note: value.note.trim(),
    entries: value.entries.map((entry) => ({
      id: entry.id,
      talentId: entry.talentId,
      sceneAssetId: entry.sceneAssetId,
      sharedPhotoAssetId: entry.sharedPhotoAssetId ?? null,
      cosplayTitle: entry.cosplayTitle.trim(),
      recognized: entry.recognized,
      hasSharedPhoto: entry.hasSharedPhoto
    }))
  };
}
