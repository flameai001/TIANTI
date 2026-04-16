import Link from "next/link";
import { AdminPanel } from "@/components/ui/admin-panel";
import { formatDate } from "@/lib/date";
import { requireAuthenticatedEditor } from "@/lib/session";
import { getAdminDashboard, getContentState } from "@/modules/content/service";

export default async function AdminDashboardPage() {
  const editor = await requireAuthenticatedEditor();
  const [data, state] = await Promise.all([getAdminDashboard(editor.id), getContentState()]);
  const eventMap = new Map(state.events.map((event) => [event.id, event]));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel
          eyebrow="Overview"
          title="当前工作上下文"
          description="从最近更新、即将发生的活动和我的档案记录开始，快速回到正在维护的内容。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="ui-stat">
              <p className="text-sm ui-muted">公开达人</p>
              <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">{state.talents.length}</p>
            </div>
            <div className="ui-stat">
              <p className="text-sm ui-muted">公开活动</p>
              <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">{state.events.length}</p>
            </div>
            <div className="ui-stat">
              <p className="text-sm ui-muted">我的档案</p>
              <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">
                {state.archives.filter((archive) => archive.editorId === editor.id).length}
              </p>
            </div>
            <div className="ui-stat">
              <p className="text-sm ui-muted">我的天梯</p>
              <p className="mt-2 text-3xl tracking-[-0.04em] text-[var(--foreground)]">
                {state.ladders.find((ladder) => ladder.editorId === editor.id)?.tiers.length ?? 0}
              </p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          eyebrow="Quick Links"
          title="常用入口"
          description="不需要先经过摘要卡，直接回到对应工作区。"
        >
          <div className="grid gap-3">
            <Link href="/admin/talents" className="ui-pill justify-between px-4 py-3 text-sm">
              Talents
              <span className="ui-muted">列表与编辑</span>
            </Link>
            <Link href="/admin/archives" className="ui-pill justify-between px-4 py-3 text-sm">
              Events & Archives
              <span className="ui-muted">活动、阵容、现场档案</span>
            </Link>
            <Link href="/admin/ladder" className="ui-pill justify-between px-4 py-3 text-sm">
              Ladder
              <span className="ui-muted">公开排序与梯度</span>
            </Link>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AdminPanel eyebrow="Recent Talents" title="最近更新的达人">
          <div className="space-y-4">
            {data.recentTalents.map((talent) => (
              <div key={talent.id} className="border-b pb-4 last:border-none last:pb-0 ui-divider">
                <p className="text-lg text-[var(--foreground)]">{talent.nickname}</p>
                <p className="mt-1 text-sm ui-subtle">{formatDate(talent.updatedAt)}</p>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Recent Events" title="最近更新的活动">
          <div className="space-y-4">
            {data.recentEvents.map((event) => (
              <div key={event.id} className="border-b pb-4 last:border-none last:pb-0 ui-divider">
                <p className="text-lg text-[var(--foreground)]">{event.name}</p>
                <p className="mt-1 text-sm ui-subtle">{event.city || "城市待定"}</p>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Upcoming" title="即将发生的活动">
          <div className="space-y-4">
            {data.upcomingEvents.map((event) => (
              <div key={event.id} className="border-b pb-4 last:border-none last:pb-0 ui-divider">
                <p className="text-lg text-[var(--foreground)]">{event.name}</p>
                <p className="mt-1 text-sm ui-subtle">{event.city || "城市待定"}</p>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="My Archives" title="我最近编辑的档案">
          <div className="space-y-4">
            {data.myRecentArchives.map((archive) => {
              const event = eventMap.get(archive.eventId);
              return (
                <div key={archive.id} className="border-b pb-4 last:border-none last:pb-0 ui-divider">
                  <p className="text-lg text-[var(--foreground)]">{event?.name ?? "未命名活动"}</p>
                  <p className="mt-1 text-sm ui-subtle">{formatDate(archive.updatedAt)}</p>
                </div>
              );
            })}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
