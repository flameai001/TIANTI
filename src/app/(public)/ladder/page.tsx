import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import { getLadderPage, getSiteEditors } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LadderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const editors = await getSiteEditors();
  const editorSlug =
    typeof params.editor === "string" && editors.some((editor) => editor.slug === params.editor)
      ? params.editor
      : editors[0]?.slug;
  const data = editorSlug ? await getLadderPage(editorSlug) : null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Ladder Board"
        title="双编辑天梯榜"
        description="每位编辑维护自己的梯度与排序。前台只负责公开查看与切换，不承担后台互相查看区。"
      />
      <div className="mt-10 flex flex-wrap gap-3">
        {editors.map((editor) => {
          const active = editor.slug === editorSlug;
          return (
            <Link
              key={editor.id}
              href={`/ladder?editor=${editor.slug}`}
              className={`rounded-full px-5 py-3 text-sm uppercase tracking-[0.2em] ${
                active ? "bg-[var(--color-accent)] text-black" : "border border-white/15 text-white/70"
              }`}
            >
              {editor.name}
            </Link>
          );
        })}
      </div>
      {data ? (
        <>
          <div className="mt-8 surface rounded-[1.8rem] p-6">
            <h2 className="text-3xl text-white">{data.ladder.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">{data.ladder.subtitle}</p>
          </div>
          <div className="mt-8 grid gap-6">
            {data.tiers.map((tier) => (
              <section key={tier.id} className="surface rounded-[1.8rem] p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-2xl text-white">{tier.name}</h3>
                  <p className="text-sm text-white/45">{tier.talents.length} 位达人</p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tier.talents.length > 0 ? (
                    tier.talents.map(({ talent }) => (
                      <Link
                        key={talent.id}
                        href={`/talents/${talent.slug}`}
                        className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-5 text-white/80 transition hover:border-white/25"
                      >
                        <p className="text-xl text-white">{talent.nickname}</p>
                        <p className="mt-2 text-sm text-white/58">{talent.tags.join(" · ")}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-white/55">这个梯度还没有放入达人。</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
