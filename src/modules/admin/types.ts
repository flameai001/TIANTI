import type { EventStatus, Talent, TalentTag } from "@/modules/domain/types";

export interface BlockedBulkAction {
  id: string;
  reason: string;
}

export interface BulkActionResult {
  succeededIds: string[];
  blocked: BlockedBulkAction[];
}

export interface TalentBulkPayload {
  action: "add_tags" | "remove_tags" | "delete";
  ids: string[];
  tags?: TalentTag[];
}

export interface EventBulkPayload {
  action: "set_status" | "delete";
  ids: string[];
  status?: EventStatus;
}

export interface TalentBulkResponse extends BulkActionResult {
  talents?: Talent[];
}
