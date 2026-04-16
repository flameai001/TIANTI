import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-3xl text-center")}>
      <p className="ui-kicker">{eyebrow}</p>
      <div className="space-y-3">
        <h2 className="text-3xl tracking-[-0.03em] text-[var(--foreground)] md:text-5xl">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 ui-subtle md:text-base">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
