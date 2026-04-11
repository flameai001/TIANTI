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
      <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">{eyebrow}</p>
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-[0.02em] text-white md:text-5xl">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-white/68 md:text-base">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
