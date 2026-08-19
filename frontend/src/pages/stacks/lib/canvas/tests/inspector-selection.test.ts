import { describe, expect, it } from "vitest";
import {
  openVolumeFrom,
  pruneSelection,
  remapSelectionByName,
  selectionKey,
  stepBack,
  type InspectorSelection,
} from "../inspector-selection";

const RESOURCES = [{ name: "web" }, { name: "worker" }];
const VOLUMES = new Set(["uploads", "cache"]);

describe("openVolumeFrom", () => {
  it("remembers the service it was opened from", () => {
    const next = openVolumeFrom({ kind: "resource", index: 0 }, "uploads", RESOURCES);
    expect(next).toEqual({ kind: "volume", name: "uploads", from: { index: 0, name: "web" } });
  });

  it("has no way back when opened straight off the canvas", () => {
    expect(openVolumeFrom(null, "uploads", RESOURCES)).toEqual({ kind: "volume", name: "uploads" });
  });

  it("does not chain one volume onto another", () => {
    // Two levels is the whole depth: a volume opened while a volume is open
    // replaces it, rather than growing the stack this type exists to kill.
    const first: InspectorSelection = { kind: "volume", name: "uploads", from: { index: 0, name: "web" } };
    expect(openVolumeFrom(first, "cache", RESOURCES)).toEqual({ kind: "volume", name: "cache" });
  });

  it("drops the trail when the source resource has no name yet", () => {
    expect(openVolumeFrom({ kind: "resource", index: 0 }, "uploads", [{}])).toEqual({
      kind: "volume",
      name: "uploads",
    });
  });
});

describe("stepBack", () => {
  it("returns a volume to the service it came from", () => {
    const from: InspectorSelection = { kind: "volume", name: "uploads", from: { index: 1, name: "worker" } };
    expect(stepBack(from)).toEqual({ kind: "resource", index: 1 });
  });

  it("closes a volume that has nowhere to go back to", () => {
    expect(stepBack({ kind: "volume", name: "uploads" })).toBeNull();
  });

  it("closes from a resource — one binding does both jobs", () => {
    expect(stepBack({ kind: "resource", index: 0 })).toBeNull();
  });
});

describe("remapSelectionByName", () => {
  const to = { resources: [{ name: "worker" }, { name: "web" }], volumeNames: VOLUMES };

  it("follows a resource to its new index in the other list", () => {
    expect(remapSelectionByName({ kind: "resource", index: 0 }, { resources: RESOURCES }, to)).toEqual({
      kind: "resource",
      index: 1,
    });
  });

  it("closes a resource with no counterpart", () => {
    const from = { resources: [{ name: "gone" }] };
    expect(remapSelectionByName({ kind: "resource", index: 0 }, from, to)).toBeNull();
  });

  it("remaps the volume's way back along with the volume", () => {
    const sel: InspectorSelection = { kind: "volume", name: "uploads", from: { index: 0, name: "web" } };
    expect(remapSelectionByName(sel, { resources: RESOURCES }, to)).toEqual({
      kind: "volume",
      name: "uploads",
      from: { index: 1, name: "web" },
    });
  });

  it("keeps a volume whose source resource is gone, minus its way back", () => {
    const sel: InspectorSelection = { kind: "volume", name: "uploads", from: { index: 0, name: "web" } };
    const target = { resources: [{ name: "worker" }], volumeNames: VOLUMES };
    expect(remapSelectionByName(sel, { resources: RESOURCES }, target)).toEqual({
      kind: "volume",
      name: "uploads",
    });
  });

  it("closes a volume with no counterpart", () => {
    const sel: InspectorSelection = { kind: "volume", name: "uploads" };
    expect(remapSelectionByName(sel, { resources: RESOURCES }, { ...to, volumeNames: new Set(["cache"]) })).toBeNull();
  });
});

describe("pruneSelection", () => {
  it("keeps a selection whose target still exists", () => {
    const sel: InspectorSelection = { kind: "resource", index: 1 };
    expect(pruneSelection(sel, 2, VOLUMES)).toBe(sel);
  });

  it("drops a resource past the end of a shrunken list", () => {
    expect(pruneSelection({ kind: "resource", index: 2 }, 2, VOLUMES)).toBeNull();
  });

  it("drops a volume that no longer exists", () => {
    expect(pruneSelection({ kind: "volume", name: "gone" }, 2, VOLUMES)).toBeNull();
  });

  it("keeps the volume but drops a way back that points past the list", () => {
    const sel: InspectorSelection = { kind: "volume", name: "uploads", from: { index: 5, name: "web" } };
    expect(pruneSelection(sel, 2, VOLUMES)).toEqual({ kind: "volume", name: "uploads" });
  });
});

describe("selectionKey", () => {
  it("keys a resource by index and a volume by name", () => {
    expect(selectionKey({ kind: "resource", index: 3 })).toBe("resource:3");
    expect(selectionKey({ kind: "volume", name: "uploads" })).toBe("volume:uploads");
  });
});
