import { Fragment, memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ExternalLink, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResourceNodeData } from "@/pages/stacks/lib/canvas/graph-from-connections";
import type { StatusVariant } from "@/components/branded/status-variant";
import { NodeGlyph } from "./node-glyph";

export type ResourceFlowNode = Node<ResourceNodeData, "resource">;

/** Edges are derived, not hand-drawn, so the handles are anchors only. */
const HIDDEN_HANDLE = { opacity: 0, pointerEvents: "none" as const };

/** Live status dot per variant. Ready breathes (slow pulse = heartbeat);
 *  pending uses the standard motion pulse; error/info/neutral hold still. */
const DOT_CLASS: Record<StatusVariant, string> = {
  ready: "bg-success animate-breathe",
  pending: "bg-warn animate-pulse",
  error: "bg-danger",
  info: "bg-info",
  neutral: "bg-fg-muted",
};

/**
 * **Every state that asks you to act says its word.**
 *
 * A 6px dot is legal as the fast read and illegal as the only one — colour is
 * not a channel everybody has, and "amber" does not tell you whether to wait or
 * to do something. So the second line carries the word for every state except
 * the one that wants nothing from you: a Ready card shows its image, because
 * "Ready" on four cards at once is four words nobody reads.
 */
const STATE_WORD: Partial<Record<StatusVariant, string>> = {
  pending: "Pending",
  error: "Failed",
  neutral: "Not deployed",
  info: "Unknown",
};

function ResourceNodeImpl({ data, selected }: NodeProps<ResourceFlowNode>) {
  const dirty = data.dirtyState;
  // Unsaved changes read as a left accent stripe + tinted border; removal is
  // crimson + dimmed. Selection wins the border colour with an ink wash, not
  // an orange ring — brand orange stays reserved for wires/eyebrows/mark.
  // No orange anywhere on the canvas — a draft mark is ink, the same as
  // selection, because "changed" is a fact about the card and not an alarm.
  const stripeColor = dirty === "removed" ? "bg-danger" : dirty ? "bg-foreground/40" : null;
  const borderClass = selected
    ? "outline-border-strong"
    : dirty === "removed"
      ? "outline-danger/50"
      : dirty
        ? "outline-border-strong"
        : "outline-border";

  const stateWord = STATE_WORD[data.dotVariant];

  return (
    <div
      className={cn(
        // **240, and `outline` rather than `border`.** The card is elevated, and
        // §8's rule is that a stroke on something that floats sits OUTSIDE the
        // box — a border would eat 2px of the 240 and put the text column half a
        // pixel off the grid on every card.
        //
        // **`shadow-md` is the one elevation content gets.** A hairline cannot
        // separate a white card from a near-white ground: it needs 49% ink to
        // clear 3:1 against it, measured — which is a black line, not a
        // hairline. A canvas is a space, so the objects in it are the one
        // content allowed to float. Do not generalise this past the canvas.
        "relative w-[240px] cursor-grab overflow-hidden rounded-lg outline outline-1 bg-surface-node shadow-md transition-colors",
        borderClass,
        // Ink, not orange. A drop target is a state of the card, and the canvas
        // spends no orange — the wash and the ring are the same ink the
        // selection uses, one rung firmer.
        data.dropTarget && "outline-foreground/40 ring-[3px] ring-foreground/10",
        dirty === "removed" && "opacity-60",
      )}
    >
      {selected && <span className="pointer-events-none absolute inset-0 bg-foreground/[0.06]" aria-hidden />}
      {stripeColor && <span className={cn("absolute inset-y-0 left-0 w-[3px]", stripeColor)} aria-hidden />}
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE} isConnectable={false} />

      {/* Board geometry: glyph at 12, the text column at 36, the kind label's
          right edge at 228. The dot sits AFTER the name — it is a fact about
          this service, so it reads with the name rather than in front of it. */}
      <div className="px-3 pb-3 pt-0">
        <div className="flex h-8 items-center gap-2">
          <NodeGlyph glyph={data.glyph} brandSlug={data.brandSlug} size={16} className="size-4 shrink-0 text-fg-2" />
          <span className="min-w-0 truncate text-body font-medium text-foreground">{data.name}</span>
          <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[data.dotVariant])} aria-hidden />
          <span className="ml-auto shrink-0 text-meta text-fg-muted">
            {data.kindLabel}
          </span>
        </div>
        <div className="pl-6 text-meta text-muted-foreground">
          {/* The word, not the dot alone. Ready is the exception: it wants
              nothing from you, so the line spends itself on the image instead. */}
          <div className={cn("truncate", !stateWord && data.summaryIsRef && "font-mono")}>
            {stateWord ?? data.summary}
          </div>
          {(data.details ?? []).length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span>ports:</span>
              {(data.details ?? []).map((line, i) => {
                const url = data.portUrls?.[line.port];
                const sep = i > 0 && <span className="opacity-40">·</span>;
                if (!url) {
                  return (
                    <Fragment key={`${line.port}-${i}`}>
                      {sep}
                      <span title={line.text}>{line.port}</span>
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={`${line.port}-${i}`}>
                    {sep}
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={`${line.text} — ${url}`}
                      // Card drag/click owns the mousedown; stop it so the link clicks.
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="group/port flex items-center gap-0.5 transition-colors hover:text-foreground"
                    >
                      <span className="group-hover/port:underline">{line.port}</span>
                      <ExternalLink className="size-2.5 shrink-0 opacity-40 transition-opacity group-hover/port:opacity-100" aria-hidden />
                    </a>
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data.volumes.map((v) => (
        <div
          key={v.name}
          title={v.mountPath}
          data-volume-chip={v.name}
          // **Indent only — no rule, no fill.** A docked volume is part of this
          // service, and a card divided by a line reads as two objects stacked.
          // The 24 indent is the same text column the summary uses, so the
          // volume lines up under what it belongs to.
          className="flex cursor-pointer items-center gap-2 px-3 pb-2 pl-6 transition-colors hover:bg-foreground/[0.03]"
        >
          <HardDrive className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
          <span className="truncate text-meta text-fg-2">{v.name}</span>
        </div>
      ))}
    </div>
  );
}

export const ResourceNode = memo(ResourceNodeImpl);
