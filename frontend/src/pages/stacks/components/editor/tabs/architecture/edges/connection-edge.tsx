import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import {
  connectionEdgeGeometry,
  ARROW_LENGTH,
  PORT_RADIUS,
  type NodeRect,
} from "@/pages/stacks/lib/canvas/edge-geometry";
import { NODE_WIDTH, NODE_HEIGHT } from "@/pages/stacks/lib/canvas/layout-graph";
import type { ConnectionEdgeData } from "@/pages/stacks/lib/canvas/graph-from-connections";

/** Measured node → flow-coordinate rect; falls back to layout constants pre-measure. */
function rectOf(node: InternalNode): NodeRect {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured?.width ?? NODE_WIDTH,
    height: node.measured?.height ?? NODE_HEIGHT,
  };
}

/**
 * **The arrowhead — a plain triangle.** Tip at the origin, pointing along +x,
 * so one rotation aims it.
 *
 * | | |
 * |---|---|
 * | **A flat back** | It carried a notch, on the theory that the concave back is what separates an arrow from a wedge. Jaseem: *it should look like a triangle.* He is right — at 10px the notch is not read as a shape, only as an edge that failed to close, and the head looked chipped rather than drawn |
 * | **6 long, 7 across** | The connector board runs Figma's own arrow cap at 5 × 5.77; judged live that was a shade under, so this runs a pixel over it. The base is WIDER than the head is long: a tall narrow head reads as a dart, a base-heavy one reads as a triangle. It ran at 10, then 7, and both were an object on the board rather than the end of a line. The length is `ARROW_LENGTH` itself — the same number the geometry stops the stroke at, so the head can never overlap the line or float off the end of it |
 * | **No stroke** | `--wire` is an alpha, so a stroke in the same token composites over its own fill and leaves a dark rim exactly where the shape should be cleanest |
 */
const ARROW_HALF_WIDTH = 3.5;
const ARROW_PATH = `M0 0 L${-ARROW_LENGTH} ${-ARROW_HALF_WIDTH} L${-ARROW_LENGTH} ${ARROW_HALF_WIDTH} Z`;

/**
 * Connection edge — a rounded-elbow route between two node face CENTRES. It is
 * marked at BOTH ends, and differently at each: a **dot** where it leaves the
 * producer, a **triangle** where it enters the consumer. Both, and the air
 * around them, are measured off Jaseem's connector board (node 1063:51590) —
 * which marks one end and arrows the other for the same reason: this graph is
 * directed, and which resource feeds which is the fact the canvas exists to
 * show.
 *
 * All of the geometry, including the path, the ring's centre and the arrow's
 * angle, comes from `connectionEdgeGeometry`; this component only paints it.
 * Kind and source_of_truth stay in the edge data for future styling.
 *
 * **Solid, not dashed.** The dash it used to carry was applied to every edge
 * regardless of kind or source_of_truth, so it distinguished nothing — it was
 * texture on a line whose job is to be followed.
 */
export function ConnectionEdge({ id, source, target, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const edgeData = data as ConnectionEdgeData | undefined;
  const geo = connectionEdgeGeometry(
    rectOf(sourceNode),
    rectOf(targetNode),
    edgeData?.parallelIndex,
    edgeData?.parallelCount,
  );

  return (
    <>
      {/* **1px, off the connector board** (node 1063:51590). It ran at 1.5 for
          two passes on Jaseem's own earlier call and he settled on the board's
          value; at full `--wire` — 34% ink, opaque — a single pixel still
          measures firmer than the dot grid it crosses, which is the floor a
          connection has to clear.

          Full token, no second opacity. At 1.4px × 0.7 the old wire resolved to
          ~0.2 alpha and was lighter than the ground it was drawn on. */}
      <BaseEdge id={id} path={geo.path} style={{ stroke: "var(--wire)", strokeWidth: 1 }} />
      {/* The port the line leaves from — SOLID, the way the board draws it, and
          floating clear of both the card and the line so nothing has to align. */}
      <circle cx={geo.portX} cy={geo.portY} r={PORT_RADIUS} fill="var(--wire)" />
      <path
        d={ARROW_PATH}
        fill="var(--wire)"
        transform={`translate(${geo.tipX}, ${geo.tipY}) rotate(${geo.arrowAngle})`}
      />
    </>
  );
}
