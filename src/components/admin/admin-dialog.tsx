"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AdminDialogProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
}

const sizeClassNames = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl"
};

export function AdminDialog({ title, description, children, footer, onClose, size = "md" }: AdminDialogProps) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(238,243,248,0.76)] px-4 py-6 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "surface max-h-[calc(100vh-3rem)] w-full overflow-y-auto rounded-[1.8rem] p-6 shadow-[0_24px_80px_rgba(91,109,133,0.16)]",
          sizeClassNames[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line-soft)] pb-4">
          <div>
            <h2 id={titleId} className="text-2xl text-[var(--foreground)]">
              {title}
            </h2>
            {description ? <p className="mt-2 text-sm leading-6 ui-subtle">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="ui-button-secondary px-3 py-2 text-sm">
            关闭
          </button>
        </div>
        <div className="py-5">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--line-soft)] pt-4">
          {footer}
        </div>
      </section>
    </div>
  );
}
