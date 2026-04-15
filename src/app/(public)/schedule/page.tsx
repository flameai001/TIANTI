import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readStringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ScheduleRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const key of ["q", "city", "talent"] as const) {
    const value = readStringParam(params[key]);
    if (value) {
      nextParams.set(key, value);
    }
  }

  const date =
    readStringParam(params.date) ??
    readStringParam(params.from) ??
    readStringParam(params.to);

  nextParams.set("eventStatus", "future");
  if (date) {
    nextParams.set("date", date);
  }

  redirect(`/events?${nextParams.toString()}`);
}
