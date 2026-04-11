import { demoSeedState } from "@/modules/domain/seed";
import type { ContentState } from "@/modules/domain/types";

function cloneState(state: ContentState): ContentState {
  return JSON.parse(JSON.stringify(state)) as ContentState;
}

declare global {
  var __tiantiMockState: ContentState | undefined;
}

export function getMockState() {
  if (!globalThis.__tiantiMockState) {
    globalThis.__tiantiMockState = cloneState(demoSeedState);
  }

  return globalThis.__tiantiMockState;
}

export function setMockState(nextState: ContentState) {
  globalThis.__tiantiMockState = nextState;
}
