import type {
  ContentState,
  EditorArchive,
  EditorLadder,
  Event,
  SessionRecord,
  Talent
} from "@/modules/domain/types";

export interface ContentRepository {
  getState(): Promise<ContentState>;
  findEditorByEmail(email: string): Promise<ContentState["editors"][number] | null>;
  createSession(session: SessionRecord): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  upsertTalent(talent: Talent): Promise<Talent>;
  deleteTalent(id: string): Promise<void>;
  upsertEvent(event: Event): Promise<Event>;
  replaceEventLineup(eventId: string, state: ContentState["lineups"]): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  saveLadder(ladder: EditorLadder): Promise<EditorLadder>;
  saveArchive(archive: EditorArchive): Promise<EditorArchive>;
}
