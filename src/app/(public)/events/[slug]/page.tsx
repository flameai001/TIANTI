import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDateRange } from "@/lib/date";
import { getEventPage } from "@/modules/content/service";

type Params = Promise<{ slug: string }>;

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getEventPage(slug);
  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <section className="surface rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/45">
          <span>{detail.event.city}</span>
          <span>{detail.event.status === "future" ? "未来活动" : "已结束活动"}</span>
        </div>
        <h1 className="mt-5 text-5xl text-white">{detail.event.name}</h1>
        <div className="mt-4 space-y-1 text-sm text-white/60">
          <p>{formatDateRange(detail.event.startsAt, detail.event.endsAt)}</p>
          <p>{detail.event.venue}</p>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-8 text-white/70">{detail.event.note}</p>
      </section>

      <section className="mt-12">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Lineup</p>
          <h2 className="text-3xl text-white">活动相关达人</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {detail.lineups.map((item) => (
            <article key={item.lineup.id} className="surface rounded-[1.8rem] p-5">
              <p className="text-2xl text-white">{item.talent.nickname}</p>
              <div className="mt-3 flex items-center gap-3 text-sm text-white/55">
                <span>{item.lineup.status === "confirmed" ? "已确认" : "待核实"}</span>
                <span>·</span>
                <span>{item.lineup.source}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/68">{item.lineup.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Archive Layers</p>
          <h2 className="text-3xl text-white">活动现场档案</h2>
        </div>
        <div className="grid gap-6">
          {detail.archives.map((archive) => (
            <article key={archive.archive.id} className="surface rounded-[1.8rem] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-2xl text-white">{archive.editor.name} 的记录</p>
                  <p className="mt-2 text-sm text-white/58">{archive.archive.note}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                  {archive.entries.length} 条现场记录
                </p>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {archive.entries.map((entry) => (
                  <div key={entry.entry.id} className="overflow-hidden rounded-[1.5rem] border border-white/10">
                    <div className="relative aspect-[4/3]">
                      <Image src={entry.sceneAsset.url} alt={entry.sceneAsset.alt} fill className="object-cover" />
                    </div>
                    <div className="space-y-3 p-5">
                      <p className="text-xl text-white">{entry.talent.nickname}</p>
                      <p className="text-sm text-white/60">{entry.entry.cosplayTitle}</p>
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.15em] text-white/55">
                        <span>{entry.entry.recognized ? "已认出" : "未认出"}</span>
                        <span>·</span>
                        <span>{entry.entry.hasSharedPhoto ? "有合照" : "无合照"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
