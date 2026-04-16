import { cn } from "@/lib/cn";

interface EditorialHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
  contentClassName
}: EditorialHeroProps) {
  return (
    <section
      className={cn(
        "editorial-grid relative overflow-hidden rounded-[2.4rem] border border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,251,255,0.72))] shadow-[var(--shadow-strong)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,109,246,0.12),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(210,155,102,0.16),transparent_28%)]" />
      <div
        className={cn(
          "relative grid gap-10 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12",
          contentClassName
        )}
      >
        <div className="flex min-h-[24rem] flex-col justify-between gap-8 md:min-h-[29rem]">
          <div className="space-y-5">
            {eyebrow ? <p className="ui-kicker">{eyebrow}</p> : null}
            <h1 className="max-w-4xl font-display text-5xl leading-[0.95] tracking-[-0.05em] text-[var(--foreground)] md:text-7xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-8 ui-subtle md:text-lg">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}
