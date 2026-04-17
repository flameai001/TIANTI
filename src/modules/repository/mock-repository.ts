import "server-only";

import { getMockState, setMockState } from "@/modules/repository/mock-store";
import type { ContentRepository } from "@/modules/repository/types";
import type { ContentState } from "@/modules/domain/types";

function replaceState(mutator: (state: ContentState) => ContentState) {
  const current = getMockState();
  const next = mutator(structuredClone(current));
  setMockState(next);
  return next;
}

export const mockRepository: ContentRepository = {
  async getState() {
    return structuredClone(getMockState());
  },
  async findEditorByEmail(email) {
    const editor = getMockState().editors.find((item) => item.email.toLowerCase() === email.toLowerCase());
    return editor ? structuredClone(editor) : null;
  },
  async updateEditorName(editorId, name) {
    let nextEditor: ContentState["editors"][number] | null = null;

    replaceState((state) => {
      const index = state.editors.findIndex((item) => item.id === editorId);
      if (index < 0) {
        throw new Error("当前编辑者不存在。");
      }

      state.editors[index] = {
        ...state.editors[index],
        name
      };
      nextEditor = structuredClone(state.editors[index]);
      return state;
    });

    if (!nextEditor) {
      throw new Error("当前编辑者不存在。");
    }

    return nextEditor;
  },
  async createSession(session) {
    replaceState((state) => {
      state.sessions = state.sessions.filter((item) => item.id !== session.id);
      state.sessions.push(session);
      return state;
    });
  },
  async getSessionByTokenHash(tokenHash) {
    const session = getMockState().sessions.find((item) => item.tokenHash === tokenHash);
    return session ? structuredClone(session) : null;
  },
  async deleteSessionByTokenHash(tokenHash) {
    replaceState((state) => {
      state.sessions = state.sessions.filter((item) => item.tokenHash !== tokenHash);
      return state;
    });
  },
  async createAsset(asset) {
    replaceState((state) => {
      const index = state.assets.findIndex((item) => item.id === asset.id);
      if (index >= 0) {
        state.assets[index] = asset;
      } else {
        state.assets.push(asset);
      }
      return state;
    });
    return asset;
  },
  async deleteAsset(id) {
    replaceState((state) => {
      state.assets = state.assets.filter((item) => item.id !== id);
      return state;
    });
  },
  async upsertTalent(talent) {
    replaceState((state) => {
      const index = state.talents.findIndex((item) => item.id === talent.id);
      if (index >= 0) {
        state.talents[index] = talent;
      } else {
        state.talents.push(talent);
      }
      return state;
    });
    return talent;
  },
  async deleteTalent(id) {
    replaceState((state) => {
      state.talents = state.talents.filter((item) => item.id !== id);
      state.lineups = state.lineups.filter((item) => item.talentId !== id);
      state.ladders = state.ladders.map((ladder) => ({
        ...ladder,
        tiers: ladder.tiers.map((tier) => ({
          ...tier,
          talentIds: tier.talentIds.filter((talentId) => talentId !== id)
        }))
      }));
      state.archives = state.archives.map((archive) => ({
        ...archive,
        entries: archive.entries.filter((entry) => entry.talentId !== id)
      }));
      return state;
    });
  },
  async upsertEvent(event) {
    replaceState((state) => {
      const index = state.events.findIndex((item) => item.id === event.id);
      if (index >= 0) {
        state.events[index] = event;
      } else {
        state.events.push(event);
      }
      return state;
    });
    return event;
  },
  async replaceEventLineup(eventId, nextLineups) {
    replaceState((state) => {
      const unrelated = state.lineups.filter((item) => item.eventId !== eventId);
      state.lineups = [...unrelated, ...nextLineups.filter((item) => item.eventId === eventId)];
      return state;
    });
  },
  async deleteEvent(id) {
    replaceState((state) => {
      state.events = state.events.filter((item) => item.id !== id);
      state.lineups = state.lineups.filter((item) => item.eventId !== id);
      state.archives = state.archives.filter((item) => item.eventId !== id);
      return state;
    });
  },
  async saveLadder(ladder) {
    replaceState((state) => {
      const index = state.ladders.findIndex((item) => item.id === ladder.id);
      if (index >= 0) {
        state.ladders[index] = ladder;
      } else {
        state.ladders.push(ladder);
      }
      return state;
    });
    return ladder;
  },
  async saveArchive(archive) {
    replaceState((state) => {
      const index = state.archives.findIndex((item) => item.id === archive.id);
      if (index >= 0) {
        state.archives[index] = archive;
      } else {
        state.archives.push(archive);
      }
      return state;
    });
    return archive;
  }
};
