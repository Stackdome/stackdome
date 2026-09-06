import dagre from "dagre";
import type { CanvasGraph, CanvasNode, ResourceNodeData } from "./graph-from-connections";

/**
 * Box dagre reserves for a workload node at its smallest: the shell's 4px of
 * tray top and bottom around a 72-tall card (16 + a 20 identity row + a 4 gap +
 * a 16 summary line + 16). Ports and docked volumes grow it from there —
 * `nodeLayoutSize`.
 */
export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 80;

/** Attachment (volume/secret/object-store) box — 180 wide, one row: the same
 *  4px of tray around a 52-tall card. Nothing ever docks into one, so unlike a
 *  workload this is its only height. */
export const ATTACHMENT_NODE_WIDTH = 180;
export const ATTACHMENT_NODE_HEIGHT = 60;

export interface LayoutOptions {
  /**
   * **Left to right by default.** Data flows across the board, not up it: a
   * service on the left feeds the stores on its right, which is the direction
   * the reader already scans and the direction every arrow then points. It ran
   * `BT` — bottom to top — which asks the eye to read a dependency chain
   * upwards against everything else on the screen.
   *
   * Still an option, because a deep chain is happier vertical and the user can
   * say so.
   */
  direction?: "LR" | "TB" | "BT";
}

/** Vertical gap between ranks (tiers) — room for the stepped edge corridors
 *  to separate without a line grazing a card it does not connect to. */
export const RANK_SEP = 140;
/** Horizontal gap between siblings within a rank. */
export const NODE_SEP = 64;

/** How far off a parent's line a node may be and still be pulled exactly onto
 *  it — see the snap in `straighten`. Half the connector's own bend radius:
 *  below that the arc it would draw is smaller than the corner it rounds. */
const SNAP = 24;

/** Card growth per rendered port line — a 16px line plus the 2px that sets it
 *  off the summary above it. */
const PORT_LINE_HEIGHT = 18;
/** Tray growth per docked volume row. */
const VOLUME_ROW_HEIGHT = 32;

/** Box dagre reserves per node — matches what the card actually renders
 *  (extra port lines and docked volume rows grow resource cards; attachment
 *  nodes are the smaller fixed card). */
function nodeLayoutSize(node: CanvasNode): { width: number; height: number } {
  if (node.type === "attachment") {
    return { width: ATTACHMENT_NODE_WIDTH, height: ATTACHMENT_NODE_HEIGHT };
  }
  const data = node.data as ResourceNodeData;
  // Ports wrap into a `ports: 80 · 89 …` line, ~6 numbers per row. EVERY such
  // line is growth now: `NODE_HEIGHT` is the card with no ports at all, where it
  // used to bake the first one in and count only the overflow.
  const portCount = data.details?.length ?? 0;
  const portLines = portCount > 0 ? Math.ceil(portCount / 6) : 0;
  const volumeRows = data.volumes?.length ?? 0;
  return {
    width: NODE_WIDTH,
    height: NODE_HEIGHT + portLines * PORT_LINE_HEIGHT + volumeRows * VOLUME_ROW_HEIGHT,
  };
}

/**
 * **Pull each node onto its parents' line, as far as its neighbours allow.**
 *
 * A connector on this canvas leaves and arrives at a face CENTRE, so it draws
 * as one straight line exactly when the two nodes' centres sit on the same
 * line — and bends the moment they do not. dagre orders ranks and avoids
 * crossings; it does not owe anyone a straight edge, and measured on a typical
 * stack it produced **six bends out of six**.
 *
 * So after dagre has decided WHICH rank everything belongs to and in what
 * order, this decides where in the rank each node sits:
 *
 * 1. every node wants the **median** of its already-placed parents (the median,
 *    not the mean — one distant parent should not drag a node off the line its
 *    other two share)
 * 2. the rank is then swept forward and back to open the minimum gap between
 *    neighbours, each node giving up as little of its wish as the sweep allows
 *
 * Rank ORDER is dagre's and is never changed — reordering would undo the
 * crossing work it just did. A node with no parents keeps the position it was
 * given.
 */
function straighten(g: dagre.graphlib.Graph, direction: string): void {
  const horizontal = direction === "LR" || direction === "RL";
  // The axis nodes move ALONG within a rank: across the flow, so y for LR.
  const along = (id: string) => (horizontal ? g.node(id).y : g.node(id).x);
  const setAlong = (id: string, v: number) => {
    const n = g.node(id);
    if (horizontal) n.y = v;
    else n.x = v;
  };
  const extent = (id: string) => (horizontal ? g.node(id).height : g.node(id).width) as number;
  /**
   * **Rank comes from the GRAPH, not from the pixel.** Keying on the laid-out
   * centre looks equivalent and is not: an attachment card is 180 wide against
   * a workload's 240, so two nodes dagre put in the same column have different
   * centre x and split into two "ranks" that then never see each other's
   * spacing. Longest path from the sources is what dagre itself ranks by.
   */
  const rankMemo = new Map<string, number>();
  const visiting = new Set<string>();
  const rankOf = (id: string): number => {
    const seen = rankMemo.get(id);
    if (seen != null) return seen;
    if (visiting.has(id)) return 0; // a cycle: break it rather than recurse
    visiting.add(id);
    const parents = (g.predecessors(id) ?? []).map(String);
    const r = parents.length === 0 ? 0 : Math.max(...parents.map(rankOf)) + 1;
    visiting.delete(id);
    rankMemo.set(id, r);
    return r;
  };

  const ranks = new Map<number, string[]>();
  for (const id of g.nodes()) {
    const key = rankOf(id);
    const bucket = ranks.get(key);
    if (bucket) bucket.push(id);
    else ranks.set(key, [id]);
  }

  for (const key of [...ranks.keys()].sort((a, b) => a - b)) {
    const members = ranks.get(key)!;
    const wishOf = (id: string) => {
      // Only parents in EARLIER ranks: they are already final, so the pass
      // never chases a target that is about to move.
      const parents = (g.predecessors(id) ?? []).map(String).filter((p) => rankOf(p) < key);
      if (parents.length === 0) return along(id);
      const centres = parents.map(along).sort((a, b) => a - b);
      const mid = centres.length >> 1;
      return centres.length % 2 ? centres[mid] : (centres[mid - 1] + centres[mid]) / 2;
    };

    // **Ordered by wish, not by where dagre left them.** Keeping dagre's order
    // sounds safer and is not: it put the two attachments last, so the sweep
    // pushed them below every store they were meant to sit beside and the
    // straightening it was doing got undone one node at a time. The median of a
    // node's parents IS the signal dagre orders by, so sorting on it lands in
    // the same neighbourhood rather than fighting the crossing work; the current
    // position breaks ties, which keeps the result stable.
    members.sort((a, b) => wishOf(a) - wishOf(b) || along(a) - along(b));
    const wish = members.map(wishOf);

    // Forward: nobody may sit closer than NODE_SEP to the neighbour above.
    const placed = [...wish];
    for (let i = 1; i < members.length; i++) {
      const floor = placed[i - 1] + extent(members[i - 1]) / 2 + NODE_SEP + extent(members[i]) / 2;
      if (placed[i] < floor) placed[i] = floor;
    }
    // Back: give the slack the forward pass created to whoever wanted it.
    for (let i = members.length - 2; i >= 0; i--) {
      const ceiling = placed[i + 1] - extent(members[i + 1]) / 2 - NODE_SEP - extent(members[i]) / 2;
      if (placed[i] > ceiling) placed[i] = ceiling;
      else if (wish[i] > placed[i]) placed[i] = Math.min(wish[i], ceiling);
    }
    /**
     * **A near miss is worse than a bend.** After the sweep a node can end up a
     * handful of pixels off a parent's line — measured, five — and five pixels
     * of offset does not read as a route, it reads as a line that failed to line
     * up. The connector answers a small offset with a shallow S, which is
     * exactly the shape that looks like a mistake.
     *
     * So anything already within `SNAP` of a parent goes exactly onto it, but
     * only while both its neighbours keep their full gap. A snap that shoves the
     * rank around would trade one crooked edge for two.
     */
    for (let i = 0; i < members.length; i++) {
      const parents = (g.predecessors(members[i]) ?? []).map(String).filter((p) => rankOf(p) < key);
      let best: number | null = null;
      for (const p of parents) {
        const delta = Math.abs(along(p) - placed[i]);
        if (delta <= SNAP && (best === null || delta < Math.abs(best - placed[i]))) best = along(p);
      }
      if (best === null) continue;
      const room = (j: number, v: number) =>
        (j < 0 || j >= members.length) ||
        Math.abs(v - placed[j]) >= extent(members[i]) / 2 + NODE_SEP + extent(members[j]) / 2 - 0.01;
      if (room(i - 1, best) && room(i + 1, best)) placed[i] = best;
    }

    members.forEach((id, i) => setAlong(id, placed[i]));
  }
}

/**
 * Pure auto-layout. Runs dagre over the graph and returns a NEW graph with
 * resolved positions (copy-on-write — the input is never mutated). Deterministic
 * for a given input, so unrelated re-renders never reshuffle the board.
 *
 * dagre reports node centres; React Flow positions are top-left, so we offset by
 * half the node box.
 */
export function layoutGraph(graph: CanvasGraph, options: LayoutOptions = {}): CanvasGraph {
  if (graph.nodes.length === 0) return { nodes: [], edges: graph.edges };

  const g = new dagre.graphlib.Graph();
  const direction = options.direction ?? "LR";
  g.setGraph({ rankdir: direction, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, nodeLayoutSize(node));
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);
  straighten(g, direction);

  const nodes = graph.nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const { width, height } = nodeLayoutSize(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });

  return { nodes, edges: graph.edges };
}
