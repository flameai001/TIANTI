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
    <GuardedLink href={href} data-testid="return-to-site" className="ui-button-secondary min-h-[44px] min-w-[8.5rem] px-4 py-2 text-sm">
      返回公开站
    </GuardedLink>
  );
}
