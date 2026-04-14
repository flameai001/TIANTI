import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateRange } from "@/lib/date";
import { buildAbsoluteUrl, buildMetadata } from "@/lib/site";
import { getEventPage } from "@/modules/content/service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getEventPage(slug);

  if (!detail) {
    return buildMetadata({
      title: "TIANTI | 活动详情",
      description: "公开活动详情页",
      path: `/events/${slug}`
    });
  }

  return buildMetadata({
    title: `TIANTI | ${detail.event.name}`,
    description: `${detail.event.name} 的公开活动信息、阵容与现场档案。`,
    path: `/events/${slug}`
  });
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getEventPage(slug);
  if (!detail) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: detail.event.name,
    startDate: detail.event.startsAt,
    endDate: detail.event.endsAt ?? undefined,
    eventStatus:
      detail.event.status === "future"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: detail.event.venue,
      address: detail.event.city
    },
    description: detail.event.note,
    url: buildAbsoluteUrl(`/events/${detail.event.slug}`)
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="surface rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/45">
          <span>{detail.event.city}</span>
          <span>{detail.event.status === "future" ? "未来活动" : "已结束活动"}</span>
        </div>
        <h1 className="mt-5 text-5xl text-white">{detail.event.name}</h1>
        <div className="mt-4 space-y-1 text-sm text-white/60">
          <p>{formatDateRange(detail.event.startsAt, detail.event.endsAt)}</p>
          <p>{detail.event.venue}</p>
          {detail.event.aliases.length > 0 ? <p>别名：{detail.event.aliases.join(" / ")}</p> : null}
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-8 text-white/70">{detail.event.note}</p>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <article className="surface rounded-[1.8rem] p-6">
          <div className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Lineup</p>
            <h2 className="text-3xl text-white">同场阵容达人</h2>
          </div>
          <div className="space-y-4">
            {detail.relatedTalents.length > 0 ? (
              detail.relatedTalents.map((item) => (
                <Link key={item.talent.id} href={`/talents/${item.talent.slug}`} className="block border-b border-white/8 pb-4 last:border-none">
                  <p className="text-lg text-white">{item.talent.nickname}</p>
                  <p className="mt-2 text-sm text-white/60">{item.reason}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-white/55">当前没有可公开的阵容达人。</p>
            )}
          </div>
        </article>
        <article className="surface rounded-[1.8rem] p-6">
          <div className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Related Events</p>
            <h2 className="text-3xl text-white">相关活动</h2>
          </div>
          <div className="space-y-4">
            {detail.relatedEvents.length > 0 ? (
              detail.relatedEvents.map((item) => (
                <Link key={item.event.event.id} href={`/events/${item.event.event.slug}`} className="block border-b border-white/8 pb-4 last:border-none">
                  <p className="text-lg text-white">{item.event.event.name}</p>
                  <p className="mt-2 text-sm text-white/60">{item.reason}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-white/55">暂时没有可公开的相关活动。</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-12">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Archive Layers</p>
          <h2 className="text-3xl text-white">活动现场档案</h2>
        </div>
        {detail.archives.length === 0 ? (
          <div className="surface rounded-[1.8rem] px-6 py-10 text-center text-white/68">
            {detail.event.status === "future"
              ? "这场未来活动已经公开基础信息和阵容，现场档案会在活动结束后补充。"
              : "这场活动暂时还没有公开的现场档案。"}
          </div>
        ) : (
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
                        <Image
                          src={entry.sceneAsset.url}
                          alt={entry.sceneAsset.alt}
                          fill
                          sizes="(min-width: 768px) 42vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-3 p-5">
                        <Link href={`/talents/${entry.talent.slug}`} className="text-xl text-white">
                          {entry.talent.nickname}
                        </Link>
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
        )}
      </section>
    </main>
  );
}
