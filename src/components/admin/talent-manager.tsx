"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { InlineAssetUpload } from "@/components/admin/inline-asset-upload";
import { compareByPinyin } from "@/lib/pinyin";
import type { TalentBulkResponse } from "@/modules/admin/types";
import type { Asset, Talent } from "@/modules/domain/types";

interface TalentManagerProps {
  talents: Talent[];
  assets: Asset[];
}

interface RepresentationDraft {
  id: string;
  title: string;
  assetId: string;
}

interface TalentDraft {
  id?: string;
  nickname: string;
  bio: string;
  mcn: string;
  tags: string;
  aliases: string;
  coverAssetId: string;
  linksText: string;
  representations: RepresentationDraft[];
}

function toLinksText(talent?: Talent | null) {
  return talent?.links.map((link) => `${link.label}|${link.url}`).join("\n") ?? "";
}

function toCommaText(value?: string[]) {
  return value?.join(", ") ?? "";
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

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function sortTalents(value: Talent[]) {
  return [...value].sort(
    (left, right) =>
      compareByPinyin(left.nickname, right.nickname) ||
      left.nickname.localeCompare(right.nickname, "zh-CN") ||
      left.id.localeCompare(right.id)
  );
}

function createRepresentationDraft(title = "", assetId = ""): RepresentationDraft {
  return {
    id: crypto.randomUUID(),
    title,
    assetId
  };
}

function createTalentDraft(talent?: Talent | null): TalentDraft {
  if (!talent) {
    return {
      nickname: "",
      bio: "",
      mcn: "",
      tags: "",
      aliases: "",
      coverAssetId: "",
      linksText: "",
      representations: [createRepresentationDraft()]
    };
  }

  return {
    id: talent.id,
    nickname: talent.nickname,
    bio: talent.bio,
    mcn: talent.mcn,
    tags: toCommaText(talent.tags),
    aliases: toCommaText(talent.aliases),
    coverAssetId: talent.coverAssetId ?? "",
    linksText: toLinksText(talent),
    representations:
      talent.representations.length > 0
        ? talent.representations.map((item) => ({
            id: item.id,
            title: item.title,
            assetId: item.assetId
          }))
        : [createRepresentationDraft()]
  };
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

  const selectedTalent = liveTalents.find((talent) => talent.id === selectedId) ?? null;
  const [draft, setDraft] = useState<TalentDraft>(() => createTalentDraft(selectedTalent));

  useEffect(() => {
    setDraft(createTalentDraft(selectedTalent));
  }, [selectedTalent]);

  const coverAssets = useMemo(
    () => liveAssets.filter((asset) => asset.kind === "talent_cover"),
    [liveAssets]
  );
  const representationAssets = useMemo(
    () => liveAssets.filter((asset) => asset.kind === "talent_representation"),
    [liveAssets]
  );

  const filteredTalents = useMemo(
    () =>
      liveTalents.filter((talent) =>
        `${talent.nickname} ${talent.aliases.join(" ")} ${talent.bio} ${talent.tags.join(" ")} ${talent.searchKeywords.join(" ")} ${talent.mcn}`
          .toLowerCase()
          .includes(deferredQuery.toLowerCase())
      ),
    [deferredQuery, liveTalents]
  );

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
    setLiveTalents((current) => sortTalents(current.map((talent) => updatedMap.get(talent.id) ?? talent)));
  }

  function updateRepresentation(index: number, patch: Partial<RepresentationDraft>) {
    setDraft((current) => ({
      ...current,
      representations: current.representations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  }

  function addRepresentationRow() {
    setDraft((current) => ({
      ...current,
      representations: [...current.representations, createRepresentationDraft()]
    }));
  }

  function removeRepresentationRow(index: number) {
    setDraft((current) => {
      const next = current.representations.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        representations: next.length > 0 ? next : [createRepresentationDraft()]
      };
    });
  }

  async function handleSave() {
    setMessage(null);

    const payload = {
      id: draft.id,
      nickname: draft.nickname,
      bio: draft.bio,
      mcn: draft.mcn,
      aliases: splitTags(draft.aliases),
      coverAssetId: draft.coverAssetId || null,
      tags: splitTags(draft.tags),
      links: parsePipeRows(draft.linksText).map((row) => ({
        label: row.left,
        url: row.right
      })),
      representations: draft.representations.map((item) => ({
        id: item.id,
        title: item.title,
        assetId: item.assetId
      }))
    };

    startTransition(async () => {
      const response = await fetch(draft.id ? `/api/admin/talents/${draft.id}` : "/api/admin/talents", {
        method: draft.id ? "PUT" : "POST",
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
          : [...current, data.talent!];
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
      setMessage("请先勾选至少一位达人。");
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
          ? `，${data.result.blocked.length} 项未完成：${data.result.blocked.map((item) => item.reason).join(" / ")}`
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
                <button type="button" onClick={() => setSelectedId(talent.id)} className="flex-1 text-left">
                  <p className="text-lg text-white">{talent.nickname}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    {talent.tags.join(" · ") || "未设置标签"}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="space-y-6">
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

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="nickname"
                value={draft.nickname}
                onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))}
                placeholder="昵称"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="mcn"
                value={draft.mcn}
                onChange={(event) => setDraft((current) => ({ ...current, mcn: event.target.value }))}
                placeholder="MCN / 所属机构"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>

            <textarea
              name="bio"
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              placeholder="简介"
              rows={4}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="tags"
                value={draft.tags}
                onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder="标签，用逗号分隔"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="aliases"
                value={draft.aliases}
                onChange={(event) => setDraft((current) => ({ ...current, aliases: event.target.value }))}
                placeholder="别名 / 英文名，用逗号分隔"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">封面图片</p>
                  <p className="mt-1 text-xs text-white/45">可直接选择已有素材，也可以在这里上传本地图片。</p>
                </div>
                <InlineAssetUpload
                  kind="talent_cover"
                  dataTestId="talent-cover-upload"
                  onUploaded={(asset) => {
                    setLiveAssets((current) => [asset, ...current]);
                    setDraft((current) => ({ ...current, coverAssetId: asset.id }));
                    setMessage(`已上传并选中封面「${asset.title}」。`);
                  }}
                />
              </div>
              <select
                name="coverAssetId"
                data-testid="talent-cover-select"
                value={draft.coverAssetId}
                onChange={(event) => setDraft((current) => ({ ...current, coverAssetId: event.target.value }))}
                className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              >
                <option value="">暂不设置封面</option>
                {coverAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              name="links"
              value={draft.linksText}
              onChange={(event) => setDraft((current) => ({ ...current, linksText: event.target.value }))}
              rows={5}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              placeholder="平台链接，每行格式：标签|URL"
            />

            <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">代表图</p>
                  <p className="mt-1 text-xs text-white/45">标题可留空；上传新图后会自动选中到当前行。</p>
                </div>
                <button
                  type="button"
                  onClick={addRepresentationRow}
                  className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/72"
                >
                  + 添加代表图
                </button>
              </div>

              <div className="space-y-4">
                {draft.representations.map((representation, index) => (
                  <div key={representation.id} className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
                      <input
                        value={representation.title}
                        onChange={(event) => updateRepresentation(index, { title: event.target.value })}
                        placeholder="代表图标题"
                        className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                      />
                      <select
                        data-testid={`talent-representation-select-${index}`}
                        value={representation.assetId}
                        onChange={(event) => updateRepresentation(index, { assetId: event.target.value })}
                        className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">暂不选择图片</option>
                        {representationAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRepresentationRow(index)}
                        className="rounded-[1rem] border border-red-300/30 px-3 py-2 text-sm text-red-200"
                      >
                        删除
                      </button>
                    </div>
                    <div className="mt-3">
                      <InlineAssetUpload
                        kind="talent_representation"
                        dataTestId={`talent-representation-upload-${index}`}
                        onUploaded={(asset) => {
                          setLiveAssets((current) => [asset, ...current]);
                          updateRepresentation(index, {
                            assetId: asset.id,
                            title: representation.title || asset.title
                          });
                          setMessage(`已上传并选中代表图「${asset.title}」。`);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {message ? <p className="text-sm text-amber-200">{message}</p> : null}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-6 text-white/45">
                保存时会自动生成 slug，并把昵称与别名同步为搜索关键词。昵称之外的内容都可以留空。
              </p>
              <button
                type="button"
                disabled={pending}
                data-testid="save-talent"
                onClick={handleSave}
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
              >
                {pending ? "保存中..." : "保存并公开"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
