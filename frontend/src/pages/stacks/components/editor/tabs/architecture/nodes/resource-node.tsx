import { Fragment, memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ExternalLink, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResourceNodeData } from "@/pages/stacks/lib/canvas/graph-from-connections";
import { NodeGlyph } from "./node-glyph";
import { DOT_CLASS, DOT_SIZE, DRAFT_WORD, NODE_CARD, STATE_WORD, STATE_WORD_CLASS } from "./node-card";

export type ResourceFlowNode = Node<ResourceNodeData, "resource">;

/** Edges are derived, not hand-drawn, so the handles are anchors only. */
const HIDDEN_HANDLE = { opacity: 0, pointerEvents: "none" as const };

/**
 * The workload node — a **shell with a card in it**, from Jaseem's Figma
 * (`Shape + Hierarchy Pass`, node 1063:51565).
 *
 * **What the shape says.** A service's identity, its source and its state are
 * the service: they sit on the raised white card. Its volumes are things
 * ATTACHED to it: they sit in the recessed shell below the card, in the 4px of
 * tray that runs all the way round. The old card said the same thing with a
 * divider and a flush-to-the-edge row, which is as far as one surface can go.
 *
 * **The identity row keeps its own order, not the board's.** The board draws
 * glyph · name · dot with the dot flush right; here the dot stays beside the
 * name and the far-right slot belongs to the state word — Jaseem's call when
 * asked. The dot is a fact ABOUT the name, so it reads with it; the word is a
 * separate fact and takes the end of the row. On a Ready card the slot is empty
 * and the row is exactly the board's.
 */
function ResourceNodeImpl({ data, selected }: NodeProps<ResourceFlowNode>) {
  const dirty = data.dirtyState;
  // A draft fact outranks a live one — see `DRAFT_WORD`. There is no stripe: the
  // 3px ink bar down the left edge was this same fact, drawn a second time.
  const stateWord = (dirty && DRAFT_WORD[dirty]) ?? STATE_WORD[data.dotVariant];
  const wordClass = dirty && DRAFT_WORD[dirty] ? "text-fg-muted" : STATE_WORD_CLASS[data.dotVariant];

  const portLines = data.details ?? [];

  // **Every node at rest draws the same line, and it is `--border` — the
  // hairline.**
  //
  // 11%, not the 6% `--border-subtle` it shipped with for one pass. Jaseem's
  // call: on a canvas the node is the only thing there is, and 6% is the rung
  // for a surface whose edge is doing nothing on its own because a shadow is
  // holding it up. Measured against a `--grid` at 20%, a 6% stroke was a lighter
  // mark than the dots the node sits on.
  //
  // **A dirty node used to take `strong`, and that was the same fact twice.**
  // Two cards side by side — one `Failed`, one `Edited` — drew visibly different
  // borders, and nothing on either explained why the EDITED one was the heavier.
  // `DRAFT_WORD` already carries the draft state in the header slot. Worse, 18%
  // is the HOVER token, so a node with unsaved changes at rest was drawn
  // identically to a clean one with the pointer on it.
  //
  // `removed` keeps its tone. Red is not a weight — it is the instrument the
  // `Failed` word already uses, and a node on its way out has to say so in a way
  // 60% opacity cannot do on its own.
  const outlineClass = selected
    ? NODE_CARD.selected
    : dirty === "removed"
      ? "outline-danger/50"
      : "outline-border";

  return (
    <div
      className={cn(
        // 240 wide. See `node-card.ts` for the shell, the card inside it, and
        // why the shell's stroke is an outline while the card's is a border.
        "relative w-[240px]",
        NODE_CARD.shell,
        NODE_CARD.cursor,
        NODE_CARD.clip,
        outlineClass,
        !selected && NODE_CARD.hover,
        // **The ladder's tokens, not hand-mixed ink.** Selection, hover and the
        // drop target were `foreground/[0.06]`, `/[0.03]` and `/40` + `ring/10`
        // — four alphas invented at the call site for states §4 already defines
        // and names. No orange anywhere: a drop target is a state of the node,
        // and the canvas spends no orange.
        data.dropTarget && "outline-border-strong ring-[3px] ring-[var(--wash-selected)]",
        dirty === "removed" && "opacity-60",
      )}
    >
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE} isConnectable={false} />

      {/* The card. 16 top and bottom, a 4px gap between the two rows — the
          board's 72-tall block, exactly. */}
      <div className={cn(NODE_CARD.card, NODE_CARD.padY, "flex flex-col gap-1")}>
        {/* Board geometry: glyph at 16, the text column at 40. */}
        <div className={cn("flex items-center", NODE_CARD.inset, NODE_CARD.gap)}>
          <NodeGlyph
            glyph={data.glyph}
            brandSlug={data.brandSlug}
            size={16}
            className={cn(NODE_CARD.glyph, "shrink-0 text-fg-2")}
          />
          <span className="min-w-0 truncate text-body font-medium text-foreground">{data.name}</span>
          <span className={cn(DOT_SIZE, "shrink-0 rounded-full", DOT_CLASS[data.dotVariant])} aria-hidden />
          {/* **The state, where the kind word used to be.** The kind is gone:
              the glyph carries it, and on a branded card it was the word `Redis`
              sitting beside the Redis logo. Empty on a Ready card. */}
          {stateWord && (
            <span className={cn("ml-auto shrink-0 text-meta", wordClass)}>
              {stateWord}
            </span>
          )}
        </div>
        {/* 40 to reach the name's column, 16 on the right — the board's
            `pl-[40px] pr-[16px]`, and `text-column` (11.5) is what it sets this
            line in. It was `text-meta` (12), half a step heavier than the
            secondary line it is. */}
        <div className="pl-10 pr-4 text-column text-fg-muted">
          {/* **The source line survives every state.** It used to be replaced by
              the state word, so a card stopped saying what it was built from at
              the one moment that matters.

              **And it is not mono.** `summaryIsRef` set `font-mono` for any
              image reference — but `buildSummary` strips the registry and the
              org before it gets here, so what lands is always a bare
              `redis:7`. A tag is not a URL, and by construction this string can
              never be one, so the mono could only ever have been decoration. */}
          <div className="truncate">{data.summary}</div>
          {portLines.length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span>ports:</span>
              {portLines.map((line, i) => {
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

      {/* **Docked volumes live in the tray, under the card.** */}
      {data.volumes.map((v) => (
        // **A button, because it opens something.** It was a `<div>` wearing
        // `cursor-pointer`: no role, no accessible name, and no way to reach it
        // from a keyboard — the mount path was in a `title` that only a mouse
        // could find. The name alone does not say what clicking does, so the
        // label says it.
        <button
          key={v.name}
          type="button"
          aria-label={`Open volume ${v.name}`}
          data-volume-chip={v.name}
          // **32 tall, and the mount path is now on the row.** The board puts it
          // at the right end of the row (`column/400`, muted) — it used to be a
          // `title` attribute, which is a fact the card HAS and does not show,
          // and only a mouse could ever find it.
          className={cn(
            "flex h-8 w-full items-center text-left transition-colors hover:bg-[var(--wash-hover)]",
            NODE_CARD.inset,
            NODE_CARD.gap,
          )}
        >
          <HardDrive className={cn(NODE_CARD.glyph, "shrink-0 text-fg-muted")} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-meta text-fg-2">{v.name}</span>
          {v.mountPath && (
            <span className="shrink-0 text-column text-fg-muted">{v.mountPath}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export const ResourceNode = memo(ResourceNodeImpl);
