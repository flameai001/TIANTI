import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventArchiveCard } from "@/components/site/event-archive-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { PublicReveal } from "@/components/ui/public-reveal";
import { SectionFrame } from "@/components/ui/section-frame";
import { deriveEventTemporalStatus, formatDateRange } from "@/lib/date";
import { getEventPath, getTalentPath } from "@/lib/public-path";
import { getAuthenticatedEditor } from "@/lib/session";
import { buildAbsoluteUrl, buildMetadata } from "@/lib/site";
import { getEventPage } from "@/modules/content/service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getEventPage(slug);

  if (!detail) {
    return buildMetadata({
      title: "TIANTI | 活动详情",
      description: "TIANTI 的公开活动详情页。",
      path: `/events/${slug}`
    });
  }

  return buildMetadata({
    title: `TIANTI | ${detail.event.name}`,
    description: `${detail.event.name} 的公开活动信息、阵容与现场档案。`,
    path: getEventPath(detail.event)
  });
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [detail, viewer] = await Promise.all([getEventPage(slug), getAuthenticatedEditor()]);
  if (!detail) {
    notFound();
  }

  const temporalStatus = deriveEventTemporalStatus(detail.event.startsAt, detail.event.endsAt);
  const statusLabel =
    temporalStatus === "future" ? "未来活动" : temporalStatus === "past" ? "已结束活动" : "待定活动";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: detail.event.name,
    ...(detail.event.startsAt ? { startDate: detail.event.startsAt } : {}),
    ...(detail.event.endsAt ? { endDate: detail.event.endsAt } : {}),
    ...(temporalStatus === "future"
      ? { eventStatus: "https://schema.org/EventScheduled" }
      : temporalStatus === "past"
        ? { eventStatus: "https://schema.org/EventCompleted" }
        : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: detail.event.venue,
      address: detail.event.city
    },
    description: detail.event.note,
    url: buildAbsoluteUrl(getEventPath(detail.event))
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicReveal>
        <section className="surface rounded-[2.4rem] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] ui-muted">
                <span>{detail.event.city || "城市待定"}</span>
                <span>{statusLabel}</span>
              </div>
              <h1 className="text-5xl tracking-[-0.05em] text-[var(--foreground)] md:text-6xl">
                {detail.event.name}
              </h1>
              <div className="space-y-2 text-sm ui-subtle md:text-base">
                <p>{formatDateRange(detail.event.startsAt, detail.event.endsAt)}</p>
                {detail.event.venue ? <p>{detail.event.venue}</p> : null}
              </div>
              {detail.event.note ? <p className="max-w-3xl text-base leading-8 ui-subtle">{detail.event.note}</p> : null}
            </div>

            <div className="grid gap-3">
              <div className="ui-stat">
                <p className="text-sm ui-muted">阵容人数</p>
                <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">{detail.lineups.length}</p>
              </div>
              <div className="ui-stat">
                <p className="text-sm ui-muted">公开档案</p>
                <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">{detail.archives.length}</p>
              </div>
            </div>
          </div>
        </section>
      </PublicReveal>

      <div className="mt-14 space-y-14">
        <PublicReveal>
          <SectionFrame eyebrow="Lineup" title="公开阵容" description="阵容仍然是活动页的第一层内容，未来活动与已归档活动都从这里进入。">
            <section className="surface rounded-[1.9rem] p-6">
              {detail.lineupGroups.length > 0 ? (
                <div className="space-y-6">
                  {detail.lineupGroups.map((group) => (
                    <div key={group.date ?? "single"} className="space-y-3">
                      {group.label ? (
                        <div className="flex items-center justify-between gap-3">
                          <p className="ui-kicker">{group.label}</p>
                          <span className="text-xs ui-muted">{group.items.length} 位达人</span>
                        </div>
                      ) : null}
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((item) => (
                          <Link
                            key={item.lineup.id}
                            href={getTalentPath(item.talent)}
                            className="surface-strong rounded-[1.4rem] p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
                          >
                            <p className="text-lg text-[var(--foreground)]">{item.talent.nickname}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] ui-muted">
                              {item.lineup.status === "confirmed" ? "Confirmed" : "Pending"}
                            </p>
                            {item.lineup.source ? <p className="mt-3 text-sm ui-subtle">{item.lineup.source}</p> : null}
                            {item.lineup.note ? <p className="mt-2 text-sm ui-subtle">{item.lineup.note}</p> : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="暂无公开阵容" description="这场活动还没有公开的阵容信息。" />
              )}
            </section>
          </SectionFrame>
        </PublicReveal>

        <PublicReveal>
          <SectionFrame eyebrow="Archive Layers" title="现场档案" description="从概览进入档案，再从档案继续进入具体人物，是这页的核心阅读顺序。">
            {detail.archives.length === 0 ? (
              <EmptyState
                title={temporalStatus === "future" ? "档案会在活动结束后补齐" : "暂无公开档案"}
                description={
                  temporalStatus === "future"
                    ? "未来活动已经公开了基础信息与阵容，现场档案会在活动结束后逐步补充。"
                    : "这场活动暂时还没有公开的现场档案内容。"
                }
              />
            ) : (
              <div className="grid gap-6">
                {detail.archives.map((archive) => (
                  <article key={archive.archive.id} className="surface rounded-[1.9rem] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4 ui-divider">
                      <div>
                        <p className="ui-kicker">{archive.editor.name}</p>
                        <h2 className="mt-3 text-3xl tracking-[-0.03em] text-[var(--foreground)]">现场记录</h2>
                        {archive.archive.note ? <p className="mt-3 text-sm leading-7 ui-subtle">{archive.archive.note}</p> : null}
                      </div>
                      <p className="text-sm ui-subtle">{archive.entries.length} 条公开记录</p>
                    </div>
                    <div className="mt-6 space-y-6">
                      {archive.entryGroups.map((group) => (
                        <div key={group.date ?? "undated"} className="space-y-4">
                          {group.label ? <p className="ui-kicker">{group.label}</p> : null}
                          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            {group.items.map((entry) => (
                              <EventArchiveCard
                                key={entry.entry.id}
                                canToggleSharedPhoto={Boolean(viewer)}
                                talentId={entry.talent.id}
                                talentSlug={entry.talent.slug}
                                talentName={entry.talent.nickname}
                                cosplayTitle={entry.entry.cosplayTitle}
                                recognized={entry.entry.recognized}
                                sceneAsset={entry.sceneAsset}
                                sharedPhotoAsset={entry.sharedPhotoAsset}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionFrame>
        </PublicReveal>
      </div>
    </PageShell>
  );
}
