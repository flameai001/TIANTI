import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getEventIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const city = typeof params.city === "string" ? params.city : undefined;
  const participationStatus =
    typeof params.status === "string" && ["confirmed", "pending"].includes(params.status)
      ? (params.status as "confirmed" | "pending")
      : undefined;
  const q = typeof params.q === "string" ? params.q : "";
  const events = await getEventIndex({ status: "future", city, participationStatus, query: q });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Future Schedule"
        title="未来行程"
        description="它不是独立内容类型，而是未来状态活动的聚合视图。前台会清楚标识待核实状态。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-[1.3fr_1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索活动名或达人相关提示"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="city"
          defaultValue={city ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部城市</option>
          <option value="上海">上海</option>
          <option value="南京">南京</option>
          <option value="杭州">杭州</option>
        </select>
        <select
          name="status"
          defaultValue={participationStatus ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部参与状态</option>
          <option value="confirmed">已确认</option>
          <option value="pending">待核实</option>
        </select>
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          筛选
        </button>
      </form>
      <div className="mt-10 grid gap-6">
        {events.map((event) => (
          <EventCard key={event.event.id} item={event} />
        ))}
      </div>
    </main>
  );
}
