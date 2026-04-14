import { ArchiveManager } from "@/components/admin/archive-manager";
import { requireAuthenticatedEditor } from "@/lib/session";
import { getContentState } from "@/modules/content/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminArchivesPage({ searchParams }: { searchParams: SearchParams }) {
  const editor = await requireAuthenticatedEditor();
  const params = await searchParams;
  const state = await getContentState();
  const archives = state.archives.filter((archive) => archive.editorId === editor.id);
  const requestedEventId = typeof params.event === "string" ? params.event : undefined;
  const initialSelectedEventId = state.events.some((event) => event.id === requestedEventId)
    ? requestedEventId
    : (state.events[0]?.id ?? null);

  return (
    <ArchiveManager
      events={state.events}
      talents={state.talents}
      assets={state.assets}
      lineups={state.lineups}
      archives={archives}
      initialSelectedEventId={initialSelectedEventId}
    />
  );
}
