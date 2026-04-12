import { formatDate } from "@/lib/date";
import { requireAuthenticatedEditor } from "@/lib/session";
import { getAdminDashboard, getContentState } from "@/modules/content/service";

export default async function AdminDashboardPage() {
  const editor = await requireAuthenticatedEditor();
  const [data, state] = await Promise.all([getAdminDashboard(editor.id), getContentState()]);
  const eventMap = new Map(state.events.map((event) => [event.id, event]));

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <section className="surface rounded-[1.8rem] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">最近更新的达人</p>
        <div className="mt-4 space-y-4">
          {data.recentTalents.map((talent) => (
            <div key={talent.id}>
              <p className="text-lg text-white">{talent.nickname}</p>
              <p className="text-sm text-white/55">{formatDate(talent.updatedAt)}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="surface rounded-[1.8rem] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">最近更新的活动</p>
        <div className="mt-4 space-y-4">
          {data.recentEvents.map((event) => (
            <div key={event.id}>
              <p className="text-lg text-white">{event.name}</p>
              <p className="text-sm text-white/55">{event.city}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="surface rounded-[1.8rem] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">即将到来的活动</p>
        <div className="mt-4 space-y-4">
          {data.upcomingEvents.map((event) => (
            <div key={event.id}>
              <p className="text-lg text-white">{event.name}</p>
              <p className="text-sm text-white/55">{event.city}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="surface rounded-[1.8rem] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">我最近改过的档案</p>
        <div className="mt-4 space-y-4">
          {data.myRecentArchives.map((archive) => {
            const event = eventMap.get(archive.eventId);
            return (
              <div key={archive.id}>
                <p className="text-lg text-white">{event?.name ?? "未命名活动"}</p>
                <p className="text-sm text-white/55">{formatDate(archive.updatedAt)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
