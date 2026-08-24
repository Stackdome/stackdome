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

/**
 * **How far an arrival and a departure slide apart when they share a face.**
 *
 * A node fed from the left that also feeds something to the left put both
 * connectors on one point, and a line arriving exactly where another leaves
 * reads as one line passing THROUGH the card rather than as two connections
 * meeting it. 6 each way is 12 between them — a clear pair at the 5px dot's
 * scale, and small enough that both still visibly aim at the card's centre.
 *
 * It applies ONLY to a face working both ways. A face with traffic in one
 * direction keeps the centre, so the common card — everything on it arriving,
 * or everything leaving — is untouched.
 */
export const FACE_SPLIT = 6;

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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Unit vector ALONG a face — the direction an attachment slides when a face
 *  has to carry more than one kind of connection. */
const ALONG: Record<Position, Point> = {
  [Position.Left]: { x: 0, y: 1 },
  [Position.Right]: { x: 0, y: 1 },
  [Position.Top]: { x: 1, y: 0 },
  [Position.Bottom]: { x: 1, y: 0 },
};

/**
 * Which faces a pair of nodes would route between.
 *
 * **Decided by CLEARANCE**, not by centre distance: how much empty space is
 * left on each axis once both boxes are taken out of it. Negative means the
 * boxes overlap on that axis, which is exactly when routing along it should
 * lose — and neither a raw `|dx|` vs `|dy|` test nor one normalised by the card
 * sizes can say that.
 *
 * Exported because an edge cannot answer rule 3 alone: to know whether its own
 * face is shared with a connection running the other way, it has to be able to
 * ask which face the node's OTHER neighbours would use.
 */
export function routeFaces(
  source: NodeRect,
  target: NodeRect,
): { sourcePosition: Position; targetPosition: Position } {
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
  return { sourcePosition, targetPosition: OPPOSITE[sourcePosition] };
}

/**
 * **One radius, whatever the route.**
 *
 * The turn used to be solved as a fillet — take the corner, cut it back by the
 * radius each way, and SHRINK the radius when a leg was too short to give that
 * much up. So a board's connectors bent at whatever radius each pair of cards
 * happened to allow: 48 between two ranks, 26 between two siblings, and the set
 * of them read as a collection rather than as one system.
 *
 * The fix is to vary the SWEEP instead. Two arcs of the same radius, turning
 * out of the line and back into it, cover an across-offset of
 * `2R(1 − cos θ)` — so a small offset is a shallow pair of arcs, not a tight
 * pair. Solve that for θ and the radius never has to move:
 *
 * ```
 * θ    = acos(1 − offset / 2R)      capped at a quarter turn
 * rise = R(1 − cos θ)               each arc's across-travel
 * run  = R sin θ                    each arc's along-travel
 * ```
 *
 * Past `2R` of offset θ saturates at 90°, the arcs are true quarters again, and
 * a straight run appears between them — the classic elbow, and it falls out of
 * the same arithmetic rather than being a second case.
 *
 * **The one thing that can still shrink it** is the space ALONG the route: two
 * arcs need `2 · R sin θ` of it, and if the corridor sits closer to a card than
 * that, no radius that large can be drawn at all. Binary search rather than
 * case analysis — `run` climbs monotonically with R, so twenty-four halvings
 * land on the largest radius that fits.
 */
function arcRoute(start: Point, end: Point, corridor: number, horizontal: boolean): string {
  const u0 = horizontal ? start.x : start.y;
  const v0 = horizontal ? start.y : start.x;
  const u1 = horizontal ? end.x : end.y;
  const v1 = horizontal ? end.y : end.x;
  const at = (u: number, v: number): Point => (horizontal ? { x: u, y: v } : { x: v, y: u });

  const offset = v1 - v0;
  const across = Math.abs(offset);
  if (across < 0.01) return `M${fmt(start)} L${fmt(end)}`;

  const travel = Math.sign(u1 - u0) || 1;
  const side = Math.sign(offset);

  const runOf = (r: number) =>
    across >= 2 * r ? r : Math.sqrt(Math.max(0, across * r - (across * across) / 4));

  let radius = ARC_RADIUS;
  const along = Math.min(Math.abs(corridor - u0), Math.abs(u1 - corridor));
  if (runOf(radius) > along) {
    let lo = 0;
    let hi = ARC_RADIUS;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (runOf(mid) <= along) lo = mid;
      else hi = mid;
    }
    radius = lo;
  }

  const theta = Math.acos(clamp(1 - Math.min(across, 2 * radius) / (2 * radius), -1, 1));
  const rise = radius * (1 - Math.cos(theta));
  const run = radius * Math.sin(theta);

  // A turn, in a y-DOWN space: a positive cross product is clockwise, which is
  // what SVG's sweep flag calls 1. The second arc turns back, so it is the
  // other one.
  const forward = horizontal ? { x: travel, y: 0 } : { x: 0, y: travel };
  const sideways = horizontal ? { x: 0, y: side } : { x: side, y: 0 };
  const sweep = forward.x * sideways.y - forward.y * sideways.x > 0 ? 1 : 0;
  const r = round(radius);

  const enter = at(corridor - travel * run, v0);
  const crest = at(corridor, v0 + side * rise);
  const trough = at(corridor, v1 - side * rise);
  const leave = at(corridor + travel * run, v1);
  const straight = across > 2 * radius ? ` L${fmt(trough)}` : "";

  return (
    `M${fmt(start)} L${fmt(enter)}` +
    ` A${r},${r} 0 0 ${sweep} ${fmt(crest)}` +
    straight +
    ` A${r},${r} 0 0 ${1 - sweep} ${fmt(leave)}` +
    ` L${fmt(end)}`
  );
}

export interface ConnectionEdgeOptions {
  /** Set only when >=2 edges share a node pair: this edge's slot and the total. */
  parallelIndex?: number;
  parallelCount?: number;
  /**
   * Slide the attachment along its face: `-1`, `0` or `1`. Rule 3 — a face
   * that carries traffic BOTH ways splits it, so an arrival and a departure are
   * never the same point. `0` keeps the face centre, which is what a face
   * carrying only one direction always gets.
   */
  sourceSplit?: number;
  targetSplit?: number;
}

/**
 * Connection geometry — a rounded-elbow route between two node faces.
 *
 * **Three rules.**
 *
 * 1. **Every end attaches at a face CENTRE.** Not at a floating point along the
 *    perimeter, which is what the original geometry did: it intersected the
 *    centre-to-centre ray with the box, so three edges leaving one card left it
 *    at three different heights and no line arrived anywhere predictable. A
 *    face centre puts both the departure and the arrival on a node's own centre
 *    axis — the line points AT the card rather than merely touching it, and a
 *    fan out of one card leaves as a single trunk.
 *
 * 2. **Which face is decided by CLEARANCE** — see `routeFaces`.
 *
 * 3. **Except where a face works both ways.** A node that is fed from the left
 *    and also feeds something to the left had both connectors meeting the same
 *    point, and one line arriving exactly where another leaves reads as a
 *    single line passing THROUGH the card. Those two slide apart by
 *    `FACE_SPLIT` — and only those two: a face with traffic in one direction
 *    only keeps rule 1 exactly.
 *
 * Parallel edges between the same pair keep both ends where they are and
 * separate in the MIDDLE: the corridor between the two turns shifts by a
 * symmetric multiple of `PARALLEL_EDGE_PITCH`.
 */
export function connectionEdgeGeometry(
  source: NodeRect,
  target: NodeRect,
  options: ConnectionEdgeOptions = {},
): ConnectionEdgeGeometry {
  const { parallelIndex = 0, parallelCount = 1, sourceSplit = 0, targetSplit = 0 } = options;
  const { sourcePosition, targetPosition } = routeFaces(source, target);
  const horizontal = sourcePosition === Position.Left || sourcePosition === Position.Right;

  const outbound = NORMAL[sourcePosition];
  const sourceAlong = ALONG[sourcePosition];
  const sourceCentre = faceCentre(source, sourcePosition);
  const face = {
    x: sourceCentre.x + sourceAlong.x * sourceSplit * FACE_SPLIT,
    y: sourceCentre.y + sourceAlong.y * sourceSplit * FACE_SPLIT,
  };
  // Everything on this end is measured OUT from the face along its own normal,
  // so the dot and the line it starts stay on the axis they left by: 4 of air,
  // the 5-across dot, then 4 more before the line begins.
  const portDistance = PORT_GAP + PORT_RADIUS;
  const start = {
    x: face.x + outbound.x * (portDistance + PORT_RADIUS + LINE_GAP),
    y: face.y + outbound.y * (portDistance + PORT_RADIUS + LINE_GAP),
  };

  const inbound = NORMAL[targetPosition];
  const targetAlong = ALONG[targetPosition];
  const targetCentre = faceCentre(target, targetPosition);
  const targetFace = {
    x: targetCentre.x + targetAlong.x * targetSplit * FACE_SPLIT,
    y: targetCentre.y + targetAlong.y * targetSplit * FACE_SPLIT,
  };
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
    // Past the turns the route folds back on itself, which is a worse read than
    // two edges sharing one corridor.
    if (lo < hi) corridor = clamp(corridor + spread, lo, hi);
  }

  return {
    path: arcRoute(start, end, corridor, horizontal),
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
