import { createArchiveDraft } from "@/components/admin/archive-manager-utils";
import type { EditorArchive } from "@/modules/domain/types";

describe("archive manager utils", () => {
  it("normalizes saved archive entry dates back to date input values", () => {
    const archives: EditorArchive[] = [
      {
        id: "archive-1",
        editorId: "editor-1",
        eventId: "event-1",
        note: "",
        updatedAt: "2026-04-19T00:00:00.000Z",
        entries: [
          {
            id: "entry-1",
            talentId: "talent-1",
            entryDate: "2026-04-18T12:00:00.000Z",
            sceneAssetId: null,
            sharedPhotoAssetId: null,
            cosplayTitle: "Test Role",
            hasSharedPhoto: false
          }
        ]
      }
    ];

    const draft = createArchiveDraft("event-1", archives);

    expect(draft.entries[0]?.entryDate).toBe("2026-04-18");
  });
});
