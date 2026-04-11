import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAuthenticatedEditor } from "@/lib/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const editor = await requireAuthenticatedEditor();

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">TIANTI Admin</p>
          <h1 className="mt-3 text-4xl text-white">{editor.name} 的后台</h1>
          <p className="mt-2 text-sm leading-7 text-white/65">
            共享内容在这里统一维护；天梯榜和活动档案只开放自己的编辑区域。
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <AdminNav />
          <SignOutButton />
        </div>
      </div>
      <div className="mb-8 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/60">
        当前默认运行在 mock 内容模式。公开站、后台 UI 与权限边界已经可验证；接入 Postgres / R2 后可切换到正式持久化模式。
      </div>
      {children}
    </main>
  );
}
