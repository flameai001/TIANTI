import { cn } from "@/lib/cn";

interface SplitWorkspaceProps {
  rail: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  railClassName?: string;
  contentClassName?: string;
}

export function SplitWorkspace({
  rail,
  children,
  className,
  railClassName,
  contentClassName
}: SplitWorkspaceProps) {
  return (
    <div className={cn("grid gap-6 xl:grid-cols-[0.78fr_1.22fr]", className)}>
      <aside className={cn("space-y-4", railClassName)}>{rail}</aside>
      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </div>
  );
}
