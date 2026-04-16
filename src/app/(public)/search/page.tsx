import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageShell } from "@/components/ui/page-shell";
import { SectionFrame } from "@/components/ui/section-frame";
import { buildMetadata } from "@/lib/site";
import { getScopedSearchPage } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = buildMetadata({
  title: "TIANTI | 搜索",
  description: "用统一检索同时浏览达人与活动，并按结果范围快速聚焦。",
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
    <PageShell>
      <SectionFrame
        eyebrow="Unified Search"
        title="在一个入口里同时检索达人与活动"
        description="先输入关键词，再决定要看全部结果、只看达人，还是只看活动。"
      />

      <div className="mt-10 space-y-8">
        <FilterBar>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              name="q"
              defaultValue={q}
              placeholder="输入达人昵称、活动名、城市、标签或别名"
              className="ui-input rounded-full"
            />
            <select name="scope" defaultValue={scope} className="ui-select rounded-full">
              <option value="all">全部结果</option>
              <option value="talents">只看达人</option>
              <option value="events">只看活动</option>
            </select>
            <button className="ui-button-primary text-sm">搜索</button>
          </form>
        </FilterBar>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/search?q=${encodeURIComponent(q)}&scope=all`}
            className={`ui-pill px-4 py-2 ${scope === "all" ? "border-[rgba(43,109,246,0.22)] text-[var(--color-accent)]" : ""}`}
          >
            全部
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(q)}&scope=talents`}
            className={`ui-pill px-4 py-2 ${scope === "talents" ? "border-[rgba(43,109,246,0.22)] text-[var(--color-accent)]" : ""}`}
          >
            达人
          </Link>
          <Link
            href={`/search?q=${encodeURIComponent(q)}&scope=events`}
            className={`ui-pill px-4 py-2 ${scope === "events" ? "border-[rgba(43,109,246,0.22)] text-[var(--color-accent)]" : ""}`}
          >
            活动
          </Link>
        </div>

        {!q ? (
          <EmptyState
            title="先输入一个关键词"
            description="你可以从昵称、活动名、城市、标签、别名或阵容信息开始。"
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="surface rounded-[1.9rem] p-6">
              <div className="border-b pb-4 ui-divider">
                <p className="ui-kicker">Talent Results</p>
                <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">达人结果</h2>
              </div>
              <div className="mt-5 space-y-4">
                {result.talents.length > 0 ? (
                  result.talents.map((talent) => (
                    <Link
                      key={talent.id}
                      href={`/talents/${talent.slug}`}
                      className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg text-[var(--foreground)]">{talent.nickname}</p>
                        <p className="text-xs uppercase tracking-[0.18em] ui-muted">档案 {talent.archiveCount}</p>
                      </div>
                      <p className="mt-2 text-sm ui-subtle">{talent.bio || "暂未公开简介。"}</p>
                      {talent.aliases.length > 0 ? (
                        <p className="mt-2 text-xs ui-muted">别名：{talent.aliases.join(" / ")}</p>
                      ) : null}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm ui-subtle">没有匹配的达人结果。</p>
                )}
              </div>
            </section>

            <section className="surface rounded-[1.9rem] p-6">
              <div className="border-b pb-4 ui-divider">
                <p className="ui-kicker">Event Results</p>
                <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">活动结果</h2>
              </div>
              <div className="mt-5 space-y-4">
                {result.events.length > 0 ? (
                  result.events.map((event) => (
                    <Link
                      key={event.event.id}
                      href={`/events/${event.event.slug}`}
                      className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-lg text-[var(--foreground)]">{event.event.name}</p>
                        <p className="text-xs uppercase tracking-[0.18em] ui-muted">阵容 {event.lineupSize}</p>
                      </div>
                      <p className="mt-2 text-sm ui-subtle">
                        {[event.event.city, event.event.venue].filter(Boolean).join(" · ")}
                      </p>
                      {event.event.aliases.length > 0 ? (
                        <p className="mt-2 text-xs ui-muted">别名：{event.event.aliases.join(" / ")}</p>
                      ) : null}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm ui-subtle">没有匹配的活动结果。</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </PageShell>
  );
}
