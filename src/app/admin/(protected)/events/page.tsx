import { EventManager } from "@/components/admin/event-manager";
import { getContentState } from "@/modules/content/service";

export default async function AdminEventsPage() {
  const state = await getContentState();

  return <EventManager events={state.events} talents={state.talents} lineups={state.lineups} />;
}
