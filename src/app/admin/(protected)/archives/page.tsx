import { ArchiveManager } from "@/components/admin/archive-manager";
import { requireAuthenticatedEditor } from "@/lib/session";
import { getContentState } from "@/modules/content/service";

export default async function AdminArchivesPage() {
  const editor = await requireAuthenticatedEditor();
  const state = await getContentState();
  const archives = state.archives.filter((archive) => archive.editorId === editor.id);

  return <ArchiveManager events={state.events} talents={state.talents} assets={state.assets} archives={archives} />;
}
