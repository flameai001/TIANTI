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
          <span>{item.event.city}</span>
          <span>{item.event.status === "future" ? "未来" : "归档"}</span>
        </div>
        <div>
          <h3 className="text-2xl text-white">{item.event.name}</h3>
          <p className="mt-2 text-sm text-white/68">{formatDateRange(item.event.startsAt, item.event.endsAt)}</p>
          <p className="mt-1 text-sm text-white/50">{item.event.venue}</p>
        </div>
        <p className="text-sm leading-7 text-white/70">{item.event.note}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {item.lineups.map((lineup) => (
          <div key={lineup.lineup.id} className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
            <p className="text-lg text-white">{lineup.talent.nickname}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{lineup.lineup.source}</p>
            <p className="mt-3 text-sm text-white/65">
              {lineup.lineup.status === "confirmed" ? "已确认" : "待核实"} · {lineup.lineup.note}
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}
