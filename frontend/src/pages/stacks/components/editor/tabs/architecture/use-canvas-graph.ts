import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
  type OnNodeDrag,
  type XYPosition,
} from "@xyflow/react";
import type { FormStackResourceData } from "@/pages/stacks/schemas/form-schema";
import { useStackTopology } from "@/pages/stacks/hooks/use-stack-topology";
import type { ReleaseLiveStatus } from "@/api/releases";
import type { PublicEndpoint } from "@/pages/stacks/components/editor/public-endpoint-row";
import {
  deriveGraph,
  NODE_KIND,
  NODE_ID_PREFIX,
  type AttachmentNodeData,
  type DirtyInput,
  type ResourceNodeData,
} from "@/pages/stacks/lib/canvas/graph-from-connections";
import { mergeTopology } from "@/pages/stacks/lib/canvas/merge-topology";
import {
  layoutGraph,
  ATTACHMENT_NODE_HEIGHT,
  ATTACHMENT_NODE_WIDTH,
  NODE_HEIGHT,
  NODE_SEP,
  NODE_WIDTH,
} from "@/pages/stacks/lib/canvas/layout-graph";
import { resolveCollisions, type CollidableNode } from "@/pages/stacks/lib/canvas/resolve-collisions";
import { carryPositions } from "@/pages/stacks/lib/canvas/carry-positions";
import { drawerRegionWidthPx, PEER_SHEET_GUTTER_PX } from "@/components/ui/drawer";
import { FIT_OPTIONS } from "./fit-options";
import type { CanvasFlowNode } from "./canvas-editor";
import type { CanvasMenuTarget } from "./canvas-context-menu";

/**
 * **`--rail-duration` and `--ease-panel`, in JS.**
 *
 * The pan exists because the peer-sheet column is opening, so it has to run on
 * that column's clock and that column's curve — anything else and the graph and
 * the panel are two gestures instead of one. The CSS owns the canonical values
 * (`index.css`); these are the same two numbers where a frame loop can reach
 * them, and they are commented on both sides so a change to one finds the other.
 */
const PAN_DURATION_MS = 200;

/** `cubic-bezier(0.32, 0.72, 0, 1)`. */
const EASE_PANEL = [0.32, 0.72, 0, 1] as const;

/**
 * Evaluate a cubic Bézier easing at time `t`.
 *
 * A CSS easing curve is `x(u) → y(u)` with `u` a parameter, NOT a function of
 * time directly — so this solves `x(u) = t` first (bisection, which needs no
 * derivative and cannot diverge on the flat stretch this curve has near `u=1`),
 * then reads `y` at that `u`. 20 halvings puts `u` inside 1e-6, far below a
 * pixel at any viewport width.
 */
function easePanel(t: number): number {
  const [x1, y1, x2, y2] = EASE_PANEL;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const bez = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 20; i++) {
    u = (lo + hi) / 2;
    if (bez(x1, x2, u) < t) lo = u;
    else hi = u;
  }
  return bez(y1, y2, u);
}

/** Collision-box dims for nodes React Flow hasn't measured yet (fresh layout
 *  output) — attachment cards are markedly smaller than resource cards. */
function attachmentAwareFallbackSize(node: CollidableNode): { width: number; height: number } {
  return (node as { type?: string }).type === "attachment"
    ? { width: ATTACHMENT_NODE_WIDTH, height: ATTACHMENT_NODE_HEIGHT }
    : { width: NODE_WIDTH, height: NODE_HEIGHT };
}

export interface UseCanvasGraphInput {
  /** The resource list the canvas is showing (draft, session or live snapshot). */
  resources: Partial<FormStackResourceData>[];
  linkedAddonIds: ReadonlySet<string>;
  addonNameById: ReadonlyMap<string, string>;
  addonStateById?: ReadonlyMap<string, string>;
  volumeNames: string[];
  dirty: DirtyInput;
  /** Null for draft (unsaved) stacks — no server topology exists yet. */
  topologyIds: { orgId: string; projectName: string; stackId: string } | null;
  topologyRefreshKey: number;
  releaseInFlight?: boolean;
  liveStatusResources?: ReleaseLiveStatus["resources"];
  publicEndpoints?: PublicEndpoint[];
  /** Live view is read-only: no context menu, and clicks only inspect. */
  liveMode: boolean;
  /** The inspector is showing — the canvas pans to keep its centre when this flips. */
  inspectorOpen: boolean;
  onOpenResource: (idx: number) => void;
  onOpenVolume: (name: string) => void;
  onRequestAttach: (request: { volumeName: string; resourceIdx: number }) => void;
  onContextMenu: (target: CanvasMenuTarget) => void;
}

/**
 * The canvas half of the architecture tab: graph derivation, React Flow node and
 * edge state, layout, and the pointer handlers on a node. Everything the drawer
 * and the draft mutations need is handed in as a callback.
 */
export function useCanvasGraph({
  resources,
  linkedAddonIds,
  addonNameById,
  addonStateById,
  volumeNames,
  dirty,
  topologyIds,
  topologyRefreshKey,
  releaseInFlight,
  liveStatusResources,
  publicEndpoints,
  liveMode,
  inspectorOpen,
  onOpenResource,
  onOpenVolume,
  onRequestAttach,
  onContextMenu,
}: UseCanvasGraphInput) {
  const { topology } = useStackTopology({ ids: topologyIds, refreshKey: topologyRefreshKey });

  // Local connection-derived data (cheap, pure). Re-runs on any edit.
  const dataGraph = useMemo(
    () => deriveGraph({ resources, linkedAddonIds, addonNameById, addonStateById, volumeNames, dirty }),
    [resources, linkedAddonIds, addonNameById, addonStateById, volumeNames, dirty],
  );
  // Live status keyed by canvas node id, so it wins over the topology
  // endpoint's own (possibly unscoped) per-node state.
  const liveStateByNodeId = useMemo(() => {
    const entries = Object.entries(liveStatusResources ?? {});
    if (entries.length === 0) return undefined;
    return new Map(entries.map(([name, s]) => [NODE_ID_PREFIX.resource + name, s.state]));
  }, [liveStatusResources]);

  // Local graph enhanced with server-derived edges + runtime status.
  const mergedGraphBare = useMemo(
    () => mergeTopology(dataGraph, topology, releaseInFlight, liveStateByNodeId),
    [dataGraph, topology, releaseInFlight, liveStateByNodeId],
  );
  // Overlay live per-port public URLs so a card's public port lines link out.
  const mergedGraph = useMemo(() => {
    if (!publicEndpoints?.length) return mergedGraphBare;
    const byService = new Map(publicEndpoints.map((e) => [e.service, e.urls]));
    return {
      ...mergedGraphBare,
      nodes: mergedGraphBare.nodes.map((n) => {
        const urls = n.type === "resource" ? byService.get((n.data as { name: string }).name) : undefined;
        if (!urls?.length) return n;
        // urls is best-first; first URL per port wins when several ingresses
        // share a target_port (e.g. custom domain + generated).
        const portUrls: Record<number, string> = {};
        for (const u of urls) {
          if (u.target_port != null && portUrls[u.target_port] === undefined) portUrls[u.target_port] = u.url;
        }
        return { ...n, data: { ...n.data, portUrls } };
      }),
    };
  }, [mergedGraphBare, publicEndpoints]);
  // Signature of the node/edge id-set — changes only when topology changes.
  const topologySignature = useMemo(
    () => `${mergedGraph.nodes.map((n) => n.id).join("|")}::${mergedGraph.edges.map((e) => e.id).join("|")}`,
    [mergedGraph],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showConnections, setShowConnections] = useState(true);
  const { fitView, getIntersectingNodes, getViewport, setViewport } = useReactFlow();
  const dragStartPos = useRef<XYPosition | null>(null);

  // One-time fit when the canvas first gains measured nodes: async imports and
  // stack loads populate nodes after mount, so ReactFlow's own fitView prop
  // fires against an empty canvas. Never re-fits — the hook re-flips when
  // nodes are added mid-edit, and a re-fit then would yank the viewport.
  const nodesInitialized = useNodesInitialized();
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!nodesInitialized || didInitialFit.current) return;
    didInitialFit.current = true;
    // One frame late: measurement flips `nodesInitialized` before the final
    // card sizes (attachment rows) and container height settle.
    requestAnimationFrame(() => fitView(FIT_OPTIONS));
  }, [nodesInitialized, fitView]);

  /**
   * The inspector is a SHEET beside the sheet, so opening it squeezes this
   * container from the right by its width **plus the gutter between the two
   * cards** — the canvas loses the paper as well as the panel. Pan the viewport
   * by half that total so the point that was at the visible centre stays
   * centred: the graph glides left with the panel instead of sitting still
   * while the container shrinks around it.
   *
   * One width, not a depth-dependent inset: there is one panel, so this is 408
   * in and 408 back out.
   *
   * ### Why this is hand-tweened instead of `setViewport(…, { duration })`
   *
   * **ReactFlow's animated `setViewport` cannot do a straight line.** It hands
   * the transition to d3, and d3 interpolates a viewport with `interpolateZoom`
   * — the "smooth zoom" curve, which deliberately arcs OUT and back on a long
   * translate so a big pan feels like flying. Measured on this exact move, with
   * the zoom target identical to the zoom start: `1 → 0.9858 → 1`, dipping and
   * recovering in lockstep with x. On a graph of cards that reads as the nodes
   * breathing under the slide, not as the sheet giving up a column.
   *
   * A frame loop over x alone is a straight line by construction — `zoom` is
   * copied from the start viewport and never interpolated, so there is nothing
   * left to arc. It also puts the pan on the SAME clock and curve as the column
   * that caused it (`--rail-duration`, `--ease-panel`), which the old 260ms
   * could not be: two durations for one gesture is two gestures.
   */
  const prevInsetRef = useRef(0);
  const panRef = useRef(0);
  useEffect(() => {
    const inset = inspectorOpen ? drawerRegionWidthPx.form + PEER_SHEET_GUTTER_PX : 0;
    const delta = inset - prevInsetRef.current;
    prevInsetRef.current = inset;
    if (delta === 0) return;

    const from = getViewport();
    const toX = from.x - delta / 2;

    // Nothing to watch and nothing to lose: land it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setViewport({ ...from, x: toX });
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / PAN_DURATION_MS);
      setViewport({ ...from, x: from.x + (toX - from.x) * easePanel(t) });
      if (t < 1) panRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(panRef.current);
    panRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(panRef.current);
  }, [inspectorOpen, getViewport, setViewport]);

  const isFloatingVolume = (node: CanvasFlowNode) =>
    node.type === "attachment" && (node.data as AttachmentNodeData).kind === NODE_KIND.volume;

  /** First intersecting service card (addons have no resourceIdx and never qualify). */
  const dropTargetFor = useCallback(
    (node: CanvasFlowNode): CanvasFlowNode | null => {
      const hit = getIntersectingNodes(node).find(
        (n) => n.type === "resource" && (n.data as ResourceNodeData).resourceIdx != null,
      );
      return (hit as CanvasFlowNode) ?? null;
    },
    [getIntersectingNodes],
  );

  const onNodeDragStart = useCallback<OnNodeDrag<CanvasFlowNode>>((_event, node) => {
    dragStartPos.current = isFloatingVolume(node) ? { ...node.position } : null;
  }, []);

  const onNodeDrag = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_event, node) => {
      if (!isFloatingVolume(node)) return;
      const target = dropTargetFor(node);
      setNodes((prev) =>
        prev.map((n) => {
          const isTarget = n.id === target?.id;
          const current = (n.data as ResourceNodeData).dropTarget ?? false;
          if (current === isTarget) return n;
          return { ...n, data: { ...n.data, dropTarget: isTarget } } as CanvasFlowNode;
        }),
      );
    },
    [dropTargetFor, setNodes],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_event, node) => {
      if (isFloatingVolume(node)) {
        const target = dropTargetFor(node);
        // Clear all rings.
        setNodes((prev) =>
          prev.map((n) =>
            (n.data as ResourceNodeData).dropTarget
              ? ({ ...n, data: { ...n.data, dropTarget: false } } as CanvasFlowNode)
              : n,
          ),
        );
        if (target) {
          const volumeName = node.id.slice(NODE_ID_PREFIX.volume.length);
          const resourceIdx = (target.data as ResourceNodeData).resourceIdx!;
          onRequestAttach({ volumeName, resourceIdx });
          return;
        }
      }
      // Plain reposition: only the dropped node yields to any overlap it
      // created — the rest of the user's arrangement stays pinned.
      dragStartPos.current = null;
      setNodes(
        (prev) =>
          resolveCollisions(prev, {
            margin: NODE_SEP / 2,
            isLocked: (n) => n.id !== node.id,
            fallbackSize: attachmentAwareFallbackSize,
          }) as CanvasFlowNode[],
      );
    },
    [dropTargetFor, setNodes, onRequestAttach],
  );

  const onNodeContextMenu = useCallback<NodeMouseHandler<CanvasFlowNode>>(
    (event, node) => {
      if (liveMode) return; // read-only: no mutation menu
      event.preventDefault();
      const { clientX: x, clientY: y } = event;
      const chipEl = (event.target as HTMLElement).closest("[data-volume-chip]");
      if (chipEl) {
        onContextMenu({ kind: "volume-chip", volumeName: chipEl.getAttribute("data-volume-chip")!, x, y });
        return;
      }
      if (node.type === "attachment" && (node.data as AttachmentNodeData).kind === NODE_KIND.volume) {
        onContextMenu({ kind: "volume-node", volumeName: (node.data as AttachmentNodeData).name, x, y });
        return;
      }
      if (node.type === "resource") {
        const data = node.data as ResourceNodeData;
        const idx = data.resourceIdx;
        if (idx != null) onContextMenu({ kind: "resource", resourceIdx: idx, resourceName: data.name, x, y });
      }
    },
    [liveMode, onContextMenu],
  );

  const onNodeClick = useCallback<NodeMouseHandler<CanvasFlowNode>>(
    (event, node) => {
      if (liveMode) {
        // Read-only inspection: resource cards open the disabled drawer, no
        // session is started. Volume/attachment nodes stay display-only.
        const idx = node.type === "resource" ? (node.data as ResourceNodeData).resourceIdx : null;
        if (idx != null) onOpenResource(idx);
        return;
      }
      if (node.type === "attachment") {
        const data = node.data as AttachmentNodeData;
        if (data.kind === NODE_KIND.volume) onOpenVolume(data.name);
        return; // secret/object-store attachments stay display-only
      }
      // A click on the attached-volume chip targets the volume, not the resource.
      const chipEl = (event.target as HTMLElement).closest("[data-volume-chip]");
      if (chipEl) {
        onOpenVolume(chipEl.getAttribute("data-volume-chip")!);
        return;
      }
      const idx = (node.data as ResourceNodeData).resourceIdx;
      if (idx == null) return; // addon node — managed via the Environment tab, no drawer in v1
      onOpenResource(idx);
    },
    [liveMode, onOpenResource, onOpenVolume],
  );

  // Re-layout ONLY when topology changes; preserve in-session drag positions by id.
  useEffect(() => {
    const laid = layoutGraph(mergedGraph);
    setNodes((prev) => {
      // Empty canvas (no preserved nodes): use the fresh dagre layout as-is.
      if (prev.length === 0) return laid.nodes as CanvasFlowNode[];
      // carryPositions keeps renamed nodes in place (ids embed the name);
      // new nodes keep their dagre coords near their topological neighbours
      // and the locked collision pass shoves them clear of the frozen layout.
      const { nodes: next, keptIds } = carryPositions(prev, laid.nodes as CanvasFlowNode[]);
      return resolveCollisions(next, {
        margin: NODE_SEP / 2,
        isLocked: (n) => keptIds.has(n.id),
        fallbackSize: attachmentAwareFallbackSize,
      }) as CanvasFlowNode[];
    });
    setEdges(mergedGraph.edges as Edge[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on topology only
  }, [topologySignature, setNodes, setEdges]);

  // Update node data (summary + dirty mark) in place, without moving nodes.
  useEffect(() => {
    const dataById = new Map(mergedGraph.nodes.map((n) => [n.id, n.data]));
    setNodes(
      (prev) => prev.map((n) => (dataById.has(n.id) ? { ...n, data: dataById.get(n.id)! } : n)) as CanvasFlowNode[],
    );
  }, [mergedGraph, setNodes]);

  const toggleConnections = useCallback(() => setShowConnections((v) => !v), []);

  // Re-run auto-layout: reset every node to its fresh dagre position and
  // glide the viewport onto the result — an instant re-fit reads as a flicker.
  const autoLayout = useCallback(() => {
    const laid = layoutGraph(mergedGraph);
    setNodes(laid.nodes as CanvasFlowNode[]);
    requestAnimationFrame(() => fitView({ ...FIT_OPTIONS, duration: 300 }));
  }, [mergedGraph, setNodes, fitView]);

  /** Put a dragged volume node back where the drag started (attach cancelled). */
  const restoreDragStart = useCallback(
    (volumeName: string) => {
      const start = dragStartPos.current;
      dragStartPos.current = null;
      if (!start) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === NODE_ID_PREFIX.volume + volumeName ? { ...n, position: start } : n)),
      );
    },
    [setNodes],
  );

  /** The drag is settled — an attach was confirmed, so nothing goes back. */
  const clearDragStart = useCallback(() => {
    dragStartPos.current = null;
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    showConnections,
    toggleConnections,
    autoLayout,
    onNodeClick,
    onNodeContextMenu,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    restoreDragStart,
    clearDragStart,
  };
}
