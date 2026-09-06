import { describe, it, expect } from "vitest";
import { layoutGraph } from "../layout-graph";
import type { CanvasGraph } from "../graph-from-connections";

const graph: CanvasGraph = {
  nodes: [
    {
      id: "resource:web",
      type: "resource",
      data: { kind: "service", name: "web", kindLabel: "Web", glyph: "web", summary: "", volumes: [] },
      position: { x: 0, y: 0 },
    },
    {
      id: "addon:a1",
      type: "resource",
      data: { kind: "addon", name: "db", kindLabel: "Postgres", glyph: "postgres", summary: "", volumes: [] },
      position: { x: 0, y: 0 },
    },
  ],
  edges: [
    {
      id: "resource:web->addon:a1",
      source: "resource:web",
      target: "addon:a1",
      type: "connection",
      data: { kind: "env", sourceOfTruth: "connection" },
    },
  ],
};

describe("layoutGraph", () => {
  it("assigns non-origin, distinct positions", () => {
    const out = layoutGraph(graph);
    expect(out.nodes[0].position).not.toEqual({ x: 0, y: 0 });
    expect(out.nodes[0].position).not.toEqual(out.nodes[1].position);
  });

  it("is deterministic for the same input", () => {
    const a = layoutGraph(graph);
    const b = layoutGraph(graph);
    expect(a.nodes.map((n) => n.position)).toEqual(b.nodes.map((n) => n.position));
  });

  it("does not mutate the input graph", () => {
    layoutGraph(graph);
    expect(graph.nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("returns every input node", () => {
    const out = layoutGraph(graph);
    expect(out.nodes.map((n) => n.id).sort()).toEqual(["addon:a1", "resource:web"]);
  });

  it("handles an empty graph", () => {
    expect(layoutGraph({ nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] });
  });

  it("flows LEFT TO RIGHT by default — the consumer sits to the right of what feeds it", () => {
    // Edge source=provider (web) → target=consumer. It ranked BT until Aug 2026,
    // which asked the reader to follow a dependency chain UPWARDS against the
    // direction everything else on the screen is read in.
    const out = layoutGraph(graph);
    const xOf = (id: string) => out.nodes.find((n) => n.id === id)!.position.x;
    expect(xOf("addon:a1")).toBeGreaterThan(xOf("resource:web"));
  });

  it("puts a chain on one line — a straight connector, not a bent one", () => {
    // A connector attaches at face CENTRES, so it draws straight exactly when
    // the two centres share a line. dagre does not owe anyone that; the
    // straightening pass is what pulls each node onto its parents' line.
    const chain = {
      nodes: ["a", "b", "c"].map((id) => ({
        id,
        type: "resource" as const,
        position: { x: 0, y: 0 },
        data: { kind: "service", name: id, kindLabel: "Web", glyph: "web", summary: "", volumes: [] },
      })),
      edges: [
        { id: "e1", source: "a", target: "b", type: "connection" as const, data: { kind: "env", sourceOfTruth: "connection" } },
        { id: "e2", source: "b", target: "c", type: "connection" as const, data: { kind: "env", sourceOfTruth: "connection" } },
      ],
    } as CanvasGraph;
    const out = layoutGraph(chain);
    const yOf = (id: string) => out.nodes.find((n) => n.id === id)!.position.y;
    expect(yOf("b")).toBeCloseTo(yOf("a"));
    expect(yOf("c")).toBeCloseTo(yOf("a"));
  });
});
