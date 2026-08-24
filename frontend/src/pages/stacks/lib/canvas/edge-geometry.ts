import { Position } from "@xyflow/react";

/** Node rectangle in flow coordinates: top-left origin + measured size. */
export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * **The turn radius, and it is one number for the whole board.**
 *
 * A connector here is straight · arc · straight · arc · straight — it leaves a
 * card square-on, makes its turn as a true quarter circle, and arrives
 * square-on. The arc is the only place the line is not straight, so the radius
 * IS the character of the connector: at 16 it reads as a wire that got bent,
 * at 48 as one that was routed.
 *
 * **48, not 64.** Both read well alone. 48 is the largest radius at which more
 * than one edge on a real board actually GETS it: a turn needs twice the
 * radius of perpendicular offset to stay a full quarter, and the canvas lays
 * ranks out at `RANK_SEP` 140. Past 48 most edges are running a clamped radius
 * and "one radius everywhere" stops being true in the only place it matters —
 * on screen.
 *
 * It shrinks only where a route physically cannot hold it — see `fillet`.
 */
export const ARC_RADIUS = 48;

/**
 * **Arrowhead length.** Jaseem's connector board (`Shape + Hierarchy Pass`,
 * node 1063:51590) draws Figma's own arrow cap at 5 long on a 5.77 base; judged
 * in the running app that was a shade under, so it runs one pixel over the
 * board at **6 on a 7 base**. Still small — the head terminates the line rather
 * than being an object on it, which is the note that cut it from 10, then 7.
 *
 * The stroke stops exactly here, and the head is DRAWN from this same number,
 * so the two cannot drift apart into an overlap or a gap.
 */
export const ARROW_LENGTH = 6;

/** Air between the arrow's TIP and the card it points at. On the board the tip
 *  stops 5 short and never touches — the gap is what stops the head merging
 *  into the card's own hairline. */
export const TIP_GAP = 5;

/**
 * **The port dot** the line leaves from — **5 across** and SOLID. It was a
 * hollow ring for one pass, and the board's own 8 for another; both read as a
 * bead on the end of the line rather than as the point it leaves from. At 5 it
 * is a terminal, not an object.
 *
 * It is what makes a departure look chosen rather than incidental: a bare line
 * meeting a card edge is ambiguous about which of them owns the connection,
 * and on a fan of three leaving one point it is the only mark that says the
 * three are one trunk and not three coincidences.
 */
export const PORT_RADIUS = 2.5;

/** Air between the card and the dot — the board's 4. The dot floats off the
 *  face rather than sitting on it, which is what makes it read as the line's
 *  beginning and not as something bolted to the card. */
export const PORT_GAP = 4;

/** Air between the dot and the line that leaves it. The board runs 2 at one end
 *  and 4 at the other; 4 is the one that repeats, and it sets the same air on
 *  both sides of the dot. */
export const LINE_GAP = 4;

/** Perpendicular spacing between the mid-corridors of parallel same-pair
 *  edges. The ends stay on the face centres; only the corridor moves. */
export const PARALLEL_EDGE_PITCH = 28;

export interface ConnectionEdgeGeometry {
  /** The whole edge: `M … L … A … L …`. */
  path: string;
  /** Arrow tip — the centre of the target's facing edge. */
  tipX: number;
  tipY: number;
  /** Centre of the port dot, floating `PORT_GAP` off the source's facing edge. */
  portX: number;
  portY: number;
  /** Degrees. The last leg is straight along the target's own normal, so this
   *  is the face normal — but it is read off the path, not assumed. */
  arrowAngle: number;
  sourcePosition: Position;
  targetPosition: Position;
}

interface Point {
  x: number;
  y: number;
}

/** Outward unit normal of a face. */
const NORMAL: Record<Position, Point> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

const OPPOSITE: Record<Position, Position> = {
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
};

/** The MIDPOINT of one face — the only place a line may attach. A line that
 *  leaves or arrives here runs along the node's own centre axis, so extended
 *  it passes through the centre. */
function faceCentre(rect: NodeRect, position: Position): Point {
  switch (position) {
    case Position.Left:
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case Position.Right:
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case Position.Top:
      return { x: rect.x + rect.width / 2, y: rect.y };
    case Position.Bottom:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
const fmt = (p: Point) => `${round(p.x)},${round(p.y)}`;

/**
 * Round every corner of an orthogonal polyline with arcs of ONE radius.
 *
 * The radius is shared across the whole run rather than solved per corner, so
 * a connector never turns tightly at one end and widely at the other. It is
 * cut down only by what the route can hold: the two end legs in full, and the
 * middle leg halved because its two corners each eat into it from one side.
 * When the middle leg is exactly twice the radius the arcs meet tangentially
 * and the straight between them vanishes — which is the S a short offset
 * should produce, and it falls out of the same arithmetic rather than being a
 * second case.
 */
function fillet(points: Point[], radius: number): string {
  const legs: number[] = [];
  for (let i = 1; i < points.length; i++) {
    legs.push(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const room = legs.map((length, i) => (i === 0 || i === legs.length - 1 ? length : length / 2));
  const r = Math.min(radius, ...room);

  let d = `M${fmt(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    if (r < 0.01 || inLength < 0.01 || outLength < 0.01) {
      d += ` L${fmt(corner)}`;
      continue;
    }
    const inDir = { x: (corner.x - previous.x) / inLength, y: (corner.y - previous.y) / inLength };
    const outDir = { x: (next.x - corner.x) / outLength, y: (next.y - corner.y) / outLength };
    // A turn, in a y-DOWN space: a positive cross product is clockwise, which
    // is what SVG's sweep flag calls 1.
    const sweep = inDir.x * outDir.y - inDir.y * outDir.x > 0 ? 1 : 0;
    const enter = { x: corner.x - inDir.x * r, y: corner.y - inDir.y * r };
    const leave = { x: corner.x + outDir.x * r, y: corner.y + outDir.y * r };
    d += ` L${fmt(enter)} A${round(r)},${round(r)} 0 0 ${sweep} ${fmt(leave)}`;
  }
  return `${d} L${fmt(points[points.length - 1])}`;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/**
 * Connection geometry — a rounded-elbow route between two node face centres.
 *
 * **Three rules.**
 *
 * 1. **Every end attaches at a face CENTRE.** Not at a floating point along
 *    the perimeter, which is what the original geometry did: it intersected
 *    the centre-to-centre ray with the box, so three edges leaving one card
 *    left it at three different heights and no line arrived anywhere
 *    predictable. A face centre puts both the departure and the arrival on a
 *    node's own centre axis — the line points AT the card rather than merely
 *    touching it, and a fan out of one card leaves as a single trunk.
 *
 * 2. **Which face is decided by CLEARANCE**, not by centre distance: how much
 *    empty space is left on each axis once both boxes are taken out of it.
 *    Negative means the boxes overlap on that axis, which is exactly when
 *    routing along it should lose — and neither a raw `|dx|` vs `|dy|` test
 *    nor one normalised by the card sizes can say that.
 *
 * 3. **Straight, arc, straight** — one radius for the whole board, see
 *    `ARC_RADIUS`. Settled after a bezier was tried and pulled: a cubic eases
 *    into and out of its turn, so the curvature is different at every point
 *    and no two edges on a board bend alike. An arc has one curvature, and the
 *    eye reads a set of them as a system.
 *
 * Parallel edges between the same pair keep BOTH ends on the face centres and
 * separate in the MIDDLE: the corridor between the two turns shifts by a
 * symmetric multiple of `PARALLEL_EDGE_PITCH`. Moving the attachment points
 * would have been easier and would have broken rule 1.
 */
export function connectionEdgeGeometry(
  source: NodeRect,
  target: NodeRect,
  parallelIndex = 0,
  parallelCount = 1,
): ConnectionEdgeGeometry {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2);
  const dy = target.y + target.height / 2 - (source.y + source.height / 2);

  const clearanceX = Math.abs(dx) - (source.width + target.width) / 2;
  const clearanceY = Math.abs(dy) - (source.height + target.height) / 2;
  const horizontal = clearanceX >= clearanceY;

  const sourcePosition = horizontal
    ? dx >= 0
      ? Position.Right
      : Position.Left
    : dy >= 0
      ? Position.Bottom
      : Position.Top;
  const targetPosition = OPPOSITE[sourcePosition];

  const outbound = NORMAL[sourcePosition];
  const face = faceCentre(source, sourcePosition);
  // Everything on this end is measured OUT from the face along its own normal,
  // so the dot and the line it starts stay on the node's centre axis (rule 1):
  // 4 of air, the 8-across dot, then 4 more before the line begins.
  const portDistance = PORT_GAP + PORT_RADIUS;
  const start = {
    x: face.x + outbound.x * (portDistance + PORT_RADIUS + LINE_GAP),
    y: face.y + outbound.y * (portDistance + PORT_RADIUS + LINE_GAP),
  };

  const targetFace = faceCentre(target, targetPosition);
  const inbound = NORMAL[targetPosition];
  // The tip stops short of the card, and the stroke stops an arrowhead short of
  // the tip — both along the target's own normal, which is the direction the
  // last leg is already travelling.
  const tip = {
    x: targetFace.x + inbound.x * TIP_GAP,
    y: targetFace.y + inbound.y * TIP_GAP,
  };
  const end = { x: tip.x + inbound.x * ARROW_LENGTH, y: tip.y + inbound.y * ARROW_LENGTH };

  const [a, b] = horizontal ? [start.x, end.x] : [start.y, end.y];
  let corridor = (a + b) / 2;
  if (parallelCount > 1) {
    const spread = (parallelIndex - (parallelCount - 1) / 2) * PARALLEL_EDGE_PITCH;
    const lo = Math.min(a, b) + ARC_RADIUS;
    const hi = Math.max(a, b) - ARC_RADIUS;
    // Past the turns the route folds back on itself, which is a worse read
    // than two edges sharing one corridor.
    if (lo < hi) corridor = clamp(corridor + spread, lo, hi);
  }

  const points: Point[] = horizontal
    ? [start, { x: corridor, y: start.y }, { x: corridor, y: end.y }, end]
    : [start, { x: start.x, y: corridor }, { x: end.x, y: corridor }, end];

  return {
    path: fillet(points, ARC_RADIUS),
    tipX: tip.x,
    tipY: tip.y,
    portX: face.x + outbound.x * portDistance,
    portY: face.y + outbound.y * portDistance,
    // `|| 0` kills a negative zero: `atan2(-0, -1)` is -180, and an arrow
    // written `rotate(-180)` is a right answer spelled the confusing way.
    arrowAngle: round((Math.atan2(-inbound.y || 0, -inbound.x || 0) * 180) / Math.PI),
    sourcePosition,
    targetPosition,
  };
}
