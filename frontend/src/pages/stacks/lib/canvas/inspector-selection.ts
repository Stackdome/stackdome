/**
 * What the inspector is showing — **one thing, at one of two levels.**
 *
 * This replaced a stack of floating panels. The stack existed to let a volume
 * open in front of the service that mounts it without losing the service, and
 * it paid for that with drawer-on-drawer arithmetic: a stagger, an inset that
 * grew with depth, a truncate-to-index, and two Escape bindings.
 *
 * One panel needs none of it. A volume opens **in the same panel** and
 * remembers the service it came from, so the header can read `web › uploads`
 * and the first crumb is the way back. That is the whole of the old stack's
 * usefulness, in one optional field.
 */
export type InspectorSelection =
  | { kind: "resource"; index: number }
  /**
   * `from` is the service whose mount row opened this volume — absent when the
   * volume was opened straight off the canvas, where there is no route back to
   * draw. It carries the name as well as the index because the trail has to
   * render before anything re-reads the resource list.
   */
  | { kind: "volume"; name: string; from?: { index: number; name: string } };

export function selectionKey(s: InspectorSelection): string {
  return s.kind === "resource" ? `resource:${s.index}` : `volume:${s.name}`;
}

/** Open a volume, keeping the current resource as the way back when there is one. */
export function openVolumeFrom(
  current: InspectorSelection | null,
  name: string,
  resources: { name?: string }[],
): InspectorSelection {
  if (current?.kind !== "resource") return { kind: "volume", name };
  const fromName = resources[current.index]?.name;
  return fromName
    ? { kind: "volume", name, from: { index: current.index, name: fromName } }
    : { kind: "volume", name };
}

/**
 * One level up, or out. A volume opened from a service goes back to it; a
 * volume opened off the canvas has nowhere to go, so it closes — the same
 * `Esc` does both, because there is only one panel to reason about.
 */
export function stepBack(current: InspectorSelection | null): InspectorSelection | null {
  if (current?.kind === "volume" && current.from) return { kind: "resource", index: current.from.index };
  return null;
}

/**
 * Rebind the open selection onto another resource/volume list by name (names
 * are unique in a stack), remapping resource indexes — the two lists don't line
 * up. A selection with no same-named counterpart closes.
 */
export function remapSelectionByName(
  selection: InspectorSelection | null,
  from: { resources: { name?: string }[] },
  to: { resources: { name?: string }[]; volumeNames: ReadonlySet<string> },
): InspectorSelection | null {
  if (!selection) return null;
  const remapIndex = (index: number) => {
    const name = from.resources[index]?.name;
    const next = name ? to.resources.findIndex((r) => r.name === name) : -1;
    return next >= 0 ? { index: next, name: name! } : null;
  };
  if (selection.kind === "resource") {
    const hit = remapIndex(selection.index);
    return hit ? { kind: "resource", index: hit.index } : null;
  }
  if (!to.volumeNames.has(selection.name)) return null;
  // The volume survives even when the service it came from doesn't — it just
  // loses its way back rather than closing with it.
  const from_ = selection.from ? remapIndex(selection.from.index) : null;
  return { kind: "volume", name: selection.name, ...(from_ ? { from: from_ } : {}) };
}

/** Drop a selection whose target no longer exists in the shown lists. */
export function pruneSelection(
  selection: InspectorSelection | null,
  resourceCount: number,
  volumeNames: ReadonlySet<string>,
): InspectorSelection | null {
  if (!selection) return null;
  if (selection.kind === "resource") return selection.index < resourceCount ? selection : null;
  if (!volumeNames.has(selection.name)) return null;
  if (selection.from && selection.from.index >= resourceCount) return { kind: "volume", name: selection.name };
  return selection;
}
