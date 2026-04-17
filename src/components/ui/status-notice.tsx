import { cn } from "@/lib/cn";

interface StatusNoticeProps {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}

const toneMap = {
  info: "border-[rgba(43,109,246,0.14)] bg-[rgba(43,109,246,0.08)] text-[var(--foreground)]",
  success: "border-[rgba(43,146,93,0.16)] bg-[rgba(43,146,93,0.08)] text-[#1f6f48]",
  warning: "border-[rgba(187,138,58,0.2)] bg-[rgba(187,138,58,0.1)] text-[#734d07]",
  error: "border-[rgba(187,61,61,0.2)] bg-[rgba(187,61,61,0.08)] text-[#7d1622]"
} as const;

export function StatusNotice({ children, variant = "info", className }: StatusNoticeProps) {
  return (
    <div className={cn("rounded-[1.2rem] border px-4 py-3 text-sm leading-6", toneMap[variant], className)}>
      {children}
    </div>
  );
}
