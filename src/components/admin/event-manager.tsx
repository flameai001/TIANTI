"use client";

import { useMemo, useState, useTransition } from "react";
import type { Event, EventLineup, Talent } from "@/modules/domain/types";

interface EventManagerProps {
  events: Event[];
  talents: Talent[];
  lineups: EventLineup[];
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

export function EventManager({ events, talents, lineups }: EventManagerProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);
  const [editableLineups, setEditableLineups] = useState<EditableLineup[]>(
    selectedId ? lineups.filter((lineup) => lineup.eventId === selectedId) : []
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.name} ${event.city} ${event.venue}`.toLowerCase().includes(query.toLowerCase())
      ),
    [events, query]
  );

  const selectedEvent = events.find((event) => event.id === selectedId);

  function chooseEvent(id: string | null) {
    setSelectedId(id);
    setEditableLineups(id ? lineups.filter((lineup) => lineup.eventId === id) : []);
    setMessage(null);
  }

  async function handleSave(formData: FormData) {
    setMessage(null);

    const id = String(formData.get("id") || "");
    const payload = {
      id: id || undefined,
      name: String(formData.get("name") || ""),
      slug: String(formData.get("slug") || ""),
      startsAt: String(formData.get("startsAt") || ""),
      endsAt: String(formData.get("endsAt") || ""),
      city: String(formData.get("city") || ""),
      venue: String(formData.get("venue") || ""),
      status: String(formData.get("status") || "future"),
      note: String(formData.get("note") || ""),
      lineups: editableLineups
    };

    startTransition(async () => {
      const response = await fetch(id ? `/api/admin/events/${id}` : "/api/admin/events", {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "保存失败。");
        return;
      }

      window.location.reload();
    });
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    if (!confirm(`确定删除 ${selectedEvent.name} 吗？`)) return;

    startTransition(async () => {
      const response = await fetch(`/api/admin/events/${selectedEvent.id}`, {
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
    <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
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
            onClick={() => chooseEvent(null)}
            className="w-full rounded-[1.2rem] border border-dashed border-white/15 px-4 py-4 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            + 新建活动
          </button>
          {filteredEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => chooseEvent(event.id)}
              className={`w-full rounded-[1.2rem] px-4 py-4 text-left transition ${
                selectedId === event.id ? "bg-white/10 text-white" : "bg-black/10 text-white/70 hover:bg-white/6"
              }`}
            >
              <p className="text-lg">{event.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{event.city}</p>
            </button>
          ))}
        </div>
      </aside>
      <section className="surface rounded-[1.8rem] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Event Editor</p>
            <h2 className="mt-3 text-3xl text-white">{selectedEvent ? `编辑 ${selectedEvent.name}` : "新建活动"}</h2>
          </div>
          {selectedEvent ? (
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
          <input type="hidden" name="id" value={selectedEvent?.id ?? ""} />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              defaultValue={selectedEvent?.name ?? ""}
              placeholder="活动名称"
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
            <input
              name="slug"
              defaultValue={selectedEvent?.slug ?? ""}
              placeholder="slug（留空自动生成）"
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="startsAt"
              type="datetime-local"
              defaultValue={toInputDate(selectedEvent?.startsAt)}
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
            <input
              name="endsAt"
              type="datetime-local"
              defaultValue={toInputDate(selectedEvent?.endsAt)}
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              name="city"
              defaultValue={selectedEvent?.city ?? ""}
              placeholder="城市"
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
            <input
              name="venue"
              defaultValue={selectedEvent?.venue ?? ""}
              placeholder="场馆"
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            />
            <select
              name="status"
              defaultValue={selectedEvent?.status ?? "future"}
              className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
            >
              <option value="future">未来</option>
              <option value="past">已结束</option>
            </select>
          </div>
          <textarea
            name="note"
            defaultValue={selectedEvent?.note ?? ""}
            rows={4}
            placeholder="活动说明或备注"
            className="w-full rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
          <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-white">达人阵容</h3>
              <button
                type="button"
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
                <div key={`${lineup.id ?? "new"}-${index}`} className="grid gap-3 rounded-[1.2rem] border border-white/8 p-4 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
                  <select
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
          {message ? <p className="text-sm text-amber-200">{message}</p> : null}
          <div className="flex justify-end">
            <button
              disabled={pending}
              className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
            >
              {pending ? "保存中..." : "保存并公开"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
