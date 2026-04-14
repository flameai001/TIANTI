import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import { buildMetadata } from "@/lib/site";
import { getScopedSearchPage } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = buildMetadata({
  title: "TIANTI | 全站搜索",
  description: "统一检索达人与活动，并支持按范围聚焦结果。",
  path: "/search"
});

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const scopeParam = typeof params.scope === "string" ? params.scope : "all";
  const scope = ["all", "talents", "events"].includes(scopeParam)
    ? (scopeParam as "all" | "talents" | "events")
    : "all";
  const result = q ? await getScopedSearchPage(q, scope) : { talents: [], events: [] };

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Unified Search"
        title="全站搜索"
        description="把达人与活动统一检索，并允许按范围聚焦结果。"
      />
      <form className="surface mt-10 grid gap-3 rounded-[2rem] p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="输入达人昵称、活动名、城市、别名或关键词"
          className="rounded-full bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="scope"
          defaultValue={scope}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="all">全部结果</option>
          <option value="talents">只看达人</option>
          <option value="events">只看活动</option>
        </select>
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          搜索
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/search?q=${encodeURIComponent(q)}&scope=all`}
          className={`rounded-full border px-4 py-2 ${scope === "all" ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-white/12 text-white/70"}`}
        >
          全部
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(q)}&scope=talents`}
          className={`rounded-full border px-4 py-2 ${scope === "talents" ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-white/12 text-white/70"}`}
        >
          达人
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(q)}&scope=events`}
          className={`rounded-full border px-4 py-2 ${scope === "events" ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-white/12 text-white/70"}`}
        >
          活动
        </Link>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section className="surface rounded-[1.8rem] p-6">
          <h2 className="text-2xl text-white">达人结果</h2>
          <div className="mt-5 space-y-4">
            {result.talents.length > 0 ? (
              result.talents.map((talent) => (
                <Link
                  key={talent.id}
                  href={`/talents/${talent.slug}`}
                  className="block border-b border-white/8 pb-4 last:border-none"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-lg text-white">{talent.nickname}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      档案 {talent.archiveCount}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-white/60">{talent.bio}</p>
                  {talent.aliases.length > 0 ? (
                    <p className="mt-2 text-xs text-white/45">别名：{talent.aliases.join(" / ")}</p>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="text-sm text-white/55">暂无达人结果。</p>
            )}
          </div>
        </section>
        <section className="surface rounded-[1.8rem] p-6">
          <h2 className="text-2xl text-white">活动结果</h2>
          <div className="mt-5 space-y-4">
            {result.events.length > 0 ? (
              result.events.map((event) => (
                <Link
                  key={event.event.id}
                  href={`/events/${event.event.slug}`}
                  className="block border-b border-white/8 pb-4 last:border-none"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-lg text-white">{event.event.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      阵容 {event.lineupSize}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    {event.event.city} · {event.event.venue}
                  </p>
                  {event.event.aliases.length > 0 ? (
                    <p className="mt-2 text-xs text-white/45">别名：{event.event.aliases.join(" / ")}</p>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="text-sm text-white/55">暂无活动结果。</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
