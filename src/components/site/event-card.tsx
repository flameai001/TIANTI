import Link from "next/link";
import { formatDateRange } from "@/lib/date";
import type { EventSummary } from "@/modules/domain/types";

export function EventCard({ item }: { item: EventSummary }) {
  return (
    <Link
      href={`/events/${item.event.slug}`}
      className="grid gap-5 rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 transition hover:border-white/20 md:grid-cols-[1fr_1.15fr]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/45">
          <span>{item.event.city || "城市待定"}</span>
          <span>{item.event.status === "future" ? "未来" : "归档"}</span>
        </div>
        <div>
          <h3 className="text-2xl text-white">{item.event.name}</h3>
          <p className="mt-2 text-sm text-white/68">{formatDateRange(item.event.startsAt, item.event.endsAt)}</p>
          {item.event.venue ? <p className="mt-1 text-sm text-white/50">{item.event.venue}</p> : null}
        </div>
        {item.event.note ? <p className="text-sm leading-7 text-white/70">{item.event.note}</p> : null}
        </div>
      <div className="space-y-4">
        {item.lineupGroups.length > 0 ? (
          item.lineupGroups.map((group) => (
            <div key={group.date ?? "single"} className="space-y-2">
              {group.label ? (
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">{group.label}</p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {group.items.map((lineup) => (
                  <div key={lineup.lineup.id} className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-sm text-white">{lineup.talent.nickname}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {lineup.lineup.status === "confirmed" ? "已确认" : "待确认"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 px-4 py-6 text-sm text-white/52">
            暂无公开阵容
          </div>
        )}
      </div>
    </Link>
  );
}
