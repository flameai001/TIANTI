import { AutoFilterForm } from "@/components/site/auto-filter-form";
import { TalentCard } from "@/components/site/talent-card";
import { SectionHeading } from "@/components/site/section-heading";
import { compareByPinyin } from "@/lib/pinyin";
import { buildMetadata } from "@/lib/site";
import { getContentState, getTalentIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = buildMetadata({
  title: "TIANTI | 达人发现",
  description: "按昵称、标签、编辑视角、梯度和 MCN 浏览 TIANTI 达人库。",
  path: "/talents"
});

export default async function TalentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const selectedEditorSlug = typeof params.editor === "string" ? params.editor : "";
  const mcn = typeof params.mcn === "string" ? params.mcn : undefined;
  const state = await getContentState();
  const tags = [...new Set(state.talents.flatMap((talent) => talent.tags))].sort(compareByPinyin);
  const mcns = [...new Set(state.talents.map((talent) => talent.mcn).filter(Boolean))].sort(compareByPinyin);
  const selectedEditor = state.editors.find((editor) => editor.slug === selectedEditorSlug) ?? null;
  const selectedLadder =
    selectedEditor ? state.ladders.find((ladder) => ladder.editorId === selectedEditor.id) ?? null : null;
  const requestedTierId = typeof params.tier === "string" ? params.tier : undefined;
  const tierId = selectedLadder?.tiers.some((tier) => tier.id === requestedTierId) ? requestedTierId : undefined;
  const talents = await getTalentIndex({
    query: q,
    tag,
    editorId: selectedEditor?.id,
    tierId,
    mcn
  });

  const summaryParts = [
    tag ? `标签「${tag}」` : null,
    mcn ? `MCN「${mcn}」` : null,
    selectedEditor ? `${selectedEditor.name} 视角` : null,
    tierId ? `梯度 ${selectedLadder?.tiers.find((tier) => tier.id === tierId)?.name}` : null
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Talent Discovery"
        title="达人发现"
        description="把关键词、标签、编辑视角、梯度和 MCN 压到同一页里，让公开站更像可探索的内容库。"
      />
      <AutoFilterForm className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索昵称、别名、标签、MCN 或关键词"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <select
          name="tag"
          defaultValue={tag ?? ""}
          data-auto-submit="true"
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
          name="mcn"
          defaultValue={mcn ?? ""}
          data-auto-submit="true"
          className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        >
          <option value="">全部 MCN</option>
          {mcns.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          name="editor"
          defaultValue={selectedEditor?.slug ?? ""}
          data-auto-submit="true"
          data-reset-target="tier"
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
          data-auto-submit="true"
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
      </AutoFilterForm>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
        <p>
          共找到 <span className="text-white">{talents.length}</span> 位达人
          {summaryParts.length > 0 ? ` · ${summaryParts.join(" · ")}` : ""}
        </p>
        <p>默认按昵称拼音排序</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {talents.length > 0 ? talents.map((talent) => <TalentCard key={talent.id} talent={talent} />) : null}
      </div>
      {talents.length === 0 ? (
        <div className="surface mt-10 rounded-[1.8rem] px-6 py-10 text-center text-white/68">
          没有找到符合条件的达人，试试放宽标签、编辑视角或 MCN。
        </div>
      ) : null}
    </main>
  );
}
