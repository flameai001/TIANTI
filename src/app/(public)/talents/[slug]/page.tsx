import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PublicReveal } from "@/components/ui/public-reveal";
import { SectionFrame } from "@/components/ui/section-frame";
import { formatDateRange } from "@/lib/date";
import { buildMetadata } from "@/lib/site";
import { getTalentPage } from "@/modules/content/service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getTalentPage(slug);

  if (!detail) {
    return buildMetadata({
      title: "TIANTI | 达人详情",
      description: "TIANTI 的公开达人详情页。",
      path: `/talents/${slug}`
    });
  }

  return buildMetadata({
    title: `TIANTI | ${detail.talent.nickname}`,
    description: `${detail.talent.nickname} 的公开资料、相关活动与编辑摘要。`,
    path: `/talents/${slug}`
  });
}

export default async function TalentDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getTalentPage(slug);

  if (!detail) {
    notFound();
  }

  const publicInfoRows = [
    detail.talent.aliases.length > 0 ? { label: "别名", value: detail.talent.aliases.join(" / ") } : null,
    detail.talent.mcn ? { label: "所属机构", value: detail.talent.mcn } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <PageShell>
      <PublicReveal>
        <section className="surface overflow-hidden rounded-[2.4rem] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_top,rgba(43,109,246,0.12),rgba(255,255,255,0.08)_48%,rgba(24,33,47,0.08))]">
              <div className="relative aspect-[4/5]">
                {detail.cover ? (
                  <Image
                    src={detail.cover.url}
                    alt={detail.cover.alt}
                    fill
                    sizes="(min-width: 1024px) 36vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <p className="ui-kicker">Talent Detail</p>
                <h1 className="text-5xl tracking-[-0.05em] text-[var(--foreground)] md:text-6xl">
                  {detail.talent.nickname}
                </h1>
                <p className="max-w-3xl text-base leading-8 ui-subtle">
                  {detail.talent.bio || "当前公开页以结构化资料为主，后续内容会继续补齐。"}
                </p>
              </div>

              {detail.talent.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.talent.tags.map((tag) => (
                    <span key={tag} className="ui-pill px-4 py-2 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {publicInfoRows.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {publicInfoRows.map((row) => (
                    <div key={row.label} className="surface-strong rounded-[1.4rem] p-4">
                      <p className="text-sm ui-muted">{row.label}</p>
                      <p className="mt-2 text-lg text-[var(--foreground)]">{row.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {detail.editorSummaries.map((summary) => (
                  <div key={summary.editor.id} className="surface-strong rounded-[1.4rem] p-4">
                    <p className="text-sm ui-muted">{summary.editor.name}</p>
                    <p className="mt-2 text-lg text-[var(--foreground)]">{summary.tierName ?? "未入榜"}</p>
                    <div className="mt-3 flex gap-4 text-sm ui-subtle">
                      <span>{summary.seenCount} 次记录</span>
                      <span>{summary.sharedPhotoCount} 张合照</span>
                    </div>
                  </div>
                ))}
              </div>

              {detail.talent.links.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {detail.talent.links.map((link) => (
                    <a key={link.id} href={link.url} className="ui-button-secondary px-4 py-2 text-sm">
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </PublicReveal>

      <div className="mt-14 space-y-14">
        <PublicReveal>
          <SectionFrame
            eyebrow="Activity Path"
            title="从未来活动到历史记录"
            description="先看即将发生的公开活动，再回到已经完成归档的历史出现，阅读路径更顺。"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <section className="surface rounded-[1.9rem] p-6">
                <div className="border-b pb-4 ui-divider">
                  <p className="ui-kicker">Upcoming</p>
                  <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">即将参与</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {detail.futureEvents.length > 0 ? (
                    detail.futureEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                      >
                        <p className="text-lg text-[var(--foreground)]">{event.name}</p>
                        <p className="mt-2 text-sm ui-subtle">
                          {[event.city, formatDateRange(event.startsAt, event.endsAt)].filter(Boolean).join(" · ")}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm ui-subtle">当前没有公开的未来活动。</p>
                  )}
                </div>
              </section>

              <section className="surface rounded-[1.9rem] p-6">
                <div className="border-b pb-4 ui-divider">
                  <p className="ui-kicker">Archive</p>
                  <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">历史出现</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {detail.pastEvents.length > 0 ? (
                    detail.pastEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                      >
                        <p className="text-lg text-[var(--foreground)]">{event.name}</p>
                        <p className="mt-2 text-sm ui-subtle">
                          {[event.city, formatDateRange(event.startsAt, event.endsAt)].filter(Boolean).join(" · ")}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm ui-subtle">还没有可公开的历史活动记录。</p>
                  )}
                </div>
              </section>
            </div>
          </SectionFrame>
        </PublicReveal>

        <PublicReveal>
          <SectionFrame
            eyebrow="Representation"
            title="代表图像"
            description="用图像作为中段阅读重心，减少纯文字堆叠带来的疲劳。"
          >
            {detail.representationAssets.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {detail.representationAssets.map((representation) => (
                  <article key={representation.id} className="surface overflow-hidden rounded-[1.9rem]">
                    <div className="relative aspect-[4/5]">
                      <Image
                        src={representation.asset.url}
                        alt={representation.asset.alt}
                        fill
                        sizes="(min-width: 1280px) 28vw, (min-width: 768px) 42vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-lg text-[var(--foreground)]">{representation.title}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂时没有公开代表图像"
                description="后续如果补充代表图或角色图，会优先出现在这一段。"
              />
            )}
          </SectionFrame>
        </PublicReveal>

        <PublicReveal>
          <SectionFrame
            eyebrow="Related Content"
            title="继续阅读相关人物与活动"
            description="从共现关系和活动上下文继续扩展浏览，而不是在单页上停住。"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="surface rounded-[1.9rem] p-6">
                <div className="border-b pb-4 ui-divider">
                  <p className="ui-kicker">Related Talents</p>
                  <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">相关达人</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {detail.relatedTalents.length > 0 ? (
                    detail.relatedTalents.map((item) => (
                      <Link
                        key={item.talent.id}
                        href={`/talents/${item.talent.slug}`}
                        className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                      >
                        <p className="text-lg text-[var(--foreground)]">{item.talent.nickname}</p>
                        <p className="mt-2 text-sm ui-subtle">{item.reason}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm ui-subtle">暂时没有可公开的相关达人。</p>
                  )}
                </div>
              </section>

              <section className="surface rounded-[1.9rem] p-6">
                <div className="border-b pb-4 ui-divider">
                  <p className="ui-kicker">Related Events</p>
                  <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">相关活动</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {detail.relatedEvents.length > 0 ? (
                    detail.relatedEvents.map((item) => (
                      <Link
                        key={item.event.event.id}
                        href={`/events/${item.event.event.slug}`}
                        className="block border-b pb-4 last:border-none last:pb-0 ui-divider"
                      >
                        <p className="text-lg text-[var(--foreground)]">{item.event.event.name}</p>
                        <p className="mt-2 text-sm ui-subtle">{item.reason}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm ui-subtle">暂时没有可公开的相关活动。</p>
                  )}
                </div>
              </section>
            </div>
          </SectionFrame>
        </PublicReveal>
      </div>
    </PageShell>
  );
}
