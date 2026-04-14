import { AdminUnsavedChangesProvider } from "@/components/admin/admin-unsaved-changes";
import { AdminNav } from "@/components/admin/admin-nav";
import { ReturnToSiteButton } from "@/components/admin/return-to-site-button";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { appEnv, isMockContentMode, isMockStorageMode } from "@/lib/env";
import { requireAuthenticatedEditor } from "@/lib/session";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const editor = await requireAuthenticatedEditor();
  const contentMode = isMockContentMode() ? "Mock 演示数据" : "Postgres 正式数据";
  const storageMode = isMockStorageMode() ? "Mock 占位存储" : "Cloudflare R2";

  return (
    <AdminUnsavedChangesProvider>
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">TIANTI Admin</p>
            <h1 className="mt-3 text-4xl text-white">{editor.name} 的后台</h1>
            <p className="mt-2 text-sm leading-7 text-white/65">
              共享活动信息与达人资料在这里统一维护；天梯榜和我的活动档案仍只开放给当前账号编辑。
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
        <div className="mb-8 rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/70">
          <p>
            当前内容模式：<span className="text-white">{contentMode}</span>
            {" 路 "}
            图片存储：<span className="text-white">{storageMode}</span>
          </p>
          <p className="mt-2 text-white/55">
            {!isMockContentMode()
              ? "线上内容已经从 Postgres 读取。"
              : "当前仍在读取本地 mock 数据。"}
            {!isMockStorageMode()
              ? ` 图片上传会直传到 R2 bucket「${appEnv.R2_BUCKET}」，公开地址走 ${appEnv.R2_PUBLIC_BASE_URL}。`
              : " 图片上传仍未启用真实对象存储。"}
          </p>
        </div>
        {children}
      </main>
    </AdminUnsavedChangesProvider>
  );
}
