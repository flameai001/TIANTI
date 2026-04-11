import { hashSync } from "@node-rs/argon2";
import { appEnv } from "@/lib/env";
import { demoSeedState } from "@/modules/domain/seed";
import type { ContentState } from "@/modules/domain/types";

function cloneState(state: ContentState): ContentState {
  return JSON.parse(JSON.stringify(state)) as ContentState;
}

function createInitialMockState() {
  const state = cloneState(demoSeedState);

  state.editors = state.editors.map((editor, index) => {
    const credential = appEnv.editorCredentials[index];

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
  var __tiantiMockState: ContentState | undefined;
}

export function getMockState() {
  if (!globalThis.__tiantiMockState) {
    globalThis.__tiantiMockState = createInitialMockState();
  }

  return globalThis.__tiantiMockState;
}

export function setMockState(nextState: ContentState) {
  globalThis.__tiantiMockState = nextState;
}
