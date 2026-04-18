import Link from "next/link";
import { formatDateRange } from "@/lib/date";
import { getEventPath } from "@/lib/public-path";
import type { EventSummary } from "@/modules/domain/types";

export function EventCard({ item }: { item: EventSummary }) {
  const statusLabel =
    item.temporalStatus === "future" ? "未来活动" : item.temporalStatus === "past" ? "已结束活动" : "待定活动";

  return (
    <Link
      href={getEventPath(item.event)}
      className="surface group grid gap-6 rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-strong)] md:grid-cols-[0.78fr_1.22fr]"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] ui-muted">
          <span>{item.event.city || "城市待定"}</span>
          <span>{statusLabel}</span>
        </div>
        <div className="space-y-3">
          <h3 className="text-3xl tracking-[-0.04em] text-[var(--foreground)]">{item.event.name}</h3>
          <div className="space-y-1 text-sm ui-subtle">
            <p>{formatDateRange(item.event.startsAt, item.event.endsAt)}</p>
            {item.event.venue ? <p>{item.event.venue}</p> : null}
          </div>
        </div>
        {item.event.note ? <p className="text-sm leading-7 ui-subtle">{item.event.note}</p> : null}
      </div>
      <div className="space-y-4">
        {item.lineupGroups.length > 0 ? (
          item.lineupGroups.map((group) => (
            <div key={group.date ?? "single"} className="space-y-3">
              {group.label ? <p className="ui-kicker">{group.label}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {group.items.map((lineup) => (
                  <div key={lineup.lineup.id} className="surface-strong rounded-[1.15rem] p-3">
                    <p className="text-sm text-[var(--foreground)]">{lineup.talent.nickname}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] ui-muted">
                      {lineup.lineup.status === "confirmed" ? "Confirmed" : "Pending"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.15rem] border border-dashed border-[var(--line-strong)] px-4 py-6 text-sm ui-subtle">
            暂无公开阵容
          </div>
        )}
      </div>
    </Link>
  );
}
