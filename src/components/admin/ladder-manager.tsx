"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusNotice } from "@/components/ui/status-notice";
import type { EditorLadder, Talent } from "@/modules/domain/types";

interface LadderManagerProps {
  ladder: EditorLadder;
  talents: Talent[];
  editorName: string;
}

function getDerivedLadderTitle(editorName: string) {
  return `${editorName}的天梯榜`;
}

export function LadderManager({ ladder, talents, editorName }: LadderManagerProps) {
  const derivedTitle = getDerivedLadderTitle(editorName);
  const [draft, setDraft] = useState<EditorLadder>({ ...ladder, title: derivedTitle });
  const [dragging, setDragging] = useState<{ talentId: string; fromTierId: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const talentMap = useMemo(() => new Map(talents.map((talent) => [talent.id, talent])), [talents]);
  const assignedTalentIds = new Set(draft.tiers.flatMap((tier) => tier.talentIds));
  const unassignedTalents = talents.filter((talent) => !assignedTalentIds.has(talent.id));

  function updateTierName(tierId: string, name: string) {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === tierId ? { ...tier, name } : tier))
    }));
  }

  function moveTalent(talentId: string, toTierId: string | null, toIndex?: number) {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => {
        const filteredTalentIds = tier.talentIds.filter((item) => item !== talentId);
        if (!toTierId || tier.id !== toTierId) {
          return { ...tier, talentIds: filteredTalentIds };
        }

        const safeIndex =
          typeof toIndex === "number"
            ? Math.max(0, Math.min(toIndex, filteredTalentIds.length))
            : filteredTalentIds.length;

        return {
          ...tier,
          talentIds: [
            ...filteredTalentIds.slice(0, safeIndex),
            talentId,
            ...filteredTalentIds.slice(safeIndex)
          ]
        };
      })
    }));
  }

  function handleDropToPool() {
    if (!dragging) return;
    moveTalent(dragging.talentId, null);
    setDragging(null);
  }

  function handleDropToTierEnd(tierId: string) {
    if (!dragging) return;
    moveTalent(dragging.talentId, tierId);
    setDragging(null);
  }

  function handleDropToTierPosition(tierId: string, targetTalentId: string) {
    if (!dragging) return;
    if (dragging.talentId === targetTalentId && dragging.fromTierId === tierId) {
      setDragging(null);
      return;
    }

    const targetTier = draft.tiers.find((tier) => tier.id === tierId);
    if (!targetTier) {
      setDragging(null);
      return;
    }

    const targetIndex = targetTier.talentIds.filter((item) => item !== dragging.talentId).indexOf(targetTalentId);
    moveTalent(dragging.talentId, tierId, targetIndex >= 0 ? targetIndex : undefined);
    setDragging(null);
  }

  async function handleSave() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/ladder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...draft,
          title: derivedTitle
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "保存失败。");
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <section className="surface rounded-[1.8rem] p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">Ladder Title</p>
            <input data-testid="ladder-title" value={derivedTitle} readOnly className="ui-input opacity-80" />
            <p className="text-xs ui-muted">主标题始终跟随当前编辑昵称自动生成。</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">Subtitle</p>
            <input
              data-testid="ladder-subtitle"
              value={draft.subtitle}
              onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
              className="ui-input"
              placeholder="天梯副标题"
            />
            <p className="text-xs ui-muted">副标题仍可自定义，公开页会直接使用这里的内容。</p>
          </div>
        </div>
      </section>

      <section className="surface rounded-[1.8rem] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="ui-kicker">Unranked Pool</p>
            <h2 className="mt-3 text-2xl text-[var(--foreground)]">未入榜达人</h2>
          </div>
        </div>
        <div
          className="mt-5 flex min-h-24 flex-wrap gap-3 rounded-[1.2rem] border border-dashed border-[var(--line-strong)] bg-white/70 p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDropToPool}
        >
          {unassignedTalents.map((talent) => (
            <div
              key={talent.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", talent.id);
                event.dataTransfer.effectAllowed = "move";
                setDragging({ talentId: talent.id, fromTierId: "" });
              }}
              onDragEnd={() => setDragging(null)}
              className="cursor-grab rounded-full border border-[var(--line-soft)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)]"
            >
              {talent.nickname}
            </div>
          ))}
          {unassignedTalents.length === 0 ? (
            <div className="surface-strong flex min-h-10 items-center rounded-[1rem] px-4 py-3 text-sm text-[var(--foreground-soft)]">
              把达人拖回这里即可移出榜单。
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-4">
        {draft.tiers
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((tier, index) => (
            <section
              key={tier.id}
              className="surface grid gap-4 rounded-[1.8rem] p-5 lg:grid-cols-[13rem_minmax(0,1fr)]"
            >
              <div className="space-y-3">
                <input
                  value={tier.name}
                  onChange={(event) => updateTierName(tier.id, event.target.value)}
                  className="ui-input"
                />
                <button
                  type="button"
                  disabled={tier.talentIds.length > 0}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      tiers: current.tiers
                        .filter((item) => item.id !== tier.id)
                        .map((item, itemIndex) => ({ ...item, order: itemIndex }))
                    }))
                  }
                  className="ui-button-secondary px-3 py-2 text-xs disabled:opacity-30"
                >
                  删除
                </button>

                <select
                  defaultValue=""
                  onChange={(event) => {
                    const talentId = event.target.value;
                    if (!talentId) return;
                    moveTalent(talentId, tier.id);
                    event.currentTarget.value = "";
                  }}
                  className="ui-select"
                >
                  <option value="">快速加入达人</option>
                  {unassignedTalents.map((talent) => (
                    <option key={talent.id} value={talent.id}>
                      {talent.nickname}
                    </option>
                  ))}
                  </select>

                {index === draft.tiers.length - 1 ? (
                  <button
                    type="button"
                    data-testid="add-tier"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        tiers: [
                          ...current.tiers,
                          {
                            id: crypto.randomUUID(),
                            name: `T${current.tiers.length}`,
                            order: current.tiers.length,
                            talentIds: []
                          }
                        ]
                      }))
                    }
                    className="ui-button-secondary w-full text-sm"
                  >
                    + 新增梯度
                  </button>
                ) : null}
              </div>

              <div
                className="min-w-0 overflow-x-auto pb-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropToTierEnd(tier.id)}
              >
                <div className="flex min-h-14 w-max min-w-full items-center gap-2 rounded-[1.2rem] border border-dashed border-[var(--line-strong)] bg-white/55 p-3">
                  {tier.talentIds.map((talentId, talentIndex) => {
                    const talent = talentMap.get(talentId);
                    if (!talent) return null;

                    return (
                      <div
                        key={talentId}
                        data-testid={`tier-${tier.id}-talent-${talentIndex}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", talentId);
                          event.dataTransfer.effectAllowed = "move";
                          setDragging({ talentId, fromTierId: tier.id });
                        }}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDropToTierPosition(tier.id, talentId);
                        }}
                        className="inline-flex w-fit cursor-grab whitespace-nowrap rounded-full border border-[var(--line-soft)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)]"
                      >
                        {talent.nickname}
                      </div>
                    );
                  })}

                  {tier.talentIds.length === 0 ? (
                    <div className="inline-flex min-h-10 items-center rounded-full border border-dashed border-[var(--line-strong)] px-4 py-2 text-sm ui-subtle">
                      把达人拖到这里，或拖到具体卡片上方进行插入排序。
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ))}
      </div>

      {message ? <StatusNotice variant="error">{message}</StatusNotice> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          data-testid="save-ladder"
          disabled={pending}
          className="ui-button-primary text-sm disabled:opacity-60"
        >
          {pending ? "保存中..." : "保存天梯"}
        </button>
      </div>
    </div>
  );
}
