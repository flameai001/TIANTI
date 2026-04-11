import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import { getSearchPage } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const result = q ? await getSearchPage(q) : { talents: [], events: [] };

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Unified Search"
        title="全站搜索"
        description="首版统一搜索达人与活动，并把结果按分组展示。"
      />
      <form className="surface mt-10 flex gap-3 rounded-full p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="输入达人昵称、活动名或城市"
          className="flex-1 rounded-full bg-transparent px-4 py-3 text-sm outline-none"
        />
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          搜索
        </button>
      </form>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section className="surface rounded-[1.8rem] p-6">
          <h2 className="text-2xl text-white">达人结果</h2>
          <div className="mt-5 space-y-4">
            {result.talents.length > 0 ? (
              result.talents.map((talent) => (
                <Link key={talent.id} href={`/talents/${talent.slug}`} className="block border-b border-white/8 pb-4 last:border-none">
                  <p className="text-lg text-white">{talent.nickname}</p>
                  <p className="mt-2 text-sm text-white/60">{talent.bio}</p>
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
                <Link key={event.event.id} href={`/events/${event.event.slug}`} className="block border-b border-white/8 pb-4 last:border-none">
                  <p className="text-lg text-white">{event.event.name}</p>
                  <p className="mt-2 text-sm text-white/60">{event.event.city} · {event.event.venue}</p>
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
