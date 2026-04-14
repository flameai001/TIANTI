"use client";

import { useMemo, useState, useTransition } from "react";
import { AssetUploader } from "@/components/admin/asset-uploader";
import type {
  Asset,
  EditorArchive,
  Event,
  EventLineup,
  Talent
} from "@/modules/domain/types";

interface ArchiveManagerProps {
  events: Event[];
  talents: Talent[];
  assets: Asset[];
  lineups: EventLineup[];
  archives: EditorArchive[];
  initialSelectedEventId?: string | null;
}

interface EditableEvent {
  id?: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  city: string;
  venue: string;
  status: "future" | "past";
  note: string;
}

interface EditableLineup {
  id?: string;
  talentId: string;
  status: "confirmed" | "pending";
  source: string;
  note: string;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function createEmptyEventDraft(): EditableEvent {
  return {
    name: "",
    slug: "",
    startsAt: "",
    endsAt: "",
    city: "",
    venue: "",
    status: "future",
    note: ""
  };
}

function createEventDraft(event?: Event | null): EditableEvent {
  if (!event) {
    return createEmptyEventDraft();
  }

  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    startsAt: toInputDate(event.startsAt),
    endsAt: toInputDate(event.endsAt),
    city: event.city,
    venue: event.venue,
    status: event.status,
    note: event.note
  };
}

function createLineupDrafts(eventId: string | null, lineups: EventLineup[]): EditableLineup[] {
  if (!eventId) {
    return [];
  }

  return lineups
    .filter((lineup) => lineup.eventId === eventId)
    .map((lineup) => ({
      id: lineup.id,
      talentId: lineup.talentId,
      status: lineup.status,
      source: lineup.source,
      note: lineup.note
    }));
}

function createArchiveDraft(eventId: string | null, archives: EditorArchive[]): EditorArchive {
  if (!eventId) {
    return {
      id: "",
      editorId: "",
      eventId: "",
      note: "",
      updatedAt: "",
      entries: []
    };
  }

  return (
    archives.find((archive) => archive.eventId === eventId) ?? {
      id: "",
      editorId: "",
      eventId,
      note: "",
      updatedAt: "",
      entries: []
    }
  );
}

function updateBrowserSelection(eventId: string | null) {
  const url = new URL(window.location.href);
  if (eventId) {
    url.searchParams.set("event", eventId);
  } else {
    url.searchParams.delete("event");
  }
  window.history.replaceState(null, "", url);
}

export function ArchiveManager({
  events,
  talents,
  assets,
  lineups,
  archives,
  initialSelectedEventId
}: ArchiveManagerProps) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [liveAssets, setLiveAssets] = useState(assets);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialSelectedEventId ?? events[0]?.id ?? null);
  const [eventDraft, setEventDraft] = useState<EditableEvent>(() =>
    createEventDraft(events.find((event) => event.id === (initialSelectedEventId ?? events[0]?.id)))
  );
  const [editableLineups, setEditableLineups] = useState<EditableLineup[]>(() =>
    createLineupDrafts(initialSelectedEventId ?? events[0]?.id ?? null, lineups)
  );
  const [archiveDraft, setArchiveDraft] = useState<EditorArchive>(() =>
    createArchiveDraft(initialSelectedEventId ?? events[0]?.id ?? null, archives)
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.name} ${event.city} ${event.venue}`.toLowerCase().includes(query.toLowerCase())
      ),
    [events, query]
  );
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const sceneAssets = useMemo(
    () => liveAssets.filter((asset) => asset.kind === "event_scene"),
    [liveAssets]
  );
  const sharedAssets = useMemo(
    () => liveAssets.filter((asset) => asset.kind === "shared_photo"),
    [liveAssets]
  );
  const canEditArchive = Boolean(eventDraft.id);

  function selectEvent(eventId: string | null) {
    setSelectedEventId(eventId);
    setEventDraft(createEventDraft(events.find((event) => event.id === eventId)));
    setEditableLineups(createLineupDrafts(eventId, lineups));
    setArchiveDraft(createArchiveDraft(eventId, archives));
    setMessage(null);
    updateBrowserSelection(eventId);
  }

  function handleNewEvent() {
    setSelectedEventId(null);
    setEventDraft(createEmptyEventDraft());
    setEditableLineups([]);
    setArchiveDraft(createArchiveDraft(null, archives));
    setMessage(null);
    updateBrowserSelection(null);
  }

  async function handleSaveEvent() {
    setMessage(null);

    const payload = {
      id: eventDraft.id,
      name: eventDraft.name,
      slug: eventDraft.slug,
      startsAt: eventDraft.startsAt,
      endsAt: eventDraft.endsAt,
      city: eventDraft.city,
      venue: eventDraft.venue,
      status: eventDraft.status,
      note: eventDraft.note,
      lineups: editableLineups
    };

    startTransition(async () => {
      const response = await fetch(eventDraft.id ? `/api/admin/events/${eventDraft.id}` : "/api/admin/events", {
        method: eventDraft.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { error?: string; event?: Event } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "保存活动失败。");
        return;
      }

      const nextEventId = data?.event?.id ?? eventDraft.id;
      window.location.assign(nextEventId ? `/admin/archives?event=${nextEventId}` : "/admin/archives");
    });
  }

  async function handleSaveArchive() {
    if (!eventDraft.id) {
      setMessage("先保存活动基础信息，再录入我的现场档案。");
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/archives", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: archiveDraft.id || undefined,
          eventId: eventDraft.id,
          note: archiveDraft.note,
          entries: archiveDraft.entries
        })
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "保存档案失败。");
        return;
      }

      window.location.assign(`/admin/archives?event=${eventDraft.id}`);
    });
  }

  async function handleDeleteEvent() {
    if (!selectedEvent?.id) return;
    if (!confirm(`确定删除 ${selectedEvent.name} 吗？`)) return;

    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/events/${selectedEvent.id}`, {
        method: "DELETE"
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "删除失败。");
        return;
      }

      window.location.assign("/admin/archives");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="surface rounded-[1.8rem] p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索活动"
          className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <div className="mt-5 space-y-3">
          <button
            type="button"
            data-testid="new-event-button"
            onClick={handleNewEvent}
            className="w-full rounded-[1.2rem] border border-dashed border-white/15 px-4 py-4 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            + 新建活动
          </button>
          {filteredEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => selectEvent(event.id)}
              className={`w-full rounded-[1.2rem] px-4 py-4 text-left transition ${
                selectedEventId === event.id ? "bg-white/10 text-white" : "bg-black/10 text-white/70 hover:bg-white/6"
              }`}
            >
              <p className="text-lg">{event.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                {event.status === "future" ? "未来活动" : "已结束活动"} · {event.city}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-6">
        <section className="surface rounded-[1.8rem] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Archive Workspace</p>
              <h2 className="mt-3 text-3xl text-white">
                {selectedEvent ? `编辑 ${selectedEvent.name}` : "新建活动档案"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                上半区维护共享活动信息与达人阵容；保存活动后，下半区继续录入我自己的现场档案。
              </p>
            </div>
            {selectedEvent ? (
              <button
                type="button"
                onClick={handleDeleteEvent}
                className="rounded-full border border-red-300/40 px-4 py-2 text-sm text-red-200"
              >
                删除活动
              </button>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="name"
                value={eventDraft.name}
                onChange={(event) => setEventDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="活动名称"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="slug"
                value={eventDraft.slug}
                onChange={(event) => setEventDraft((current) => ({ ...current, slug: event.target.value }))}
                placeholder="slug（留空自动生成）"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="startsAt"
                type="datetime-local"
                value={eventDraft.startsAt}
                onChange={(event) => setEventDraft((current) => ({ ...current, startsAt: event.target.value }))}
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="endsAt"
                type="datetime-local"
                value={eventDraft.endsAt}
                onChange={(event) => setEventDraft((current) => ({ ...current, endsAt: event.target.value }))}
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                name="city"
                value={eventDraft.city}
                onChange={(event) => setEventDraft((current) => ({ ...current, city: event.target.value }))}
                placeholder="城市"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="venue"
                value={eventDraft.venue}
                onChange={(event) => setEventDraft((current) => ({ ...current, venue: event.target.value }))}
                placeholder="场馆"
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <select
                name="status"
                value={eventDraft.status}
                onChange={(event) =>
                  setEventDraft((current) => ({
                    ...current,
                    status: event.target.value as EditableEvent["status"]
                  }))
                }
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              >
                <option value="future">未来</option>
                <option value="past">已结束</option>
              </select>
            </div>
            <textarea
              name="note"
              value={eventDraft.note}
              onChange={(event) => setEventDraft((current) => ({ ...current, note: event.target.value }))}
              rows={4}
              data-testid="event-note"
              placeholder="活动说明或备注"
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />

            <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-white">达人阵容</h3>
                <button
                  type="button"
                  data-testid="add-lineup"
                  onClick={() =>
                    setEditableLineups((current) => [
                      ...current,
                      {
                        talentId: talents[0]?.id ?? "",
                        status: "confirmed",
                        source: "",
                        note: ""
                      }
                    ])
                  }
                  className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70"
                >
                  + 添加达人
                </button>
              </div>
              <div className="space-y-3">
                {editableLineups.map((lineup, index) => (
                  <div
                    key={`${lineup.id ?? "new"}-${index}`}
                    data-testid="lineup-item"
                    className="grid gap-3 rounded-[1.2rem] border border-white/8 p-4 md:grid-cols-[1fr_0.8fr_0.8fr_auto]"
                  >
                    <select
                      data-testid={`lineup-talent-${index}`}
                      value={lineup.talentId}
                      onChange={(event) =>
                        setEditableLineups((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, talentId: event.target.value } : item
                          )
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
                      data-testid={`lineup-status-${index}`}
                      value={lineup.status}
                      onChange={(event) =>
                        setEditableLineups((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, status: event.target.value as EditableLineup["status"] }
                              : item
                          )
                        )
                      }
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    >
                      <option value="confirmed">已确认</option>
                      <option value="pending">待核实</option>
                    </select>
                    <input
                      data-testid={`lineup-source-${index}`}
                      value={lineup.source}
                      onChange={(event) =>
                        setEditableLineups((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, source: event.target.value } : item
                          )
                        )
                      }
                      placeholder="信息来源"
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditableLineups((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-[1rem] border border-red-300/30 px-3 py-2 text-sm text-red-200"
                    >
                      删除
                    </button>
                    <textarea
                      data-testid={`lineup-note-${index}`}
                      value={lineup.note}
                      onChange={(event) =>
                        setEditableLineups((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, note: event.target.value } : item
                          )
                        )
                      }
                      rows={2}
                      placeholder="补充备注"
                      className="md:col-span-4 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={pending}
                data-testid="save-event"
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
              >
                {pending ? "保存中..." : "保存活动信息"}
              </button>
            </div>
          </div>
        </section>

        {!canEditArchive ? (
          <section className="surface rounded-[1.8rem] px-6 py-10 text-center text-white/68">
            先保存活动基础信息，再上传档案素材并录入我的现场记录。
          </section>
        ) : (
          <>
            <section className="surface rounded-[1.8rem] p-6">
              <AssetUploader
                allowedKinds={["event_scene", "shared_photo"]}
                onUploaded={(asset) => {
                  setLiveAssets((current) => [asset, ...current]);
                  setMessage(`素材“${asset.title}”已加入档案素材库，现在可以直接在下方选用了。`);
                }}
              />
            </section>

            <section className="surface rounded-[1.8rem] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">My Archive</p>
                  <h3 className="mt-3 text-2xl text-white">我的现场档案</h3>
                </div>
                <button
                  type="button"
                  data-testid="add-archive-entry"
                  onClick={() =>
                    setArchiveDraft((current) => ({
                      ...current,
                      eventId: eventDraft.id ?? "",
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
                    }))
                  }
                  className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/70"
                >
                  + 添加现场记录
                </button>
              </div>
              <textarea
                value={archiveDraft.note}
                data-testid="archive-note"
                onChange={(event) =>
                  setArchiveDraft((current) => ({
                    ...current,
                    eventId: eventDraft.id ?? "",
                    note: event.target.value
                  }))
                }
                rows={3}
                placeholder="活动档案备注"
                className="mt-4 w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </section>

            <div className="grid gap-5">
              {archiveDraft.entries.map((entry, index) => (
                <section key={entry.id ?? index} data-testid="archive-entry" className="surface rounded-[1.8rem] p-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <select
                      data-testid={`archive-talent-${index}`}
                      value={entry.talentId}
                      onChange={(event) =>
                        setArchiveDraft((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, talentId: event.target.value } : item
                          )
                        }))
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
                      data-testid={`archive-scene-${index}`}
                      value={entry.sceneAssetId}
                      onChange={(event) =>
                        setArchiveDraft((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, sceneAssetId: event.target.value } : item
                          )
                        }))
                      }
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    >
                      {sceneAssets.length === 0 ? <option value="">请先上传活动现场图</option> : null}
                      {sceneAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title}
                        </option>
                      ))}
                    </select>
                    <input
                      data-testid={`archive-cosplay-${index}`}
                      value={entry.cosplayTitle}
                      onChange={(event) =>
                        setArchiveDraft((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, cosplayTitle: event.target.value } : item
                          )
                        }))
                      }
                      placeholder="角色 / 作品 / 游戏"
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                    <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                      <input
                        data-testid={`archive-recognized-${index}`}
                        type="checkbox"
                        checked={entry.recognized}
                        onChange={(event) =>
                          setArchiveDraft((current) => ({
                            ...current,
                            entries: current.entries.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, recognized: event.target.checked } : item
                            )
                          }))
                        }
                      />
                      是否认出
                    </label>
                    <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                      <input
                        data-testid={`archive-shared-flag-${index}`}
                        type="checkbox"
                        checked={entry.hasSharedPhoto}
                        onChange={(event) =>
                          setArchiveDraft((current) => ({
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
                          }))
                        }
                      />
                      是否有合照
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setArchiveDraft((current) => ({
                          ...current,
                          entries: current.entries.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                      className="rounded-[1rem] border border-red-300/30 px-4 py-3 text-sm text-red-200"
                    >
                      删除
                    </button>
                  </div>
                  {entry.hasSharedPhoto ? (
                    <select
                      data-testid={`archive-shared-${index}`}
                      value={entry.sharedPhotoAssetId ?? sharedAssets[0]?.id ?? ""}
                      onChange={(event) =>
                        setArchiveDraft((current) => ({
                          ...current,
                          entries: current.entries.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, sharedPhotoAssetId: event.target.value } : item
                          )
                        }))
                      }
                      className="mt-4 w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    >
                      {sharedAssets.length === 0 ? <option value="">请先上传合照素材</option> : null}
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveArchive}
                data-testid="save-archive"
                disabled={pending}
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
              >
                {pending ? "保存中..." : "保存我的档案"}
              </button>
            </div>
          </>
        )}

        {message ? <p className="text-sm text-amber-200">{message}</p> : null}
      </section>
    </div>
  );
}
