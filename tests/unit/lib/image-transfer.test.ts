import { getImageFileFromTransfer, hasImageFileInTransfer } from "@/lib/image-transfer";

describe("image transfer helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates pasted image files from clipboard items", () => {
    vi.spyOn(Date, "now").mockReturnValue(1713700800000);

    const clipboardFile = new File([new Uint8Array([1, 2, 3])], "", {
      type: ""
    });

    const result = getImageFileFromTransfer(
      {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => clipboardFile
          }
        ],
        files: []
      },
      { fallbackBaseName: "pasted-image" }
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe("pasted-image-1713700800000.png");
    expect(result?.type).toBe("image/png");
  });

  it("detects image data in clipboard-like transfers", () => {
    expect(
      hasImageFileInTransfer({
        items: [
          {
            kind: "file",
            type: "image/webp",
            getAsFile: () => new File(["x"], "clipboard.webp", { type: "image/webp" })
          }
        ],
        files: []
      })
    ).toBe(true);

    expect(
      hasImageFileInTransfer({
        items: [
          {
            kind: "string",
            type: "text/plain",
            getAsFile: () => null
          }
        ],
        files: []
      })
    ).toBe(false);
  });

  it("falls back to file lists for dropped images", () => {
    const droppedFile = new File(["x"], "scene-cover.webp", {
      type: "image/webp"
    });

    const result = getImageFileFromTransfer({
      items: [],
      files: [droppedFile]
    });

    expect(result).toBe(droppedFile);
  });
});
