"use client";

import { usePathname } from "next/navigation";
import { GuardedLink } from "@/components/admin/guarded-link";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/admin", label: "总览" },
  { href: "/admin/talents", label: "达人" },
  { href: "/admin/archives", label: "活动" },
  { href: "/admin/ladder", label: "天梯" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <GuardedLink
            key={item.href}
            href={item.href}
            className={cn(
              "ui-pill px-4 py-2 text-sm",
              active && "border-[rgba(43,109,246,0.22)] bg-[rgba(43,109,246,0.08)] text-[var(--color-accent)]"
            )}
          >
            {item.label}
          </GuardedLink>
        );
      })}
    </nav>
  );
}
