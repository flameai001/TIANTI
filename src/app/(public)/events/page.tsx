import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getEventIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status =
    typeof params.status === "string" && ["future", "past"].includes(params.status)
      ? (params.status as "future" | "past")
      : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;
  const events = await getEventIndex({ query: q, status, city });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Event Archive"
        title="活动档案入口"
        description="这里按活动浏览，公共信息、关联达人和个人活动档案会被汇到同一条页面里。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索活动、地点或备注"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部状态</option>
          <option value="future">未来</option>
          <option value="past">已结束</option>
        </select>
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
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          筛选
        </button>
      </form>
      <div className="mt-10 grid gap-6">
        {events.length > 0 ? events.map((event) => <EventCard key={event.event.id} item={event} />) : null}
      </div>
      {events.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有符合条件的活动，试试放宽城市或状态筛选。
        </div>
      ) : null}
    </main>
  );
}
