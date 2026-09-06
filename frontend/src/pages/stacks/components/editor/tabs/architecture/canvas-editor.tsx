import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ResourceNode, type ResourceFlowNode } from "./nodes/resource-node";
import { AttachmentNode, type AttachmentFlowNode } from "./nodes/attachment-node";
import { ConnectionEdge } from "./edges/connection-edge";
import { CanvasControls } from "./canvas-controls";
import { AddResourcePopover, AddResourcePanel } from "./add-resource-popover";
import { FIT_OPTIONS } from "./fit-options";

/** Workload nodes (service/addon) plus the compact attachment nodes (secret/volume/object store). */
export type CanvasFlowNode = ResourceFlowNode | AttachmentFlowNode;

/** Declared at module scope — a fresh object identity here re-renders every node. */
const nodeTypes = { resource: ResourceNode, attachment: AttachmentNode };
const edgeTypes = { connection: ConnectionEdge };

/** Edges render as connection edges; styling comes from each edge's data. */
const DEFAULT_EDGE_OPTIONS = { type: "connection" };

/** Snap dragged nodes to a small grid for tidy, lower-frequency position updates. */
const SNAP_GRID: [number, number] = [16, 16];

interface CanvasEditorProps {
  nodes: CanvasFlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<CanvasFlowNode>;
  onEdgesChange: OnEdgesChange;
  onNodeClick?: NodeMouseHandler<CanvasFlowNode>;
  onNodeContextMenu?: NodeMouseHandler<CanvasFlowNode>;
  onNodeDragStart?: OnNodeDrag<CanvasFlowNode>;
  onNodeDrag?: OnNodeDrag<CanvasFlowNode>;
  onNodeDragStop?: OnNodeDrag<CanvasFlowNode>;
  showConnections: boolean;
  onToggleConnections: () => void;
  onAutoLayout: () => void;
  addedBlockIds: string[];
  onAddBlock: (blockId: string) => void;
  addons: { id: string; name: string }[];
  linkedAddonIds: ReadonlySet<string>;
  onLinkAddon: (addonId: string) => void;
  canAddVolume: boolean;
  onAddVolume: () => void;
  /** Live view: nodes are locked in place and every mutation affordance
   *  (add-resource panel, pane context menu) is hidden. */
  readOnly?: boolean;
}

/**
 * React Flow render surface. It owns no stack state — nodes/edges are derived
 * upstream and handed in. Keeps the surface a dumb, memo-friendly view.
 */
export function CanvasEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeContextMenu,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  showConnections,
  onToggleConnections,
  onAutoLayout,
  addedBlockIds,
  onAddBlock,
  addons,
  linkedAddonIds,
  onLinkAddon,
  canAddVolume,
  onAddVolume,
  readOnly = false,
}: CanvasEditorProps) {
  // Right-clicking empty canvas opens the same add-resource picker at the
  // cursor (anchored via an invisible fixed-position point).
  const [paneMenuAt, setPaneMenuAt] = useState<{ x: number; y: number } | null>(null);
  const { theme } = useTheme();
  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setPaneMenuAt({ x: event.clientX, y: event.clientY });
  }, []);

  return (
    <div className="relative h-full w-full" data-testid="stack-canvas">
      {/* **No `fitView` prop — the graph is panned, never re-fitted.**

          It re-fits on every container RESIZE, not just on mount, and the
          inspector resizes this container by 408 every time it opens. So the
          panel opening ran two animations at once on the same nodes: that one
          re-solving the zoom to keep the whole graph inside a narrower box, and
          `useCanvasGraph`'s pan sliding the viewport by half the loss. Measured,
          the zoom dipped to 0.9857 and sprang back to 1 inside the same 260ms —
          a scale down and up underneath a slide, which reads as the cards
          breathing rather than as the sheet giving up a column.

          **The move alone is the right amount.** Opening a panel is not a reason
          to change how big the graph is; it is a reason to keep what you were
          looking at in view, which is exactly what the pan does. The initial fit
          still happens — once, explicitly, in `useCanvasGraph` when the nodes
          have measured — so nothing is lost but a resize re-fit nobody asked
          for. `fitViewOptions` stays: the manual `fitView()` call reads it. */}
      <ReactFlow
        /**
         * **Enter and Space open the focused node.**
         *
         * ReactFlow makes every node focusable — `tabindex="0"`, `role="group"`
         * — so a keyboard user can reach one and see the ring land. Nothing
         * happened when they pressed anything: opening a node was `onNodeClick`,
         * a MOUSE handler, and the inspector is the only place a resource can be
         * edited. Verified in the browser before this: focus a node, press
         * Enter, no drawer.
         *
         * The listener sits on the wrapper because the focusable element is
         * ReactFlow's node container, not our card inside it — a handler on the
         * card never sees the event, which travels UP from the wrapper and not
         * down into it. `.click()` on that wrapper is what ReactFlow is already
         * listening for, so the keyboard path and the mouse path stay one path.
         */
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          const node = (e.target as HTMLElement)?.closest?.(".react-flow__node");
          if (!node) return;
          e.preventDefault();
          (node as HTMLElement).click();
        }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={readOnly ? undefined : onPaneContextMenu}
        nodesDraggable={!readOnly}
        fitViewOptions={FIT_OPTIONS}
        // Follow the app's theme toggle, not the OS preference — "system"
        // left the canvas dark while the rest of the UI switched to light.
        colorMode={theme}
        snapToGrid
        snapGrid={SNAP_GRID}
        proOptions={{ hideAttribution: true }}
      >
        {/* **One grid, one dot.**

            It was two `Background` layers: a fine tier at 16 and a bold tier
            every fifth dot at 80, drawn at 2px so the field had a coarse rhythm
            over the fine one. The bold tier is gone. Two dot weights made the
            canvas read as ruled at two scales — the eye kept resolving 80px
            cells that nothing in the graph corresponds to, and a node dropped
            near a bold dot looked deliberately aligned to a landmark that means
            nothing. A uniform field is a ground; a tiered one is a measure.

            **16 is the SNAP grid** (`SNAP_GRID`), so the dots you can see and
            the positions a node can actually take are one lattice.

            **2px, not 1.** At 1px the disc is entirely antialiasing — measured,
            a 0.5 paint peaked at rgb(173) on a 251 ground, so the "dot" was
            never drawn at the alpha it was given. At 2px it covers a whole
            device pixel and the token means what it says.

            bgColor: the Background SVG paints xyflow's default (#141414 in dark)
            over the pane — pinned to the app token so the canvas matches the
            sidebar and chrome in both modes.

            The alternatives are settled and in the log: a cross was built and
            judged in the running app (legible, but it reads as a printed
            registration mark), lines were rejected because a line implies a cell
            and these are nodes in a graph, and grain and a vignette both
            measured invisible at real scale. */}
        <Background
          id="grid"
          variant={BackgroundVariant.Dots}
          gap={16}
          size={2}
          color="var(--grid)"
          bgColor="var(--surface-canvas)"
        />
        <CanvasControls
          showConnections={showConnections}
          onToggleConnections={onToggleConnections}
          onAutoLayout={onAutoLayout}
        >
          {/* In the group, not alone in the opposite corner — it acts on the
              same thing the five tools beside it act on. Off entirely in Live,
              where there is nothing to add to a deployed release. */}
          {!readOnly && (
            <AddResourcePopover
              addedIds={addedBlockIds}
              onAdd={onAddBlock}
              addons={addons}
              linkedAddonIds={linkedAddonIds}
              onLinkAddon={onLinkAddon}
              canAddVolume={canAddVolume}
              onAddVolume={onAddVolume}
            />
          )}
        </CanvasControls>
        {/* **The canvas teaches itself, so nothing narrates it.** A permanent
            `drag to rearrange · click a card to configure · lines show stack
            connections` sat here on every visit: three instructions for three
            affordances the cards already carry — they look draggable, they look
            clickable, and the wires are visibly wires. It also put a second
            baseline 6px off the resource tally's, which is the kind of
            near-alignment that reads as a mistake rather than a choice (§8).
            Live's version said `read-only` a third time; the version chip and
            the inspector's own header already say it. */}
      </ReactFlow>
      {paneMenuAt && (
        <Popover open onOpenChange={(o) => !o && setPaneMenuAt(null)}>
          <PopoverAnchor asChild>
            <span
              aria-hidden
              style={{ position: "fixed", left: paneMenuAt.x, top: paneMenuAt.y, width: 0, height: 0 }}
            />
          </PopoverAnchor>
          {/* Same catalogue, same width as the toolbar's — it was left at 560
            when the popover came down to 272, so right-clicking the canvas
            opened a different-shaped copy of one panel. */}
          <PopoverContent align="start" side="bottom" className="w-[272px] p-0">
            <AddResourcePanel
              addedIds={addedBlockIds}
              onAdd={onAddBlock}
              addons={addons}
              linkedAddonIds={linkedAddonIds}
              onLinkAddon={onLinkAddon}
              canAddVolume={canAddVolume}
              onAddVolume={onAddVolume}
              onRequestClose={() => setPaneMenuAt(null)}
            />
          </PopoverContent>
        </Popover>
      )}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
          <p className="text-body font-medium text-foreground">No resources yet</p>
          {/* `text-fg-muted`, not `text-muted-foreground` — the same token under
              two names, and this was the last screen still using the shadcn one. */}
          <p className="mt-1 text-body text-fg-muted">
            Use <span className="font-medium text-foreground">Add resource</span> to start building your stack.
          </p>
        </div>
      )}
    </div>
  );
}
