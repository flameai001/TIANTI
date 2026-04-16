import { cn } from "@/lib/cn";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "public" | "admin";
  fullBleed?: boolean;
}

export function PageShell({
  children,
  className,
  contentClassName,
  variant = "public",
  fullBleed = false
}: PageShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-[calc(100svh-4.5rem)]",
        variant === "public" && "pb-20 pt-8 md:pb-28 md:pt-10",
        variant === "admin" && "pb-10 pt-6 md:pb-12 md:pt-8",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          fullBleed ? "max-w-none" : "max-w-7xl px-5 md:px-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </main>
  );
}
