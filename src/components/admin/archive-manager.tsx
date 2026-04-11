"use client";

import { useMemo, useState, useTransition } from "react";
import type { Asset, EditorArchive, Event, Talent } from "@/modules/domain/types";

interface ArchiveManagerProps {
  events: Event[];
  talents: Talent[];
  assets: Asset[];
  archives: EditorArchive[];
}

export function ArchiveManager({ events, talents, assets, archives }: ArchiveManagerProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const sceneAssets = assets.filter((asset) => asset.kind === "event_scene");
  const sharedAssets = assets.filter((asset) => asset.kind === "shared_photo");
  const currentArchive = useMemo(
    () => archives.find((archive) => archive.eventId === selectedEventId) ?? null,
    [archives, selectedEventId]
  );
  const [draft, setDraft] = useState<EditorArchive | null>(currentArchive);

  function hydrateArchive(eventId: string) {
    const existing = archives.find((archive) => archive.eventId === eventId) ?? null;
    setDraft(
      existing ?? {
        id: "",
        editorId: "",
        eventId,
        note: "",
        updatedAt: "",
        entries: []
      }
    );
  }

  async function handleSave() {
    if (!draft) return;
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/archives", {
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
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <select
            value={selectedEventId}
            onChange={(event) => {
              setSelectedEventId(event.target.value);
              hydrateArchive(event.target.value);
            }}
            className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      entries: [
                        ...current.entries,
                        {
                          id: crypto.randomUUID(),
                          talentId: talents[0]?.id ?? "",
                          sceneAssetId: sceneAssets[0]?.id ?? "",
                          sharedPhotoAssetId: null,
                          cosplayTitle: "",
                          recognized: true,
                          hasSharedPhoto: false
                        }
                      ]
                    }
                  : current
              )
            }
            className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/70"
          >
            + 添加现场记录
          </button>
        </div>
        <textarea
          value={draft?.note ?? ""}
          onChange={(event) => setDraft((current) => (current ? { ...current, note: event.target.value } : current))}
          rows={3}
          placeholder="活动档案备注"
          className="mt-4 w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
      </section>

      <div className="grid gap-5">
        {draft?.entries.map((entry, index) => (
          <section key={entry.id ?? index} className="surface rounded-[1.8rem] p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <select
                value={entry.talentId}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, talentId: event.target.value } : item
                          )
                        }
                      : current
                  )
                }
                className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              >
                {talents.map((talent) => (
                  <option key={talent.id} value={talent.id}>
                    {talent.nickname}
                  </option>
                ))}
              </select>
              <select
                value={entry.sceneAssetId}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, sceneAssetId: event.target.value } : item
                          )
                        }
                      : current
                  )
                }
                className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              >
                {sceneAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>
              <input
                value={entry.cosplayTitle}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, cosplayTitle: event.target.value } : item
                          )
                        }
                      : current
                  )
                }
                placeholder="角色 / 作品 / 游戏"
                className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={entry.recognized}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            entries: current.entries.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, recognized: event.target.checked } : item
                            )
                          }
                        : current
                    )
                  }
                />
                是否认出
              </label>
              <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={entry.hasSharedPhoto}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            entries: current.entries.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    hasSharedPhoto: event.target.checked,
                                    sharedPhotoAssetId: event.target.checked
                                      ? item.sharedPhotoAssetId ?? sharedAssets[0]?.id ?? null
                                      : null
                                  }
                                : item
                            )
                          }
                        : current
                    )
                  }
                />
                是否有合照
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) =>
                    current
                      ? { ...current, entries: current.entries.filter((_, itemIndex) => itemIndex !== index) }
                      : current
                  )
                }
                className="rounded-[1rem] border border-red-300/30 px-4 py-3 text-sm text-red-200"
              >
                删除
              </button>
            </div>
            {entry.hasSharedPhoto ? (
              <select
                value={entry.sharedPhotoAssetId ?? sharedAssets[0]?.id ?? ""}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, sharedPhotoAssetId: event.target.value } : item
                          )
                        }
                      : current
                  )
                }
                className="mt-4 w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
              >
                {sharedAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>
            ) : null}
          </section>
        ))}
      </div>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
        >
          {pending ? "保存中..." : "保存我的档案"}
        </button>
      </div>
    </div>
  );
}
