import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getContentState, getEventIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const state = await getContentState();
  const cities = [...new Set(state.events.map((event) => event.city))];
  const requestedCity = typeof params.city === "string" ? params.city : undefined;
  const city = requestedCity && cities.includes(requestedCity) ? requestedCity : undefined;
  const participationStatus =
    typeof params.status === "string" && ["confirmed", "pending"].includes(params.status)
      ? (params.status as "confirmed" | "pending")
      : undefined;
  const requestedTalentId = typeof params.talent === "string" ? params.talent : undefined;
  const talentId = state.talents.some((talent) => talent.id === requestedTalentId)
    ? requestedTalentId
    : undefined;
  const q = typeof params.q === "string" ? params.q : "";
  const startDate = typeof params.from === "string" ? params.from : undefined;
  const endDate = typeof params.to === "string" ? params.to : undefined;
  const events = await getEventIndex({
    status: "future",
    city,
    participationStatus,
    talentId,
    query: q,
    startDate,
    endDate
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Future Schedule"
        title="未来行程"
        description="它不是独立内容类型，而是未来状态活动的聚合视图。这里会按时间顺序展示，并显式标记待核实状态。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-2 xl:grid-cols-[1.3fr_0.9fr_1fr_1fr_0.9fr_0.9fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索活动名、达人名或相关提示"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
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
          <option value="">全部达人</option>
          {state.talents.map((talent) => (
            <option key={talent.id} value={talent.id}>
              {talent.nickname}
            </option>
          ))}
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
        {events.map((event) => (
          <EventCard key={event.event.id} item={event} />
        ))}
      </div>
      {events.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有符合条件的未来活动，试试放宽达人、城市或时间范围。
        </div>
      ) : null}
    </main>
  );
}
