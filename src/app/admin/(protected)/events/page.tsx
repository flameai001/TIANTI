import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminEventsRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  }

  redirect(nextParams.size > 0 ? `/admin/archives?${nextParams.toString()}` : "/admin/archives");
}
