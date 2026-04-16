import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("surface rounded-[1.7rem] px-6 py-10 text-center", className)}>
      <div className="mx-auto max-w-xl space-y-3">
        <h3 className="text-2xl text-[var(--foreground)]">{title}</h3>
        <p className="text-sm leading-7 ui-subtle">{description}</p>
        {action ? <div className="flex justify-center pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
