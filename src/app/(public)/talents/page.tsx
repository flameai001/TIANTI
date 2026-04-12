import { TalentCard } from "@/components/site/talent-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getContentState, getTalentIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TalentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const onlyFuture = params.future === "1";
  const selectedEditorSlug = typeof params.editor === "string" ? params.editor : "";
  const state = await getContentState();
  const tags = [...new Set(state.talents.flatMap((talent) => talent.tags))];
  const selectedEditor = state.editors.find((editor) => editor.slug === selectedEditorSlug) ?? null;
  const selectedLadder =
    selectedEditor ? state.ladders.find((ladder) => ladder.editorId === selectedEditor.id) ?? null : null;
  const requestedTierId = typeof params.tier === "string" ? params.tier : undefined;
  const tierId = selectedLadder?.tiers.some((tier) => tier.id === requestedTierId)
    ? requestedTierId
    : undefined;
  const talents = await getTalentIndex({
    query: q,
    tag,
    onlyFuture,
    editorId: selectedEditor?.id,
    tierId
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Talent Library"
        title="达人入口页"
        description="支持关键词、标签、未来活动，以及按编辑天梯和梯度筛选，方便从不同视角快速切入同一位达人。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索昵称、标签或简介"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="tag"
          defaultValue={tag ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部标签</option>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          name="editor"
          defaultValue={selectedEditor?.slug ?? ""}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部编辑视角</option>
          {state.editors.map((editor) => (
            <option key={editor.id} value={editor.slug}>
              {editor.name} 的天梯榜
            </option>
          ))}
        </select>
        <select
          name="tier"
          defaultValue={tierId ?? ""}
          disabled={!selectedLadder}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none disabled:opacity-45"
        >
          <option value="">{selectedLadder ? "全部梯度" : "先选择编辑视角"}</option>
          {selectedLadder?.tiers
            .slice()
            .sort((left, right) => left.order - right.order)
            .map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
        </select>
        <label className="flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          <input type="checkbox" name="future" value="1" defaultChecked={onlyFuture} />
          仅看有未来活动
        </label>
        <button className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black">
          筛选
        </button>
      </form>
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {talents.length > 0 ? talents.map((talent) => <TalentCard key={talent.id} talent={talent} />) : null}
      </div>
      {talents.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有找到符合条件的达人，试试放宽标签、编辑视角或关键词。
        </div>
      ) : null}
    </main>
  );
}
