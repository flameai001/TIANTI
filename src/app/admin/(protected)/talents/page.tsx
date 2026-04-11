import { TalentManager } from "@/components/admin/talent-manager";
import { getContentState } from "@/modules/content/service";

export default async function AdminTalentsPage() {
  const state = await getContentState();

  return <TalentManager talents={state.talents} assets={state.assets} />;
}
