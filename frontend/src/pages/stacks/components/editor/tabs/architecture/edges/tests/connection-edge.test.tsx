// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";
import { ConnectionEdge } from "../connection-edge";
import { TIP_GAP, PORT_GAP, PORT_RADIUS } from "@/pages/stacks/lib/canvas/edge-geometry";

afterEach(cleanup);

// The edge reads node rects from React Flow's store via useInternalNode; feed it
// fake internal nodes instead of mounting a full ReactFlow instance.
const nodes = new Map<string, unknown>();
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useInternalNode: (id: string) => nodes.get(id),
    BaseEdge: ({ path }: { path: string }) => <path data-testid="edge-path" d={path} />,
  };
});

function setNode(id: string, x: number, y: number, width = 216, height = 104) {
  nodes.set(id, { internals: { positionAbsolute: { x, y } }, measured: { width, height } });
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
    setNode("a", sx, sy);
    setNode("b", 0, 0);
    const { container } = renderEdge();
    expect(arrowTransform(container)).toContain(rotation);
    expect(container.querySelector('[data-testid="edge-path"]')).not.toBeNull();
  });

  it("paints the rounded-elbow route the geometry hands it", () => {
    nodes.clear();
    setNode("a", 0, 0);
    setNode("b", 700, 260);
    const { container } = renderEdge();
    const d = container.querySelector('[data-testid="edge-path"]')!.getAttribute("d") ?? "";
    expect(d.match(/A/g)).toHaveLength(2);
    expect(d).not.toMatch(/[CcQqSs]/);
  });

  it("keeps both marks clear of their cards", () => {
    nodes.clear();
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
});
