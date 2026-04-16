import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function FilterBar({ children, className, compact = false }: FilterBarProps) {
  return (
    <div
      className={cn(
        "surface rounded-[1.9rem] border px-4 py-4 md:px-5",
        compact ? "space-y-3" : "space-y-4",
        className
      )}
    >
      {children}
    </div>
  );
}
