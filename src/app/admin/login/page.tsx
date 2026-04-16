import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-6xl">
        <div className="surface grid overflow-hidden rounded-[2.5rem] md:grid-cols-[1.05fr_0.95fr]">
          <div className="editorial-grid relative overflow-hidden px-6 py-10 md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,109,246,0.14),transparent_36%),radial-gradient(circle_at_80%_15%,rgba(210,155,102,0.18),transparent_30%)]" />
            <div className="relative space-y-6">
              <p className="ui-kicker">TIANTI Workspace</p>
              <h1 className="font-display text-5xl tracking-[-0.05em] text-[var(--foreground)] md:text-6xl">
                进入统一工作台
              </h1>
              <p className="max-w-xl text-base leading-8 ui-subtle">
                后台负责维护达人资料、活动信息、现场档案与公开天梯。登录后会直接进入你的工作上下文。
              </p>
              <div className="grid gap-3 md:max-w-md">
                <div className="ui-stat">
                  <p className="text-sm ui-muted">Talents</p>
                  <p className="mt-2 text-lg text-[var(--foreground)]">统一列表、编辑与图片维护</p>
                </div>
                <div className="ui-stat">
                  <p className="text-sm ui-muted">Events & Archives</p>
                  <p className="mt-2 text-lg text-[var(--foreground)]">事件信息、阵容与现场档案共用一套工作区</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[rgba(255,255,255,0.82)] p-6 md:p-10">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
