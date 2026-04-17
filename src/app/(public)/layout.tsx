import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
