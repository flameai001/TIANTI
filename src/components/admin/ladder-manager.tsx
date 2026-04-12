"use client";

import { useMemo, useState, useTransition } from "react";
import type { EditorLadder, Talent } from "@/modules/domain/types";

interface LadderManagerProps {
  ladder: EditorLadder;
  talents: Talent[];
}

export function LadderManager({ ladder, talents }: LadderManagerProps) {
  const [draft, setDraft] = useState<EditorLadder>(ladder);
  const [dragging, setDragging] = useState<{ talentId: string; fromTierId: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const talentMap = useMemo(() => new Map(talents.map((talent) => [talent.id, talent])), [talents]);
  const assignedTalentIds = new Set(draft.tiers.flatMap((tier) => tier.talentIds));
  const unassignedTalents = talents.filter((talent) => !assignedTalentIds.has(talent.id));

  function moveTalent(talentId: string, fromTierId: string, toTierId: string) {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => {
        if (tier.id === fromTierId) {
          return { ...tier, talentIds: tier.talentIds.filter((item) => item !== talentId) };
        }
        if (tier.id === toTierId) {
          return { ...tier, talentIds: [...tier.talentIds.filter((item) => item !== talentId), talentId] };
        }
        return { ...tier, talentIds: tier.talentIds.filter((item) => item !== talentId) };
      })
    }));
  }

  async function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/ladder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(draft)
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
        <div className="grid gap-4 md:grid-cols-2">
          <input
            data-testid="ladder-title"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
          <input
            data-testid="ladder-subtitle"
            value={draft.subtitle}
            onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
            className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
        </div>
      </section>

      <section className="surface rounded-[1.8rem] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Ladder Pool</p>
            <h2 className="mt-3 text-2xl text-white">未入榜达人</h2>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {unassignedTalents.map((talent) => (
            <div
              key={talent.id}
              draggable
              onDragStart={() => setDragging({ talentId: talent.id, fromTierId: "" })}
              className="rounded-full border border-white/12 bg-black/20 px-4 py-2 text-sm text-white/75"
            >
              {talent.nickname}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {draft.tiers
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((tier, index) => (
            <section
              key={tier.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragging) return;
                moveTalent(dragging.talentId, dragging.fromTierId, tier.id);
                setDragging(null);
              }}
              className="surface rounded-[1.8rem] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <input
                  value={tier.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tiers: current.tiers.map((item) =>
                        item.id === tier.id ? { ...item, name: event.target.value } : item
                      )
                    }))
                  }
                  className="w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-lg outline-none"
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
                  className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/55 disabled:opacity-30"
                >
                  删除
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {tier.talentIds.map((talentId) => {
                  const talent = talentMap.get(talentId);
                  if (!talent) return null;
                  return (
                    <div
                      key={talentId}
                      draggable
                      onDragStart={() => setDragging({ talentId, fromTierId: tier.id })}
                      className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-white/80"
                    >
                      <p className="text-lg text-white">{talent.nickname}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">{talent.tags.join(" · ")}</p>
                    </div>
                  );
                })}
                {tier.talentIds.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/45">
                    拖拽达人到这里
                  </div>
                ) : null}
              </div>
              <div className="mt-4">
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const talentId = event.target.value;
                    if (!talentId) return;
                    moveTalent(talentId, "", tier.id);
                    event.currentTarget.value = "";
                  }}
                  className="w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                >
                  <option value="">快速加入达人</option>
                  {unassignedTalents.map((talent) => (
                    <option key={talent.id} value={talent.id}>
                      {talent.nickname}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="mt-4 rounded-full border border-white/12 px-4 py-2 text-sm text-white/70"
                >
                  + 新增梯度
                </button>
              ) : null}
            </section>
          ))}
      </div>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          data-testid="save-ladder"
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
        >
          {pending ? "保存中..." : "保存天梯榜"}
        </button>
      </div>
    </div>
  );
}
