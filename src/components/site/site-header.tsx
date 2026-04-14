import Link from "next/link";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/talents", label: "达人" },
  { href: "/ladder", label: "天梯榜" },
  { href: "/events", label: "活动档案" }
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-xl", className)}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-8 px-5 py-4 md:px-8">
        <Link href="/" className="space-y-1 text-white">
          <span className="block font-display text-3xl tracking-[0.24em]">TIANTI</span>
          <span className="block text-[10px] uppercase tracking-[0.35em] text-white/55">
            Editorial Archive
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-white/75 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
