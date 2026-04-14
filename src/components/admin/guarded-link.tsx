"use client";

import Link, { type LinkProps } from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useAdminUnsavedChanges } from "@/components/admin/admin-unsaved-changes";

type GuardedLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
  "data-testid"?: string;
};

export function GuardedLink({ children, onClick, ...props }: GuardedLinkProps) {
  const { confirmNavigation } = useAdminUnsavedChanges();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      !confirmNavigation()
    ) {
      event.preventDefault();
    }
  }

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
