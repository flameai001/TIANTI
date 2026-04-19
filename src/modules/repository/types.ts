import type {
  Asset,
  ContentState,
  EditorAccount,
  EditorProfile,
  EditorArchive,
  EditorLadder,
  Event,
  SessionRecord,
  Talent
} from "@/modules/domain/types";

export interface ContentRepository {
  getState(): Promise<ContentState>;
  findEditorByEmail(email: string): Promise<EditorAccount | null>;
  updateEditorName(editorId: string, name: string): Promise<EditorProfile>;
  createSession(session: SessionRecord): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  createAsset(asset: Asset): Promise<Asset>;
  deleteAssetIfUnreferenced(id: string): Promise<boolean>;
  upsertTalent(talent: Talent): Promise<Talent>;
  deleteTalent(id: string): Promise<void>;
  upsertEvent(event: Event): Promise<Event>;
  replaceEventLineup(eventId: string, state: ContentState["lineups"]): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  saveLadder(ladder: EditorLadder): Promise<EditorLadder>;
  saveArchive(archive: EditorArchive): Promise<EditorArchive>;
}
