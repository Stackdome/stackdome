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
  direction?: "LR" | "TB" | "BT";
}

/** Vertical gap between ranks (tiers) — room for the stepped edge corridors
 *  to separate without a line grazing a card it does not connect to. */
export const RANK_SEP = 140;
/** Horizontal gap between siblings within a rank. */
export const NODE_SEP = 64;

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
  g.setGraph({ rankdir: options.direction ?? "BT", nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    g.setNode(node.id, nodeLayoutSize(node));
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const nodes = graph.nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const { width, height } = nodeLayoutSize(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });

  return { nodes, edges: graph.edges };
}
