// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";
import { ConnectionEdge } from "../connection-edge";
import { TIP_GAP, PORT_GAP, PORT_RADIUS, FACE_SPLIT } from "@/pages/stacks/lib/canvas/edge-geometry";

afterEach(cleanup);

// The edge reads node rects through `useInternalNode` and the node's OTHER
// neighbours through `useStore` — the second is how it answers "does this face
// also carry the other direction?". Feed it both from fakes rather than
// mounting a full ReactFlow instance.
const nodes = new Map<string, unknown>();
let edges: { source: string; target: string }[] = [];
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useInternalNode: (id: string) => nodes.get(id),
    useStore: (selector: (s: { edges: unknown; nodeLookup: unknown }) => unknown) =>
      selector({ edges, nodeLookup: nodes }),
    BaseEdge: ({ path }: { path: string }) => <path data-testid="edge-path" d={path} />,
  };
});

function setNode(id: string, x: number, y: number, width = 216, height = 104) {
  nodes.set(id, { internals: { positionAbsolute: { x, y } }, measured: { width, height } });
}

/** The board this edge lives on. Defaults to the single edge under test. */
function setBoard(...wires: [string, string][]) {
  edges = wires.map(([source, target]) => ({ source, target }));
}

function renderEdge() {
  const props = { id: "e1", source: "a", target: "b" } as Parameters<typeof ConnectionEdge>[0];
  return render(
    <svg>
      <ConnectionEdge {...props} />
    </svg>,
  );
}

/** The arrowhead is the only path carrying a transform — the routed stroke
 *  is emitted by the mocked BaseEdge above under its own test id. */
function arrowhead(container: HTMLElement): SVGPathElement | null {
  return container.querySelector("path[transform]");
}

function arrowTransform(container: HTMLElement): string {
  const arrow = arrowhead(container);
  expect(arrow).not.toBeNull();
  return arrow!.getAttribute("transform") ?? "";
}

describe("ConnectionEdge", () => {
  it("renders nothing while either endpoint node is missing", () => {
    nodes.clear();
    setBoard(["a", "b"]);
    setNode("a", 0, 0);
    const { container } = renderEdge();
    expect(arrowhead(container)).toBeNull();
    expect(container.querySelector('[data-testid="edge-path"]')).toBeNull();
  });

  it.each([
    ["below (enters bottom face)", 0, 500, "rotate(-90)"],
    ["above (enters top face)", 0, -500, "rotate(90)"],
    ["left of target (enters left face)", -800, 0, "rotate(0)"],
    ["right of target (enters right face)", 800, 0, "rotate(180)"],
  ])("points the arrowhead into the target when the source sits %s", (_desc, sx, sy, rotation) => {
    nodes.clear();
    setBoard(["a", "b"]);
    setNode("a", sx, sy);
    setNode("b", 0, 0);
    const { container } = renderEdge();
    expect(arrowTransform(container)).toContain(rotation);
    expect(container.querySelector('[data-testid="edge-path"]')).not.toBeNull();
  });

  it("paints the rounded-elbow route the geometry hands it", () => {
    nodes.clear();
    setBoard(["a", "b"]);
    setNode("a", 0, 0);
    setNode("b", 700, 260);
    const { container } = renderEdge();
    const d = container.querySelector('[data-testid="edge-path"]')!.getAttribute("d") ?? "";
    expect(d.match(/A/g)).toHaveLength(2);
    expect(d).not.toMatch(/[CcQqSs]/);
  });

  it("keeps both marks clear of their cards", () => {
    nodes.clear();
    setBoard(["a", "b"]);
    setNode("a", 0, 0);
    setNode("b", 700, 0);
    const { container } = renderEdge();
    // Target's left face at x=700, its vertical centre at y=52 — the tip stops
    // TIP_GAP short of the face rather than landing on it.
    expect(arrowTransform(container)).toContain(`translate(${700 - TIP_GAP}, 52)`);
    // The source's right face is at 216; the dot floats PORT_GAP clear of it.
    const dot = container.querySelector("circle")!;
    expect(Number(dot.getAttribute("cx"))).toBeCloseTo(216 + PORT_GAP + PORT_RADIUS);
    expect(Number(dot.getAttribute("r"))).toBeCloseTo(PORT_RADIUS);
  });

  it("leaves both marks on the face centre when the face runs one way only", () => {
    nodes.clear();
    setBoard(["a", "b"], ["b", "c"]);
    setNode("a", 0, 0);
    setNode("b", 700, 0);
    setNode("c", 1400, 0);
    const { container } = renderEdge();
    // b is fed on its LEFT and feeds c from its RIGHT — two different faces, so
    // nothing has to move. Both marks stay on the 52 centre line.
    expect(Number(container.querySelector("circle")!.getAttribute("cy"))).toBeCloseTo(52);
    expect(arrowTransform(container)).toContain(", 52)");
  });

  it("slides an arrival off a face that also carries a departure", () => {
    nodes.clear();
    // b feeds a back, so a's RIGHT face carries both directions and so does
    // b's LEFT: the a → b edge under test must not land where b → a leaves.
    setBoard(["a", "b"], ["b", "a"]);
    setNode("a", 0, 0);
    setNode("b", 700, 0);
    const { container } = renderEdge();
    expect(Number(container.querySelector("circle")!.getAttribute("cy"))).toBeCloseTo(52 - FACE_SPLIT);
    expect(arrowTransform(container)).toContain(`, ${52 + FACE_SPLIT})`);
  });
});
