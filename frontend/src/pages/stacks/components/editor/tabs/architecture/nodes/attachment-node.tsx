import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Archive, HardDrive, KeyRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_KIND, type AttachmentKind, type AttachmentNodeData } from "@/pages/stacks/lib/canvas/graph-from-connections";
import { NODE_CARD } from "./node-card";

export type AttachmentFlowNode = Node<AttachmentNodeData, "attachment">;

/** Edges are derived, not hand-drawn, so the handles are anchors only. */
const HIDDEN_HANDLE = { opacity: 0, pointerEvents: "none" as const };

const ICON: Record<AttachmentKind, LucideIcon> = {
  [NODE_KIND.secret]: KeyRound,
  [NODE_KIND.volume]: HardDrive,
  [NODE_KIND.objectStore]: Archive,
};

/**
 * Compact node for connection endpoints that aren't workloads — secrets,
 * volumes, object stores.
 *
 * **It is the resource card, smaller — not a second card.** Same shell, same
 * card inside it, same inset and glyph and gap; everything comes from
 * `NODE_CARD`, which is the point of the constant.
 *
 * It stays **180 and one line**, and that is deliberate: the difference between
 * these and a workload is real, and after the shell redesign the size is the
 * only thing left carrying it. Widening every node to 240 would have made the
 * board one silhouette and lost the distinction entirely.
 *
 * **Its shell is always empty.** Nothing docks into a secret. It takes the
 * shape anyway so a board of mixed nodes reads as one family of object — the
 * same reason a workload with no volumes still draws its tray.
 *
 * **It keeps its kind word where the resource card gives that slot to state.**
 * An attachment has no state to put there — a secret is or is not attached, and
 * nothing in `AttachmentNodeData` reports health. The kind is the only fact it
 * has beyond its name, and `key`, `drive` and `archive` are not as self-evident
 * as a Redis logo. **Open:** if attachments ever gain a status from the API, the
 * word should give way to it, the way it did on the resource card.
 */
function AttachmentNodeImpl({ data, selected }: NodeProps<AttachmentFlowNode>) {
  const Icon = ICON[data.kind];
  return (
    <div
      className={cn(
        "relative w-[180px]",
        NODE_CARD.shell,
        NODE_CARD.cursor,
        NODE_CARD.clip,
        selected ? NODE_CARD.selected : "outline-border",
        !selected && NODE_CARD.hover,
      )}
    >
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE} isConnectable={false} />
      <div className={cn(NODE_CARD.card, NODE_CARD.inset, NODE_CARD.padY)}>
        {/* Hugs its content, so the card's 16 is the whole of the inset. */}
        <div className={cn("flex items-center", NODE_CARD.gap)}>
          <Icon className={cn(NODE_CARD.glyph, "shrink-0 text-fg-2")} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-body font-medium text-foreground">{data.name}</span>
          <span className="shrink-0 text-meta text-fg-muted">{data.kindLabel}</span>
        </div>
      </div>
    </div>
  );
}

export const AttachmentNode = memo(AttachmentNodeImpl);
