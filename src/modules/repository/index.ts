import "server-only";

import { isMockContentMode } from "@/lib/env";
import { mockRepository } from "@/modules/repository/mock-repository";
import { postgresRepository } from "@/modules/repository/postgres-repository";

export function getContentRepository() {
  return isMockContentMode() ? mockRepository : postgresRepository;
}
