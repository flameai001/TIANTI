import Link from "next/link";
import { EventCard } from "@/components/site/event-card";
import { SectionHeading } from "@/components/site/section-heading";
import { TalentCard } from "@/components/site/talent-card";
import { formatDate } from "@/lib/date";
import { getHomepageData, getSiteEditors } from "@/modules/content/service";

export default async function HomePage() {
  const [homepage, editors] = await Promise.all([getHomepageData(), getSiteEditors()]);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="noise absolute inset-0" />
        <div className="mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl items-end gap-10 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-14">
          <div className="relative z-10 flex min-h-[64svh] flex-col justify-end gap-8 pb-5 md:pb-8">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.45em] text-[var(--color-accent)]">
                Cosplay · Guofeng · Archive
              </p>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-6xl leading-[0.9] tracking-[0.05em] text-white md:text-[7.6rem]">
                  TIANTI
                </h1>
                <div className="max-w-3xl space-y-3">
                  <p className="text-xl text-white/88 md:text-2xl">
                    一个把人物、活动与编辑视角编进同一条叙事里的公开展示站。
                  </p>
                  <p className="max-w-2xl text-sm leading-8 text-white/68 md:text-base">
                    首版聚焦 cosplay 与国风现场，把未来行程、达人资料、活动档案与双编辑天梯榜压进同一套有策展感的信息结构里。
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
                href="/schedule"
                className="rounded-full border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.25em] text-white"
              >
                看未来行程
              </Link>
            </div>
          </div>
          <div className="relative grid gap-4 self-center md:grid-cols-2">
            {homepage.featuredTalents.map((talent, index) => (
              <div
                key={talent.id}
                className={`surface relative overflow-hidden rounded-[2rem] p-4 ${index === 0 ? "md:col-span-2 md:min-h-[18rem]" : ""}`}
              >
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">Featured</p>
                <div className="mt-12 space-y-3">
                  <p className="text-3xl text-white">{talent.nickname}</p>
                  <p className="max-w-sm text-sm leading-7 text-white/68">{talent.bio}</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {talent.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/65">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Selected Faces"
          title="精选达人入口"
          description="从演示数据开始，先把人物入口和信息层次搭好。之后替换真实资料时，不需要改页面结构。"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {homepage.featuredTalents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Upcoming"
          title="近期未来活动"
          description="未来行程页底层就是未来状态活动的聚合，这里直接提前给出最值得进入的两个入口。"
        />
        <div className="mt-10 grid gap-6">
          {homepage.futureEvents.map((event) => (
            <EventCard key={event.event.id} item={event} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Editors"
          title="双编辑视角"
          description="共享事实统一管理，主观判断各自独立。首页只提炼入口，不在这里堆完整私有记录。"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {editors.map((editor) => (
            <article key={editor.id} className="surface rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">{editor.title}</p>
              <h3 className="mt-4 text-3xl text-white">{editor.name}</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/68">{editor.intro}</p>
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-white/60">
                <span>精选推荐入口已就位</span>
                <Link href={`/ladder?editor=${editor.slug}`} className="text-[var(--color-accent)]">
                  查看 {editor.name} 的天梯榜
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18 md:px-8">
        <SectionHeading
          eyebrow="Recent Updates"
          title="最新档案片段"
          description="活动现场的照片、认出记录和合照都统一沉淀到活动档案页。首页只做最近更新的入口。"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {homepage.recentArchives.map((archive) => (
            <article key={archive.id} className="surface rounded-[2rem] p-6">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
                <span>{archive.id.replace("archive-", "").replaceAll("-", " · ")}</span>
                <span>{formatDate(archive.updatedAt)}</span>
              </div>
              <p className="mt-6 text-lg leading-8 text-white">{archive.note}</p>
              <p className="mt-4 text-sm text-white/55">共记录 {archive.entries.length} 位达人现场片段</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
