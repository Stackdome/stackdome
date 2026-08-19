import { createContext, useContext, type ReactNode } from "react";

/**
 * Chrome that floats over the graph — the deploy pill, the resource tally.
 *
 * It is built by the editor shell (which holds the deploy state) but it must
 * be positioned against the **canvas half**, not the whole body: the inspector
 * is a region taking 480 off the right, and a pill centred on the full width
 * sits off-centre the moment a node is open, while a bottom-right tally lands
 * on top of the panel's footer.
 *
 * The shell can't compute that — the split belongs to the architecture tab. So
 * the shell passes the nodes down and the tab renders them inside its own
 * canvas column. There is no width to keep in sync, which is the whole
 * improvement over the inset arithmetic this replaced.
 */
export const CanvasOverlayContext = createContext<ReactNode>(null);

export function useCanvasOverlay(): ReactNode {
  return useContext(CanvasOverlayContext);
}
