import { hashSync } from "@node-rs/argon2";
import { getSeedEditorCredentials } from "@/lib/env";
import { demoSeedState } from "@/modules/domain/seed";
import type { ContentState, EditorAccount, EditorProfile, RepositoryState } from "@/modules/domain/types";

function cloneState(state: RepositoryState): RepositoryState {
  return JSON.parse(JSON.stringify(state)) as RepositoryState;
}

export function toEditorProfile(editor: EditorAccount): EditorProfile {
  return {
    id: editor.id,
    slug: editor.slug,
    name: editor.name,
    title: editor.title,
    bio: editor.bio,
    accent: editor.accent,
    intro: editor.intro
  };
}

export function toContentState(state: RepositoryState): ContentState {
  return {
    ...state,
    editors: state.editors.map(toEditorProfile)
  };
}

function createInitialMockState() {
  const state = cloneState(demoSeedState);
  const editorCredentials = getSeedEditorCredentials({ allowDefaults: true });

  state.editors = state.editors.map((editor, index) => {
    const credential = editorCredentials[index];

    if (!credential) {
      return editor;
    }

    return {
      ...editor,
      email: credential.email,
      passwordHash: hashSync(credential.password)
    };
  });

  return state;
}

declare global {
  var __tiantiMockState: RepositoryState | undefined;
}

export function getMockState() {
  if (!globalThis.__tiantiMockState) {
    globalThis.__tiantiMockState = createInitialMockState();
  }

  return globalThis.__tiantiMockState;
}

export function setMockState(nextState: RepositoryState) {
  globalThis.__tiantiMockState = nextState;
}

export function resetMockState() {
  globalThis.__tiantiMockState = createInitialMockState();
}
