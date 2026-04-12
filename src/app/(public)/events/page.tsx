import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getContentState, getEventIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status =
    typeof params.status === "string" && ["future", "past"].includes(params.status)
      ? (params.status as "future" | "past")
      : undefined;
  const state = await getContentState();
  const cities = [...new Set(state.events.map((event) => event.city))];
  const requestedCity = typeof params.city === "string" ? params.city : undefined;
  const city = requestedCity && cities.includes(requestedCity) ? requestedCity : undefined;
  const requestedTalentId = typeof params.talent === "string" ? params.talent : undefined;
  const talentId = state.talents.some((talent) => talent.id === requestedTalentId)
    ? requestedTalentId
    : undefined;
  const startDate = typeof params.from === "string" ? params.from : undefined;
  const endDate = typeof params.to === "string" ? params.to : undefined;
  const events = await getEventIndex({ query: q, status, city, talentId, startDate, endDate });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Event Archive"
        title="活动档案入口"
        description="这里按活动浏览，把公共信息、相关达人和活动现场档案汇到同一条详情页里。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_0.9fr_0.9fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索活动、地点、达人或备注"
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
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          name="talent"
          defaultValue={talentId ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部相关达人</option>
          {state.talents.map((talent) => (
            <option key={talent.id} value={talent.id}>
              {talent.nickname}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={startDate ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <input
          type="date"
          name="to"
          defaultValue={endDate ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          筛选
        </button>
      </form>
      <div className="mt-10 grid gap-6">
        {events.length > 0 ? events.map((event) => <EventCard key={event.event.id} item={event} />) : null}
      </div>
      {events.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有符合条件的活动，试试放宽时间、城市或达人筛选。
        </div>
      ) : null}
    </main>
  );
}
