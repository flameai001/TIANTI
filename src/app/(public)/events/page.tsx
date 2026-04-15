import { AutoFilterForm } from "@/components/site/auto-filter-form";
import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { compareByPinyin } from "@/lib/pinyin";
import { buildMetadata } from "@/lib/site";
import { getContentState, getEventIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const sortLabels = {
  recent: "最近发生",
  upcoming: "即将发生",
  lineupSize: "阵容规模"
} as const;

export const metadata = buildMetadata({
  title: "TIANTI | 活动发现",
  description: "按时间、城市、阵容达人和排序方式浏览活动档案与未来活动。",
  path: "/events"
});

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const eventStatus =
    typeof params.eventStatus === "string" && ["future", "past"].includes(params.eventStatus)
      ? (params.eventStatus as "future" | "past")
      : undefined;
  const requestedSort = typeof params.sort === "string" ? params.sort : undefined;
  const sort =
    requestedSort && ["recent", "upcoming", "lineupSize"].includes(requestedSort)
      ? (requestedSort as "recent" | "upcoming" | "lineupSize")
      : undefined;
  const state = await getContentState();
  const cities = [...new Set(state.events.map((event) => event.city).filter(Boolean))].sort(compareByPinyin);
  const requestedCity = typeof params.city === "string" ? params.city : undefined;
  const city = requestedCity && cities.includes(requestedCity) ? requestedCity : undefined;
  const requestedTalentId = typeof params.talent === "string" ? params.talent : undefined;
  const talentId = state.talents.some((talent) => talent.id === requestedTalentId) ? requestedTalentId : undefined;
  const date = typeof params.date === "string" ? params.date : undefined;
  const events = await getEventIndex({
    query: q,
    eventStatus,
    city,
    talentId,
    date,
    sort
  });

  const activeSort = sort ?? "recent";

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Event Discovery"
        title="活动发现"
        description="这里同时浏览未来活动和已结束活动，并把城市、阵容和档案上下文压进同一条发现路径。"
      />
      <AutoFilterForm className="surface mt-6 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-2 xl:grid-cols-[1.25fr_0.85fr_0.85fr_1fr_0.95fr_0.85fr]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索活动名、城市、场馆或阵容达人"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="eventStatus"
          defaultValue={eventStatus ?? ""}
          data-auto-submit="true"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部活动状态</option>
          <option value="future">未来活动</option>
          <option value="past">已结束活动</option>
        </select>
        <select
          name="city"
          defaultValue={city ?? ""}
          data-auto-submit="true"
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
          data-auto-submit="true"
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
          name="date"
          defaultValue={date ?? ""}
          data-auto-submit="true"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="sort"
          defaultValue={activeSort}
          data-auto-submit="true"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="recent">按最近发生</option>
          <option value="upcoming">按即将发生</option>
          <option value="lineupSize">按阵容规模</option>
        </select>
      </AutoFilterForm>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
        <p>
          共找到 <span className="text-white">{events.length}</span> 场活动
        </p>
        <p>当前排序：{sortLabels[activeSort]}</p>
      </div>
      <div className="mt-10 grid gap-6">
        {events.length > 0 ? events.map((event) => <EventCard key={event.event.id} item={event} />) : null}
      </div>
      {events.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有符合条件的活动，试试放宽活动状态、日期或阵容达人。
        </div>
      ) : null}
    </main>
  );
}
