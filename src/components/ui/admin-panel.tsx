import { cn } from "@/lib/cn";

interface AdminPanelProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function AdminPanel({
  eyebrow,
  title,
  description,
  action,
  footer,
  children,
  className,
  bodyClassName
}: AdminPanelProps) {
  return (
    <section className={cn("surface rounded-[1.9rem] p-5 md:p-6", className)}>
      {eyebrow || title || description || action ? (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {eyebrow ? <p className="ui-kicker">{eyebrow}</p> : null}
            {title ? <h2 className="text-3xl tracking-[-0.03em] text-[var(--foreground)]">{title}</h2> : null}
            {description ? <p className="max-w-3xl text-sm leading-7 ui-subtle">{description}</p> : null}
          </div>
          {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
      {footer ? <div className="mt-6 border-t pt-4 ui-divider">{footer}</div> : null}
    </section>
  );
}
