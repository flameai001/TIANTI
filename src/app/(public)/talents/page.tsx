import { TalentCard } from "@/components/site/talent-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getTalentIndex } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TalentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const onlyFuture = params.future === "1";
  const talents = await getTalentIndex({ query: q, tag, onlyFuture });

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Talent Library"
        title="达人入口页"
        description="支持关键词、标签和未来活动筛选。当前为演示数据，但结构已按正式站点的达人资料管理方式搭好。"
      />
      <form className="surface mt-10 grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-[1.4fr_1fr_1fr_auto]">
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
          <option value="国风">国风</option>
          <option value="cosplay">cosplay</option>
          <option value="舞台">舞台</option>
          <option value="嘉宾">嘉宾</option>
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
          没有找到符合条件的达人，试试放宽标签或关键词。
        </div>
      ) : null}
    </main>
  );
}
