import Link from "next/link";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/talents", label: "达人" },
  { href: "/events", label: "活动" },
  { href: "/ladder", label: "天梯" },
  { href: "/search", label: "搜索" }
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-[var(--line-soft)] bg-[rgba(248,251,255,0.72)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.15fr_0.95fr_1fr] md:px-8">
        <div className="space-y-4">
          <p className="font-display text-3xl tracking-[0.18em] text-[var(--foreground)]">TIANTI</p>
          <p className="max-w-md text-sm leading-7 ui-subtle">
            用统一的浏览入口连接达人、活动、公开档案与编辑视角，让内容本身成为第一层体验。
          </p>
        </div>
        <div className="space-y-3">
          <p className="ui-kicker">Navigate</p>
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="ui-pill px-4 py-2 text-sm">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="ui-kicker">Positioning</p>
          <p className="text-sm leading-7 ui-subtle">
            公开站负责展示、浏览与发现，后台负责维护、录入与结构化编辑，共享同一套产品语言。
          </p>
        </div>
      </div>
    </footer>
  );
}
