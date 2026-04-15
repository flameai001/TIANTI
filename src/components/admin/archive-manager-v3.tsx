"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { InlineAssetUpload } from "@/components/admin/inline-asset-upload";
import { useAdminUnsavedChanges } from "@/components/admin/admin-unsaved-changes";
import {
  createArchiveDraft,
  createEmptyEventDraft,
  createEventDraft,
  createLineupDrafts,
  normalizeArchiveDraft,
  normalizeEventDraft,
  normalizeLineupDrafts,
  type EditableEvent,
  type EditableLineup
} from "@/components/admin/archive-manager-utils";
import { getDateSortTime } from "@/lib/date";
import type { BulkActionResult } from "@/modules/admin/types";
import type { Asset, EditorArchive, Event, EventLineup, Talent } from "@/modules/domain/types";

interface ArchiveManagerProps {
  events: Event[];
  talents: Talent[];
  assets: Asset[];
  lineups: EventLineup[];
  archives: EditorArchive[];
  initialSelectedEventId?: string | null;
}

const UNSAVED_MESSAGE = "当前活动仍有未保存的修改，离开后会丢失。确定继续吗？";

function sortEventsForManager(value: Event[]) {
  return [...value].sort((left, right) => {
    const leftTime = getDateSortTime(left.startsAt ?? left.endsAt ?? null);
    const rightTime = getDateSortTime(right.startsAt ?? right.endsAt ?? null);

    if (leftTime === null && rightTime === null) {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }

    if (leftTime === null) return 1;
    if (rightTime === null) return -1;
    return rightTime - leftTime;
  });
}

function createEditableLineup(talentId = ""): EditableLineup {
  return {
    id: crypto.randomUUID(),
    talentId,
    status: "confirmed",
    source: "",
    note: ""
  };
}

function createArchiveEntry(talentId = "", sceneAssetId = ""): EditorArchive["entries"][number] {
  return {
    id: crypto.randomUUID(),
    talentId,
    sceneAssetId,
    sharedPhotoAssetId: null,
    cosplayTitle: "",
    recognized: true,
    hasSharedPhoto: false
  };
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

function buildBulkSummary(result: BulkActionResult, label: string) {
  const blocked =
    result.blocked.length > 0
      ? `，${result.blocked.length} 项未完成：${result.blocked.map((item) => item.reason).join(" / ")}`
      : "";
  return `${label} ${result.succeededIds.length} 项${blocked}`;
}

function validateEventDraft(eventDraft: EditableEvent) {
  if (!eventDraft.name.trim()) return "请先填写活动名称。";
  return null;
}

function validateArchiveDraft(archiveDraft: EditorArchive) {
  for (const entry of archiveDraft.entries) {
    if (!entry.talentId) return "档案条目里还有达人未选择。";
    if (!entry.sceneAssetId) return "档案条目里还有现场图未选择。";
    if (!entry.cosplayTitle.trim()) return "请为每条档案记录填写角色或作品。";
    if (entry.hasSharedPhoto && !entry.sharedPhotoAssetId) {
      return "已勾选合照的档案条目必须选择一张合照素材。";
    }
  }

  return null;
}

export function ArchiveManager({
  events,
  talents,
  assets,
  lineups,
  archives,
  initialSelectedEventId
}: ArchiveManagerProps) {
  const initialEvents = sortEventsForManager(events);
  const initialEventId = initialEvents.some((event) => event.id === initialSelectedEventId)
    ? (initialSelectedEventId ?? null)
    : (initialEvents[0]?.id ?? null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [liveAssets, setLiveAssets] = useState(assets);
  const [liveEvents, setLiveEvents] = useState(initialEvents);
  const [liveLineups, setLiveLineups] = useState(lineups);
  const [liveArchives, setLiveArchives] = useState(archives);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [bulkEventStatus, setBulkEventStatus] = useState<"future" | "past">("future");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [eventDraft, setEventDraft] = useState<EditableEvent>(() =>
    createEventDraft(initialEvents.find((event) => event.id === initialEventId) ?? null)
  );
  const [editableLineups, setEditableLineups] = useState<EditableLineup[]>(() =>
    createLineupDrafts(initialEventId, lineups)
  );
  const [archiveDraft, setArchiveDraft] = useState<EditorArchive>(() =>
    createArchiveDraft(initialEventId, archives)
  );
  const { setGuard } = useAdminUnsavedChanges();

  const filteredEvents = useMemo(
    () =>
      liveEvents.filter((event) =>
        `${event.name} ${event.aliases.join(" ")} ${event.city} ${event.venue} ${event.searchKeywords.join(" ")}`
          .toLowerCase()
          .includes(deferredQuery.toLowerCase())
      ),
    [deferredQuery, liveEvents]
  );
  const selectedEvent = liveEvents.find((event) => event.id === selectedEventId) ?? null;
  const persistedEventDraft = useMemo(() => createEventDraft(selectedEvent), [selectedEvent]);
  const persistedLineups = useMemo(
    () => createLineupDrafts(selectedEventId, liveLineups),
    [liveLineups, selectedEventId]
  );
  const persistedArchive = useMemo(
    () => createArchiveDraft(selectedEventId, liveArchives),
    [liveArchives, selectedEventId]
  );
  const sceneAssets = useMemo(() => liveAssets.filter((asset) => asset.kind === "event_scene"), [liveAssets]);
  const sharedAssets = useMemo(() => liveAssets.filter((asset) => asset.kind === "shared_photo"), [liveAssets]);
  const lineupTalentIds = useMemo(
    () => [...new Set(editableLineups.map((lineup) => lineup.talentId).filter(Boolean))],
    [editableLineups]
  );
  const defaultArchiveTalentId = useMemo(() => {
    const usedTalentIds = new Set(archiveDraft.entries.map((entry) => entry.talentId));
    return lineupTalentIds.find((talentId) => !usedTalentIds.has(talentId)) ?? lineupTalentIds[0] ?? talents[0]?.id ?? "";
  }, [archiveDraft.entries, lineupTalentIds, talents]);
  const defaultLineupTalentId = useMemo(() => {
    const usedTalentIds = new Set(editableLineups.map((lineup) => lineup.talentId));
    return talents.find((talent) => !usedTalentIds.has(talent.id))?.id ?? talents[0]?.id ?? "";
  }, [editableLineups, talents]);
  const defaultSceneAssetId = sceneAssets[0]?.id ?? "";
  const areAllFilteredEventsSelected =
    filteredEvents.length > 0 && filteredEvents.every((event) => selectedEventIds.includes(event.id));
  const isEventDirty =
    JSON.stringify(normalizeEventDraft(eventDraft)) !== JSON.stringify(normalizeEventDraft(persistedEventDraft)) ||
    JSON.stringify(normalizeLineupDrafts(editableLineups)) !== JSON.stringify(normalizeLineupDrafts(persistedLineups));
  const isArchiveDirty =
    JSON.stringify(normalizeArchiveDraft(archiveDraft)) !== JSON.stringify(normalizeArchiveDraft(persistedArchive));
  const hasUnsavedChanges = isEventDirty || isArchiveDirty;
  const canEditArchive = Boolean(eventDraft.id);

  useEffect(() => {
    setGuard(hasUnsavedChanges ? { isDirty: true, message: UNSAVED_MESSAGE } : null);
    return () => setGuard(null);
  }, [hasUnsavedChanges, setGuard]);

  function resetDrafts(
    nextEventId: string | null,
    nextEvents = liveEvents,
    nextLineups = liveLineups,
    nextArchives = liveArchives
  ) {
    setSelectedEventId(nextEventId);
    setEventDraft(createEventDraft(nextEvents.find((event) => event.id === nextEventId) ?? null));
    setEditableLineups(createLineupDrafts(nextEventId, nextLineups));
    setArchiveDraft(createArchiveDraft(nextEventId, nextArchives));
    updateBrowserSelection(nextEventId);
  }

  function canLeaveCurrentWork() {
    return !hasUnsavedChanges || window.confirm(UNSAVED_MESSAGE);
  }

  function selectEvent(eventId: string | null) {
    if (eventId === selectedEventId) return;
    if (!canLeaveCurrentWork()) return;
    resetDrafts(eventId);
    setMessage(null);
  }

  function handleNewEvent() {
    if (!canLeaveCurrentWork()) return;
    setSelectedEventId(null);
    setEventDraft(createEmptyEventDraft());
    setEditableLineups([]);
    setArchiveDraft(createArchiveDraft(null, liveArchives));
    updateBrowserSelection(null);
    setMessage(null);
  }

  function updateLineup(index: number, patch: Partial<EditableLineup>) {
    setEditableLineups((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function updateArchiveEntry(index: number, patch: Partial<EditorArchive["entries"][number]>) {
    setArchiveDraft((current) => ({
      ...current,
      eventId: eventDraft.id ?? current.eventId,
      entries: current.entries.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  }

  async function handleSaveEvent() {
    const validationError = validateEventDraft(eventDraft);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setMessage(null);

    const payload = {
      id: eventDraft.id,
      name: eventDraft.name,
      startsAt: eventDraft.startsAt || null,
      endsAt: eventDraft.endsAt || null,
      city: eventDraft.city,
      venue: eventDraft.venue,
      status: eventDraft.status,
      note: eventDraft.note,
      lineups: editableLineups
    };

    startTransition(async () => {
      const response = await fetch(eventDraft.id ? `/api/admin/events/${eventDraft.id}` : "/api/admin/events", {
        method: eventDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { error?: string; event?: Event } | null;
      if (!response.ok || !data?.event) {
        setMessage(data?.error ?? "保存活动失败。");
        return;
      }

      const nextEventId = data.event.id;
      const nextEvents = sortEventsForManager(
        liveEvents.some((event) => event.id === nextEventId)
          ? liveEvents.map((event) => (event.id === nextEventId ? data.event! : event))
          : [...liveEvents, data.event]
      );
      const nextLineups = [
        ...liveLineups.filter((lineup) => lineup.eventId !== nextEventId),
        ...editableLineups
          .filter((lineup) => lineup.talentId)
          .map((lineup) => ({ ...lineup, eventId: nextEventId }))
      ];

      setLiveEvents(nextEvents);
      setLiveLineups(nextLineups);
      resetDrafts(nextEventId, nextEvents, nextLineups, liveArchives);
      setMessage(`活动「${data.event.name}」已保存。`);
    });
  }

  async function handleSaveArchive() {
    if (!eventDraft.id) {
      setMessage("请先保存活动基础信息，再录入我的现场档案。");
      return;
    }
    const eventId = eventDraft.id;

    const validationError = validateArchiveDraft(archiveDraft);
    if (validationError) {
      setMessage(validationError);
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
          eventId,
          note: archiveDraft.note,
          entries: archiveDraft.entries
        })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; archive?: EditorArchive }
        | null;
      if (!response.ok || !data?.archive) {
        setMessage(data?.error ?? "保存档案失败。");
        return;
      }

      const nextArchives = liveArchives.some((archive) => archive.eventId === eventId)
        ? liveArchives.map((archive) => (archive.eventId === eventId ? data.archive! : archive))
        : [...liveArchives, data.archive];

      setLiveArchives(nextArchives);
      resetDrafts(eventId, liveEvents, liveLineups, nextArchives);
      setMessage(`我的档案已保存到「${eventDraft.name}」。`);
    });
  }

  async function handleDeleteEvent() {
    if (!selectedEvent?.id) return;
    if (!window.confirm(`确定删除 ${selectedEvent.name} 吗？这会同时删除该活动的阵容和关联档案。`)) return;

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

      const nextEvents = liveEvents.filter((event) => event.id !== selectedEvent.id);
      const nextLineups = liveLineups.filter((lineup) => lineup.eventId !== selectedEvent.id);
      const nextArchives = liveArchives.filter((archive) => archive.eventId !== selectedEvent.id);

      setLiveEvents(nextEvents);
      setLiveLineups(nextLineups);
      setLiveArchives(nextArchives);
      setSelectedEventIds((current) => current.filter((id) => id !== selectedEvent.id));
      resetDrafts(nextEvents[0]?.id ?? null, nextEvents, nextLineups, nextArchives);
      setMessage(`活动「${selectedEvent.name}」已删除。`);
    });
  }

  async function handleBulkEventAction(action: "set_status" | "delete") {
    if (selectedEventIds.length === 0) {
      setMessage("请先勾选至少一个活动。");
      return;
    }

    if (hasUnsavedChanges) {
      setMessage("请先保存或放弃当前修改，再执行批量操作。");
      return;
    }

    if (
      action === "delete" &&
      !window.confirm(`确定批量删除 ${selectedEventIds.length} 个活动吗？这会同时删除这些活动的阵容和关联档案。`)
    ) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/events/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          ids: selectedEventIds,
          status: action === "set_status" ? bulkEventStatus : undefined
        })
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; result?: BulkActionResult }
        | null;
      if (!response.ok || !data?.result) {
        setMessage(data?.error ?? "批量操作失败。");
        return;
      }

      if (action === "delete") {
        const removedIds = new Set(data.result.succeededIds);
        const nextEvents = liveEvents.filter((event) => !removedIds.has(event.id));
        const nextLineups = liveLineups.filter((lineup) => !removedIds.has(lineup.eventId));
        const nextArchives = liveArchives.filter((archive) => !removedIds.has(archive.eventId));
        const nextSelectedEventId = removedIds.has(selectedEventId ?? "")
          ? (nextEvents[0]?.id ?? null)
          : selectedEventId;

        setLiveEvents(nextEvents);
        setLiveLineups(nextLineups);
        setLiveArchives(nextArchives);
        setSelectedEventIds((current) => current.filter((id) => !removedIds.has(id)));
        resetDrafts(nextSelectedEventId, nextEvents, nextLineups, nextArchives);
        setMessage(buildBulkSummary(data.result, "已批量删除活动"));
        return;
      }

      const updatedIds = new Set(data.result.succeededIds);
      const updatedAt = new Date().toISOString();
      const nextEvents = sortEventsForManager(
        liveEvents.map((event) =>
          updatedIds.has(event.id) ? { ...event, status: bulkEventStatus, updatedAt } : event
        )
      );

      setLiveEvents(nextEvents);
      resetDrafts(selectedEventId, nextEvents, liveLineups, liveArchives);
      setMessage(
        buildBulkSummary(
          data.result,
          `已批量设置活动状态为${bulkEventStatus === "future" ? "未来" : "已结束"}`
        )
      );
    });
  }

  function toggleSelectedEvent(id: string, checked: boolean) {
    setSelectedEventIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)
    );
  }

  function toggleAllFilteredEvents() {
    const filteredIds = filteredEvents.map((event) => event.id);
    setSelectedEventIds((current) =>
      areAllFilteredEventsSelected
        ? current.filter((id) => !filteredIds.includes(id))
        : [...new Set([...current, ...filteredIds])]
    );
  }

  function importLineupEntries() {
    if (!eventDraft.id) {
      setMessage("请先保存活动信息，再从阵容导入档案条目。");
      return;
    }

    const existingTalentIds = new Set(archiveDraft.entries.map((entry) => entry.talentId));
    const missingTalentIds = lineupTalentIds.filter((talentId) => !existingTalentIds.has(talentId));

    if (missingTalentIds.length === 0) {
      setMessage("当前阵容达人都已经在档案里了。");
      return;
    }

    setArchiveDraft((current) => ({
      ...current,
      eventId: eventDraft.id ?? current.eventId,
      entries: [
        ...current.entries,
        ...missingTalentIds.map((talentId) => createArchiveEntry(talentId, defaultSceneAssetId))
      ]
    }));
    setMessage(`已从当前阵容导入 ${missingTalentIds.length} 条档案记录。`);
  }

  function addArchiveEntry() {
    setArchiveDraft((current) => ({
      ...current,
      eventId: eventDraft.id ?? current.eventId,
      entries: [...current.entries, createArchiveEntry(defaultArchiveTalentId, defaultSceneAssetId)]
    }));
    setMessage(null);
  }

  function duplicateArchiveEntry(index: number) {
    const source = archiveDraft.entries[index];
    if (!source) return;

    const duplicate = {
      ...source,
      id: crypto.randomUUID()
    };

    setArchiveDraft((current) => ({
      ...current,
      eventId: eventDraft.id ?? current.eventId,
      entries: [...current.entries.slice(0, index + 1), duplicate, ...current.entries.slice(index + 1)]
    }));
    setMessage("已复制当前档案记录，可继续微调。");
  }

  function handleSceneUploaded(index: number, asset: Asset) {
    setLiveAssets((current) => [asset, ...current]);
    updateArchiveEntry(index, { sceneAssetId: asset.id });
    setMessage(`已上传并选中现场图「${asset.title}」。`);
  }

  function handleSharedUploaded(index: number, asset: Asset) {
    setLiveAssets((current) => [asset, ...current]);
    updateArchiveEntry(index, {
      hasSharedPhoto: true,
      sharedPhotoAssetId: asset.id
    });
    setMessage(`已上传并选中合照「${asset.title}」。`);
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
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
          <button
            type="button"
            data-testid="event-select-all"
            onClick={toggleAllFilteredEvents}
            className="rounded-full border border-white/12 px-3 py-2 transition hover:border-white/25 hover:text-white"
          >
            {areAllFilteredEventsSelected ? "取消全选当前结果" : "全选当前结果"}
          </button>
          <span className="rounded-full border border-white/8 px-3 py-2">
            已选 {selectedEventIds.length} / {liveEvents.length}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full border border-amber-300/30 px-3 py-2 text-amber-200">
              当前编辑未保存
            </span>
          ) : null}
        </div>
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">Bulk Actions</p>
          <select
            value={bulkEventStatus}
            data-testid="bulk-event-status"
            onChange={(event) => setBulkEventStatus(event.target.value as "future" | "past")}
            className="mt-3 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          >
            <option value="future">未来</option>
            <option value="past">已结束</option>
          </select>
          <div className="mt-3 grid gap-3">
            <button
              type="button"
              data-testid="bulk-set-event-status"
              onClick={() => handleBulkEventAction("set_status")}
              disabled={pending || selectedEventIds.length === 0}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 disabled:opacity-50"
            >
              批量设置状态
            </button>
            <button
              type="button"
              data-testid="bulk-delete-events"
              onClick={() => handleBulkEventAction("delete")}
              disabled={pending || selectedEventIds.length === 0}
              className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-200 disabled:opacity-50"
            >
              批量删除活动
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            data-testid="new-event-button"
            onClick={handleNewEvent}
            className="w-full rounded-[1.2rem] border border-dashed border-white/15 px-4 py-4 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            + 新建活动
          </button>
          {filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.id;
            const isChecked = selectedEventIds.includes(event.id);

            return (
              <div
                key={event.id}
                className={`flex items-start gap-3 rounded-[1.2rem] px-3 py-3 transition ${
                  isSelected ? "bg-white/10" : "bg-black/10 hover:bg-white/6"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`选择 ${event.name}`}
                  checked={isChecked}
                  onChange={(eventInput) => toggleSelectedEvent(event.id, eventInput.target.checked)}
                  className="mt-1 size-4 rounded border-white/20 bg-black/30"
                />
                <button type="button" onClick={() => selectEvent(event.id)} className="flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg text-white">{event.name}</p>
                    {isSelected && isEventDirty ? (
                      <span className="rounded-full border border-amber-300/30 px-2 py-1 text-[11px] text-amber-200">
                        未保存
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    {event.status === "future" ? "未来活动" : "已结束活动"} · {event.city || "城市待补充"}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="space-y-6">
        {message ? (
          <div className="rounded-[1.4rem] border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
            {message}
          </div>
        ) : null}

        <section className="surface rounded-[1.8rem] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Archive Workspace</p>
                {isEventDirty ? (
                  <span className="rounded-full border border-amber-300/30 px-3 py-1 text-[11px] text-amber-200">
                    活动信息未保存
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-3xl text-white">
                {selectedEvent ? `编辑 ${selectedEvent.name}` : "新建活动档案"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                活动名称必填，其他信息都可以留空；保存活动后，再继续补录我的现场档案。
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
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="startsAt"
                type="date"
                value={eventDraft.startsAt}
                onChange={(event) => setEventDraft((current) => ({ ...current, startsAt: event.target.value }))}
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
              <input
                name="endsAt"
                type="date"
                value={eventDraft.endsAt}
                onChange={(event) => setEventDraft((current) => ({ ...current, endsAt: event.target.value }))}
                className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
                    setEditableLineups((current) => [...current, createEditableLineup(defaultLineupTalentId)])
                  }
                  className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70"
                >
                  + 添加达人
                </button>
              </div>
              <div className="space-y-3">
                {editableLineups.map((lineup, index) => (
                  <div
                    key={lineup.id}
                    data-testid="lineup-item"
                    className="grid gap-3 rounded-[1.2rem] border border-white/8 p-4 md:grid-cols-[1fr_0.8fr_0.8fr_auto]"
                  >
                    <select
                      data-testid={`lineup-talent-${index}`}
                      value={lineup.talentId}
                      onChange={(event) => updateLineup(index, { talentId: event.target.value })}
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    >
                      <option value="">暂不选择达人</option>
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
                        updateLineup(index, { status: event.target.value as EditableLineup["status"] })
                      }
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    >
                      <option value="confirmed">已确认</option>
                      <option value="pending">待确认</option>
                    </select>
                    <input
                      data-testid={`lineup-source-${index}`}
                      value={lineup.source}
                      onChange={(event) => updateLineup(index, { source: event.target.value })}
                      placeholder="信息来源"
                      className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditableLineups((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      className="rounded-[1rem] border border-red-300/30 px-3 py-2 text-sm text-red-200"
                    >
                      删除
                    </button>
                    <textarea
                      data-testid={`lineup-note-${index}`}
                      value={lineup.note}
                      onChange={(event) => updateLineup(index, { note: event.target.value })}
                      rows={2}
                      placeholder="补充备注"
                      className="md:col-span-4 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-6 text-white/45">
                保存活动信息后不会刷新整页，当前活动和档案草稿都会继续保留。
              </p>
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
            先保存活动基础信息，再开始录入我的现场档案。
          </section>
        ) : (
          <>
            <section className="surface rounded-[1.8rem] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">My Archive</p>
                    {isArchiveDirty ? (
                      <span className="rounded-full border border-amber-300/30 px-3 py-1 text-[11px] text-amber-200">
                        档案未保存
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-2xl text-white">我的现场档案</h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">
                    支持从当前阵容一键导入，再按每条记录微调；现场图和合照都可以直接在对应字段旁上传。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    data-testid="import-lineup-entries"
                    onClick={importLineupEntries}
                    className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/70"
                  >
                    从当前阵容导入
                  </button>
                  <button
                    type="button"
                    data-testid="add-archive-entry"
                    onClick={addArchiveEntry}
                    className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/70"
                  >
                    + 添加现场记录
                  </button>
                </div>
              </div>
              <textarea
                value={archiveDraft.note}
                data-testid="archive-note"
                onChange={(event) =>
                  setArchiveDraft((current) => ({
                    ...current,
                    eventId: eventDraft.id ?? current.eventId,
                    note: event.target.value
                  }))
                }
                rows={3}
                placeholder="活动档案备注"
                className="mt-4 w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
              />
            </section>

            {archiveDraft.entries.length === 0 ? (
              <section className="surface rounded-[1.8rem] px-6 py-10 text-center text-white/60">
                还没有现场记录。可以先从当前阵容导入，或者手动新增一条。
              </section>
            ) : (
              <div className="grid gap-5">
                {archiveDraft.entries.map((entry, index) => (
                  <section key={entry.id} data-testid="archive-entry" className="surface rounded-[1.8rem] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm uppercase tracking-[0.2em] text-white/45">记录 {index + 1}</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          data-testid={`archive-copy-${index}`}
                          onClick={() => duplicateArchiveEntry(index)}
                          className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70"
                        >
                          复制此条
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setArchiveDraft((current) => ({
                              ...current,
                              entries: current.entries.filter((_, itemIndex) => itemIndex !== index)
                            }))
                          }
                          className="rounded-full border border-red-300/30 px-4 py-2 text-sm text-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        data-testid={`archive-talent-${index}`}
                        value={entry.talentId}
                        onChange={(event) => updateArchiveEntry(index, { talentId: event.target.value })}
                        className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">暂不选择达人</option>
                        {talents.map((talent) => (
                          <option key={talent.id} value={talent.id}>
                            {talent.nickname}
                          </option>
                        ))}
                      </select>
                      <select
                        data-testid={`archive-scene-${index}`}
                        value={entry.sceneAssetId}
                        onChange={(event) => updateArchiveEntry(index, { sceneAssetId: event.target.value })}
                        className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">暂不选择现场图</option>
                        {sceneAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.title}
                          </option>
                        ))}
                      </select>
                      <input
                        data-testid={`archive-cosplay-${index}`}
                        value={entry.cosplayTitle}
                        onChange={(event) => updateArchiveEntry(index, { cosplayTitle: event.target.value })}
                        placeholder="角色 / 作品 / 游戏"
                        className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="mt-3">
                      <InlineAssetUpload
                        kind="event_scene"
                        dataTestId={`archive-scene-upload-${index}`}
                        onUploaded={(asset) => handleSceneUploaded(index, asset)}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                      <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                        <input
                          data-testid={`archive-recognized-${index}`}
                          type="checkbox"
                          checked={entry.recognized}
                          onChange={(event) => updateArchiveEntry(index, { recognized: event.target.checked })}
                        />
                        是否认出
                      </label>
                      <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
                        <input
                          data-testid={`archive-shared-flag-${index}`}
                          type="checkbox"
                          checked={entry.hasSharedPhoto}
                          onChange={(event) =>
                            updateArchiveEntry(index, {
                              hasSharedPhoto: event.target.checked,
                              sharedPhotoAssetId: event.target.checked
                                ? (entry.sharedPhotoAssetId ?? sharedAssets[0]?.id ?? null)
                                : null
                            })
                          }
                        />
                        是否有合照
                      </label>
                    </div>
                    {entry.hasSharedPhoto ? (
                      <div className="mt-4 space-y-3">
                        <select
                          data-testid={`archive-shared-${index}`}
                          value={entry.sharedPhotoAssetId ?? ""}
                          onChange={(event) => updateArchiveEntry(index, { sharedPhotoAssetId: event.target.value })}
                          className="w-full rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
                        >
                          <option value="">暂不选择合照</option>
                          {sharedAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.title}
                            </option>
                          ))}
                        </select>
                        <InlineAssetUpload
                          kind="shared_photo"
                          dataTestId={`archive-shared-upload-${index}`}
                          onUploaded={(asset) => handleSharedUploaded(index, asset)}
                        />
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-6 text-white/45">
                保存我的档案只会更新当前编辑人的现场档案，不会覆盖共享活动信息。
              </p>
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
      </section>
    </div>
  );
}
