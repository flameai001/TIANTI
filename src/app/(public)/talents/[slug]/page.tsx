import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDateRange } from "@/lib/date";
import { getTalentPage } from "@/modules/content/service";

type Params = Promise<{ slug: string }>;

export default async function TalentDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getTalentPage(slug);

  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <section className="grid gap-8 md:grid-cols-[0.75fr_1.25fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10">
          <div className="relative aspect-[4/5]">
            <Image
              src={detail.cover.url}
              alt={detail.cover.alt}
              fill
              sizes="(min-width: 768px) 34vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Talent Detail</p>
            <h1 className="text-5xl text-white">{detail.talent.nickname}</h1>
            <p className="max-w-3xl text-sm leading-8 text-white/70">{detail.talent.bio}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.talent.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/65">
                {tag}
              </span>
            ))}
          </div>
          <div className="surface rounded-[1.8rem] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">公共资料</p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-white/45">MCN</p>
                <p className="mt-2 text-lg text-white">{detail.talent.mcn}</p>
              </div>
              <div>
                <p className="text-sm text-white/45">常用平台</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {detail.talent.links.map((link) => (
                    <a key={link.id} href={link.url} className="text-sm text-[var(--color-accent)]">
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="surface rounded-[1.8rem] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">即将参加的活动</p>
              <div className="mt-5 space-y-4">
                {detail.futureEvents.length > 0 ? (
                  detail.futureEvents.map((event) => (
                    <div key={event.id} className="border-b border-white/8 pb-4 last:border-none last:pb-0">
                      <p className="text-lg text-white">{event.name}</p>
                      <p className="mt-2 text-sm text-white/60">
                        {event.city} · {formatDateRange(event.startsAt, event.endsAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/55">当前没有公开未来活动。</p>
                )}
              </div>
            </div>
            <div className="surface rounded-[1.8rem] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">已参加活动</p>
              <div className="mt-5 space-y-4">
                {detail.pastEvents.length > 0 ? (
                  detail.pastEvents.map((event) => (
                    <div key={event.id} className="border-b border-white/8 pb-4 last:border-none last:pb-0">
                      <p className="text-lg text-white">{event.name}</p>
                      <p className="mt-2 text-sm text-white/60">
                        {event.city} · {formatDateRange(event.startsAt, event.endsAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/55">还没有历史活动记录。</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-18 grid gap-6 md:grid-cols-3">
        {detail.editorSummaries.map((summary) => (
          <article key={summary.editor.id} className="surface rounded-[1.8rem] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">{summary.editor.name} 的摘要</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm text-white/45">天梯位置</p>
                <p className="mt-1 text-xl text-white">{summary.tierName ?? "未入榜"}</p>
              </div>
              <div>
                <p className="text-sm text-white/45">见过次数</p>
                <p className="mt-1 text-xl text-white">{summary.seenCount}</p>
              </div>
              <div>
                <p className="text-sm text-white/45">合照次数</p>
                <p className="mt-1 text-xl text-white">{summary.sharedPhotoCount}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-18">
        <div className="mb-8 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Representation</p>
          <h2 className="text-3xl text-white">代表角色与作品</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {detail.representationAssets.map((representation) => (
            <article key={representation.id} className="overflow-hidden rounded-[1.8rem] border border-white/10">
              <div className="relative aspect-[4/3]">
                <Image
                  src={representation.asset.url}
                  alt={representation.asset.alt}
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-lg text-white">{representation.title}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
