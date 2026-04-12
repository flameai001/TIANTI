"use client";

import { useMemo, useState, useTransition } from "react";
import { AssetUploader } from "@/components/admin/asset-uploader";
import type { Asset, Talent } from "@/modules/domain/types";

interface TalentManagerProps {
  talents: Talent[];
  assets: Asset[];
}

function toLinksText(talent?: Talent) {
  return talent?.links.map((link) => `${link.label}|${link.url}`).join("\n") ?? "";
}

function toRepresentationsText(talent?: Talent) {
  return talent?.representations.map((item) => `${item.title}|${item.assetId}`).join("\n") ?? "";
}

function parsePipeRows(value: string) {
  return value
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [left, right] = row.split("|");
      return { left: left?.trim() ?? "", right: right?.trim() ?? "" };
    })
    .filter((row) => row.left && row.right);
}

export function TalentManager({ talents, assets }: TalentManagerProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(talents[0]?.id ?? null);
  const [liveAssets, setLiveAssets] = useState(assets);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const coverAssets = liveAssets.filter((asset) => asset.kind === "talent_cover");
  const representationAssets = liveAssets.filter((asset) => asset.kind === "talent_representation");

  const filteredTalents = useMemo(
    () =>
      talents.filter((talent) =>
        `${talent.nickname} ${talent.bio} ${talent.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, talents]
  );

  const selectedTalent = talents.find((talent) => talent.id === selectedId);

  async function handleSave(formData: FormData) {
    setMessage(null);

    const id = String(formData.get("id") || "");
    const payload = {
      id: id || undefined,
      nickname: String(formData.get("nickname") || ""),
      slug: String(formData.get("slug") || ""),
      bio: String(formData.get("bio") || ""),
      mcn: String(formData.get("mcn") || ""),
      coverAssetId: String(formData.get("coverAssetId") || ""),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      links: parsePipeRows(String(formData.get("links") || "")).map((row) => ({
        label: row.left,
        url: row.right
      })),
      representations: parsePipeRows(String(formData.get("representations") || "")).map((row) => ({
        title: row.left,
        assetId: row.right
      }))
    };

    startTransition(async () => {
      const response = await fetch(id ? `/api/admin/talents/${id}` : "/api/admin/talents", {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { error?: string; talent?: Talent } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "保存失败。");
        return;
      }

      window.location.reload();
    });
  }

  async function handleDelete() {
    if (!selectedTalent) return;
    if (!confirm(`确定删除 ${selectedTalent.nickname} 吗？`)) return;

    startTransition(async () => {
      const response = await fetch(`/api/admin/talents/${selectedTalent.id}`, {
        method: "DELETE"
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "删除失败。");
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="surface rounded-[1.8rem] p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索达人"
          className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <div className="mt-5 space-y-3">
          <button
            type="button"
            data-testid="new-talent-button"
            onClick={() => setSelectedId(null)}
            className="w-full rounded-[1.2rem] border border-dashed border-white/15 px-4 py-4 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            + 新建达人
          </button>
          {filteredTalents.map((talent) => (
            <button
              key={talent.id}
              type="button"
              onClick={() => setSelectedId(talent.id)}
              className={`w-full rounded-[1.2rem] px-4 py-4 text-left transition ${
                selectedId === talent.id ? "bg-white/10 text-white" : "bg-black/10 text-white/70 hover:bg-white/6"
              }`}
            >
              <p className="text-lg">{talent.nickname}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{talent.tags.join(" · ")}</p>
            </button>
          ))}
        </div>
      </aside>
      <section className="space-y-6">
        <AssetUploader
          allowedKinds={["talent_cover", "talent_representation"]}
          onUploaded={(asset) => {
            setLiveAssets((current) => [asset, ...current]);
            setMessage(`素材“${asset.title}”已进入素材列表，现在可以直接在下面选择。`);
          }}
        />

        <div className="surface rounded-[1.8rem] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Talent Editor</p>
              <h2 className="mt-3 text-3xl text-white">{selectedTalent ? `编辑 ${selectedTalent.nickname}` : "新建达人"}</h2>
            </div>
            {selectedTalent ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full border border-red-300/40 px-4 py-2 text-sm text-red-200"
              >
                删除
              </button>
            ) : null}
          </div>
          <form action={handleSave} className="space-y-5">
            <input type="hidden" name="id" value={selectedTalent?.id ?? ""} />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="nickname"
                defaultValue={selectedTalent?.nickname ?? ""}
                placeholder="昵称"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="slug"
                defaultValue={selectedTalent?.slug ?? ""}
                placeholder="slug（留空自动生成）"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>
            <textarea
              name="bio"
              defaultValue={selectedTalent?.bio ?? ""}
              placeholder="简介"
              rows={4}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="mcn"
                defaultValue={selectedTalent?.mcn ?? ""}
                placeholder="MCN / 所属机构"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="tags"
                defaultValue={selectedTalent?.tags.join(", ") ?? ""}
                placeholder="标签，用逗号分隔"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="space-y-3">
              <select
                name="coverAssetId"
                defaultValue={selectedTalent?.coverAssetId ?? coverAssets[0]?.id ?? ""}
                className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              >
                {coverAssets.length === 0 ? <option value="">请先上传达人封面</option> : null}
                {coverAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title} · {asset.id}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-white/45">
                新上传的达人封面会立刻出现在这个下拉框里。选择后保存，公开页就会使用新封面。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <textarea
                name="links"
                defaultValue={toLinksText(selectedTalent)}
                rows={5}
                className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                placeholder="平台链接，每行格式：标签|URL"
              />
              <div className="space-y-3">
                <textarea
                  name="representations"
                  defaultValue={toRepresentationsText(selectedTalent)}
                  rows={5}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                  placeholder="代表图，每行格式：标题|assetId"
                />
                <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-xs leading-6 text-white/55">
                  可用代表图素材：
                  {representationAssets.length > 0
                    ? ` ${representationAssets.map((asset) => `${asset.title} · ${asset.id}`).join(" / ")}`
                    : " 暂无，请先在上方上传“代表图”。"}
                </div>
              </div>
            </div>
            {message ? <p className="text-sm text-amber-200">{message}</p> : null}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-6 text-white/45">
                现在上传的图片会直接进入 R2；表单保存后，公开站会立刻读取新的达人信息和素材关联。
              </p>
              <button
                disabled={pending}
                data-testid="save-talent"
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
              >
                {pending ? "保存中..." : "保存并公开"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
