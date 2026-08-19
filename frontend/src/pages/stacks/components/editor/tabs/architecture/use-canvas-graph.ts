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
import { drawerRegionWidthPx } from "@/components/ui/drawer";
import { FIT_OPTIONS } from "./fit-options";
import type { CanvasFlowNode } from "./canvas-editor";
import type { CanvasMenuTarget } from "./canvas-context-menu";

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

  // The inspector takes its width FROM the canvas, so opening it squeezes the
  // container from the right. Pan the viewport by half that width so the point
  // that was at the visible center stays centered — the graph glides left with
  // the panel instead of sitting still while the container shrinks around it.
  //
  // One width, not a depth-dependent inset: there is one panel now, so this is
  // 480 in and 480 back out.
  const prevInsetRef = useRef(0);
  useEffect(() => {
    const inset = inspectorOpen ? drawerRegionWidthPx.form : 0;
    const delta = inset - prevInsetRef.current;
    prevInsetRef.current = inset;
    if (delta === 0) return;
    const vp = getViewport();
    void setViewport({ ...vp, x: vp.x - delta / 2 }, { duration: 260 });
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
