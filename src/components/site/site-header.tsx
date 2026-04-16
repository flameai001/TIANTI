import Link from "next/link";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/talents", label: "达人" },
  { href: "/events", label: "活动" },
  { href: "/ladder", label: "天梯" },
  { href: "/search", label: "搜索" }
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-[var(--line-soft)] bg-[rgba(247,250,254,0.84)] backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/" className="space-y-1">
          <span className="block font-display text-3xl tracking-[0.18em] text-[var(--foreground)]">TIANTI</span>
          <span className="block text-[11px] uppercase tracking-[0.3em] ui-muted">Curated Talent Archive</span>
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="ui-pill px-4 py-2 text-sm">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/admin" className="ui-button-primary px-4 py-2 text-sm">
            编辑后台
          </Link>
        </div>
      </div>
    </header>
  );
}
