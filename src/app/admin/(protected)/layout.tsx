import { AdminUnsavedChangesProvider } from "@/components/admin/admin-unsaved-changes";
import { AdminNav } from "@/components/admin/admin-nav";
import { ReturnToSiteButton } from "@/components/admin/return-to-site-button";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAuthenticatedEditor } from "@/lib/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const editor = await requireAuthenticatedEditor();

  return (
    <AdminUnsavedChangesProvider>
      <main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <section className="surface overflow-hidden rounded-[2.2rem] p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
            <div className="space-y-4">
              <p className="ui-kicker">TIANTI Admin</p>
              <h1 className="text-4xl tracking-[-0.04em] text-[var(--foreground)] md:text-5xl">
                {editor.name} 的工作台
              </h1>
              <p className="max-w-3xl text-sm leading-7 ui-subtle md:text-base">
                在同一套工作语言里维护达人资料、活动信息、现场档案与公开天梯。这里优先保证清晰度、反馈和操作连续性。
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <AdminNav />
              <div className="flex flex-wrap items-center gap-3">
                <ReturnToSiteButton />
                <SignOutButton />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">{children}</div>
      </main>
    </AdminUnsavedChangesProvider>
  );
}
