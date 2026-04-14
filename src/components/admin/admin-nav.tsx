"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/talents", label: "达人" },
  { href: "/admin/ladder", label: "天梯榜" },
  { href: "/admin/archives", label: "活动档案" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              active
                ? "border-transparent bg-[var(--color-accent)] text-black"
                : "border-white/12 bg-black/15 text-white/70 hover:border-white/25 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
