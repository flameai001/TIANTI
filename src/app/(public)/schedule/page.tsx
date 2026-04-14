import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readStringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ScheduleRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const key of ["q", "city", "talent", "from", "to"] as const) {
    const value = readStringParam(params[key]);
    if (value) {
      nextParams.set(key, value);
    }
  }

  const legacyParticipationStatus = readStringParam(params.status);
  const participationStatus =
    readStringParam(params.participationStatus) ??
    (legacyParticipationStatus && ["confirmed", "pending"].includes(legacyParticipationStatus)
      ? legacyParticipationStatus
      : undefined);

  nextParams.set("eventStatus", "future");
  if (participationStatus) {
    nextParams.set("participationStatus", participationStatus);
  }

  redirect(`/events?${nextParams.toString()}`);
}
