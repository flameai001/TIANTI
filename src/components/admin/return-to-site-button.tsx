"use client";

import { usePathname } from "next/navigation";
import { GuardedLink } from "@/components/admin/guarded-link";

function resolveFrontHref(pathname: string) {
  if (pathname.startsWith("/admin/talents")) {
    return "/talents";
  }

  if (pathname.startsWith("/admin/archives") || pathname.startsWith("/admin/events")) {
    return "/events";
  }

  if (pathname.startsWith("/admin/ladder")) {
    return "/ladder";
  }

  return "/";
}

export function ReturnToSiteButton() {
  const pathname = usePathname();
  const href = resolveFrontHref(pathname);

  return (
    <GuardedLink
      href={href}
      data-testid="return-to-site"
      className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
    >
      返回前台
    </GuardedLink>
  );
}
