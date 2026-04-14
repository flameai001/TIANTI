import Link from "next/link";
import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { TalentCard } from "@/components/site/talent-card";
import { buildMetadata } from "@/lib/site";
import { getHomepageData } from "@/modules/content/service";

export const metadata = buildMetadata({
  title: "TIANTI | 发现入口",
  description: "从近期活动、最近更新达人、标签入口和双编辑视角切入 TIANTI 的公开内容库。",
  path: "/"
});

export default async function HomePage() {
  const homepage = await getHomepageData();

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="noise absolute inset-0" />
        <div className="mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl items-end gap-10 px-5 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-14">
          <div className="relative z-10 flex min-h-[64svh] flex-col justify-end gap-8 pb-5 md:pb-8">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.45em] text-[var(--color-accent)]">
                Discovery · Archive · Editorial View
              </p>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-6xl leading-[0.9] tracking-[0.05em] text-white md:text-[7.6rem]">
                  TIANTI
                </h1>
                <div className="max-w-3xl space-y-3">
                  <p className="text-xl text-white/88 md:text-2xl">
                    一个把达人、活动、天梯和现场档案串成发现路径的公开站。
                  </p>
                  <p className="max-w-2xl text-sm leading-8 text-white/68 md:text-base">
                    v3 首页不再只做展示，而是直接把“近期活动”“最近更新”“标签切入”和“双编辑视角”变成可跳转的发现入口。
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/talents"
                className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm uppercase tracking-[0.25em] text-black"
              >
                浏览达人
              </Link>
              <Link
                href="/events?eventStatus=future&sort=upcoming"
                className="rounded-full border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.25em] text-white"
              >
                看近期活动
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="surface rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">按标签发现</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {homepage.tagSpotlights.map((spotlight) => (
                  <Link
                    key={spotlight.tag}
                    href={spotlight.href}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
                  >
                    {spotlight.tag} · {spotlight.count}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {homepage.editorSpotlights.map((spotlight) => (
                <article key={spotlight.editor.id} className="surface rounded-[2rem] p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/45">{spotlight.editor.title}</p>
                  <h2 className="mt-3 text-2xl text-white">{spotlight.editor.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/65">{spotlight.summary}</p>
                  <Link href={spotlight.href} className="mt-5 inline-block text-sm text-[var(--color-accent)]">
                    查看视角入口
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Upcoming"
          title="近期活动"
          description="优先从未来活动切入内容，直接进入详情页继续向达人和相关活动扩散。"
        />
        <div className="mt-10 grid gap-6">
          {homepage.futureEvents.map((event) => (
            <EventCard key={event.event.id} item={event} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Recently Updated"
          title="最近更新达人"
          description="把最近有维护动作的达人直接暴露出来，缩短从首页到人物详情的路径。"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {homepage.recentTalents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Ladder Entry"
          title="天梯亮点"
          description="从不同编辑的公开排序切入，也是一条发现高关注达人的捷径。"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {homepage.ladderSpotlights.map((spotlight) => (
            <article key={spotlight.ladder.id} className="surface rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">{spotlight.ladder.title}</p>
              <h3 className="mt-4 text-3xl text-white">{spotlight.topTier.name}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">
                当前高位梯度共收录 {spotlight.topTier.talentIds.length} 位达人。
              </p>
              <Link href={spotlight.href} className="mt-5 inline-block text-sm text-[var(--color-accent)]">
                打开公开天梯榜
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
