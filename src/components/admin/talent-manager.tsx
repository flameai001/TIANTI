"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { AssetUploader } from "@/components/admin/asset-uploader";
import type { TalentBulkResponse } from "@/modules/admin/types";
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

function sortTalents(value: Talent[]) {
  return [...value].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function TalentManager({ talents, assets }: TalentManagerProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [liveTalents, setLiveTalents] = useState(() => sortTalents(talents));
  const [selectedId, setSelectedId] = useState<string | null>(talents[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTags, setBulkTags] = useState("");
  const [liveAssets, setLiveAssets] = useState(assets);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const coverAssets = liveAssets.filter((asset) => asset.kind === "talent_cover");
  const representationAssets = liveAssets.filter((asset) => asset.kind === "talent_representation");

  const filteredTalents = useMemo(
    () =>
      liveTalents.filter((talent) =>
        `${talent.nickname} ${talent.bio} ${talent.tags.join(" ")}`
          .toLowerCase()
          .includes(deferredQuery.toLowerCase())
      ),
    [deferredQuery, liveTalents]
  );

  const selectedTalent = liveTalents.find((talent) => talent.id === selectedId) ?? null;
  const hasSelectedTalents = selectedIds.length > 0;

  function toggleSelectedTalent(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)
    );
  }

  function toggleAllFilteredTalents() {
    const filteredIds = filteredTalents.map((talent) => talent.id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      areAllSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : [...new Set([...current, ...filteredIds])]
    );
  }

  function applyUpdatedTalents(updatedTalents: Talent[]) {
    const updatedMap = new Map(updatedTalents.map((talent) => [talent.id, talent]));
    setLiveTalents((current) =>
      sortTalents(
        current.map((talent) => updatedMap.get(talent.id) ?? talent)
      )
    );
  }

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
      tags: splitTags(String(formData.get("tags") || "")),
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
      if (!response.ok || !data?.talent) {
        setMessage(data?.error ?? "保存失败。");
        return;
      }

      setLiveTalents((current) => {
        const exists = current.some((talent) => talent.id === data.talent!.id);
        const next = exists
          ? current.map((talent) => (talent.id === data.talent!.id ? data.talent! : talent))
          : [data.talent!, ...current];
        return sortTalents(next);
      });
      setSelectedId(data.talent.id);
      setMessage(`已保存达人「${data.talent.nickname}」。`);
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

      const nextTalents = liveTalents.filter((talent) => talent.id !== selectedTalent.id);
      setLiveTalents(nextTalents);
      setSelectedIds((current) => current.filter((id) => id !== selectedTalent.id));
      setSelectedId(nextTalents[0]?.id ?? null);
      setMessage(`已删除达人「${selectedTalent.nickname}」。`);
    });
  }

  async function handleBulkAction(action: "add_tags" | "remove_tags" | "delete") {
    if (!hasSelectedTalents) {
      setMessage("请先勾选至少一个达人。");
      return;
    }

    const tags = splitTags(bulkTags);
    if (action !== "delete" && tags.length === 0) {
      setMessage("批量标签操作前请先填写标签。");
      return;
    }

    if (action === "delete" && !confirm(`确定批量删除 ${selectedIds.length} 位达人吗？`)) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/talents/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          ids: selectedIds,
          tags
        })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; result?: TalentBulkResponse }
        | null;
      if (!response.ok || !data?.result) {
        setMessage(data?.error ?? "批量操作失败。");
        return;
      }

      if (action === "delete") {
        setLiveTalents((current) =>
          current.filter((talent) => !data.result!.succeededIds.includes(talent.id))
        );
        setSelectedIds((current) =>
          current.filter((id) => !data.result!.succeededIds.includes(id))
        );

        if (selectedId && data.result.succeededIds.includes(selectedId)) {
          const remaining = liveTalents.filter((talent) => !data.result!.succeededIds.includes(talent.id));
          setSelectedId(remaining[0]?.id ?? null);
        }
      } else if (data.result.talents) {
        applyUpdatedTalents(data.result.talents);
      }

      const blockedSummary =
        data.result.blocked.length > 0
          ? `；${data.result.blocked.length} 项未完成：${data.result.blocked
              .map((item) => item.reason)
              .join(" / ")}`
          : "";
      const actionLabel =
        action === "add_tags" ? "已批量追加标签" : action === "remove_tags" ? "已批量移除标签" : "已批量删除达人";
      setMessage(`${actionLabel} ${data.result.succeededIds.length} 项${blockedSummary}`);
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
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
          <button
            type="button"
            data-testid="talent-select-all"
            onClick={toggleAllFilteredTalents}
            className="rounded-full border border-white/12 px-3 py-2 transition hover:border-white/25 hover:text-white"
          >
            {filteredTalents.length > 0 && filteredTalents.every((talent) => selectedIds.includes(talent.id))
              ? "取消全选当前结果"
              : "全选当前结果"}
          </button>
          <span className="rounded-full border border-white/8 px-3 py-2">
            已选 {selectedIds.length} / {liveTalents.length}
          </span>
        </div>
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">Bulk Actions</p>
          <input
            value={bulkTags}
            onChange={(event) => setBulkTags(event.target.value)}
            data-testid="bulk-tags-input"
            placeholder="标签，逗号分隔"
            className="mt-3 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
          <div className="mt-3 grid gap-3">
            <button
              type="button"
              data-testid="bulk-add-tags"
              onClick={() => handleBulkAction("add_tags")}
              disabled={pending || !hasSelectedTalents}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 disabled:opacity-50"
            >
              批量追加标签
            </button>
            <button
              type="button"
              data-testid="bulk-remove-tags"
              onClick={() => handleBulkAction("remove_tags")}
              disabled={pending || !hasSelectedTalents}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 disabled:opacity-50"
            >
              批量移除标签
            </button>
            <button
              type="button"
              data-testid="bulk-delete-talents"
              onClick={() => handleBulkAction("delete")}
              disabled={pending || !hasSelectedTalents}
              className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-200 disabled:opacity-50"
            >
              批量删除达人
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            data-testid="new-talent-button"
            onClick={() => setSelectedId(null)}
            className="w-full rounded-[1.2rem] border border-dashed border-white/15 px-4 py-4 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            + 新建达人
          </button>
          {filteredTalents.map((talent) => {
            const isChecked = selectedIds.includes(talent.id);

            return (
              <div
                key={talent.id}
                className={`flex items-start gap-3 rounded-[1.2rem] px-3 py-3 transition ${
                  selectedId === talent.id ? "bg-white/10" : "bg-black/10 hover:bg-white/6"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`选择 ${talent.nickname}`}
                  checked={isChecked}
                  onChange={(event) => toggleSelectedTalent(talent.id, event.target.checked)}
                  className="mt-1 size-4 rounded border-white/20 bg-black/30"
                />
                <button
                  type="button"
                  onClick={() => setSelectedId(talent.id)}
                  className="flex-1 text-left"
                >
                  <p className="text-lg text-white">{talent.nickname}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    {talent.tags.join(" 路 ") || "未设置标签"}
                  </p>
                </button>
              </div>
            );
          })}
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
              <h2 className="mt-3 text-3xl text-white">
                {selectedTalent ? `编辑 ${selectedTalent.nickname}` : "新建达人"}
              </h2>
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
          <form key={selectedTalent?.id ?? "new"} action={handleSave} className="space-y-5">
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
                    {asset.title} 路 {asset.id}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-white/45">
                新上传的达人封面会立刻出现在这个下拉框里。选择后保存，公开页就会使用新的封面。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <textarea
                name="links"
                defaultValue={toLinksText(selectedTalent ?? undefined)}
                rows={5}
                className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                placeholder="平台链接，每行格式：标签|URL"
              />
              <div className="space-y-3">
                <textarea
                  name="representations"
                  defaultValue={toRepresentationsText(selectedTalent ?? undefined)}
                  rows={5}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                  placeholder="代表图，每行格式：标题|assetId"
                />
                <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-xs leading-6 text-white/55">
                  可用代表图素材：
                  {representationAssets.length > 0
                    ? ` ${representationAssets.map((asset) => `${asset.title} 路 ${asset.id}`).join(" / ")}`
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
