import { describe, it, expect } from "vitest";
import { Position } from "@xyflow/react";
import {
  connectionEdgeGeometry,
  ARC_RADIUS,
  ARROW_LENGTH,
  TIP_GAP,
  PORT_RADIUS,
  PORT_GAP,
  LINE_GAP,
  PARALLEL_EDGE_PITCH,
  type NodeRect,
} from "../edge-geometry";

/** Face → dot centre, and face → where the stroke begins. */
const PORT_OUT = PORT_GAP + PORT_RADIUS;
const LINE_OUT = PORT_OUT + PORT_RADIUS + LINE_GAP;

const rect = (x: number, y: number, width = 240, height = 104): NodeRect => ({ x, y, width, height });

/** The centre of the rect — what every attachment must aim at. */
const centre = (r: NodeRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Every coordinate pair in the path, in order. */
function points(path: string): [number, number][] {
  return [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]] as [number, number]);
}

/** Every `A rx,ry rot large sweep x,y` in the path. */
function arcs(path: string) {
  return [...path.matchAll(/A([\d.]+),([\d.]+) 0 0 ([01]) (-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    radius: +m[1],
    sweep: +m[3],
    x: +m[4],
    y: +m[5],
  }));
}

describe("connectionEdgeGeometry", () => {
  it("is straight, arc, straight — arcs for the turns and nothing else curved", () => {
    const path = connectionEdgeGeometry(rect(0, 0), rect(600, 300)).path;
    expect(arcs(path)).toHaveLength(2);
    expect(path).not.toMatch(/[CcQqSsTt]/);
  });

  it("turns at ONE radius, both corners alike", () => {
    const [first, second] = arcs(connectionEdgeGeometry(rect(0, 0), rect(700, 400)).path);
    expect(first.radius).toBeCloseTo(ARC_RADIUS);
    expect(second.radius).toBeCloseTo(ARC_RADIUS);
  });

  it("shrinks the radius only to what the route can hold, and keeps both corners equal", () => {
    // A 40px vertical offset cannot hold two 48px quarter turns; each corner
    // may take half of it, and the straight between them vanishes.
    const [first, second] = arcs(connectionEdgeGeometry(rect(0, 0), rect(700, 40)).path);
    expect(first.radius).toBeCloseTo(20);
    expect(second.radius).toBeCloseTo(20);
    // Both ends sit on y=52 and y=92 — the first arc ends exactly halfway,
    // which is where the second one starts. No straight between.
    expect(first.y).toBeCloseTo(72);
    expect(second.y).toBeCloseTo(92);
  });

  it("turns the right way round — down-and-right is clockwise then anticlockwise", () => {
    const down = arcs(connectionEdgeGeometry(rect(0, 0), rect(700, 400)).path);
    expect(down.map((a) => a.sweep)).toEqual([1, 0]);
    const up = arcs(connectionEdgeGeometry(rect(0, 400), rect(700, 0)).path);
    expect(up.map((a) => a.sweep)).toEqual([0, 1]);
  });

  it("a level pair is one straight line — no turn to round", () => {
    const path = connectionEdgeGeometry(rect(0, 0), rect(600, 0)).path;
    expect(arcs(path)).toHaveLength(0);
    for (const [, y] of points(path)) expect(y).toBeCloseTo(52);
  });

  it("marks both ends, and neither mark touches its card", () => {
    const geo = connectionEdgeGeometry(rect(0, 0), rect(600, 0));
    // Source face at 240: PORT_GAP of air, then the dot.
    expect(geo.portX - PORT_RADIUS).toBeCloseTo(240 + PORT_GAP);
    // Target face at 600: the tip stops TIP_GAP short of it.
    expect(geo.tipX).toBeCloseTo(600 - TIP_GAP);
    // And the stroke stops an arrowhead short of the tip.
    const path = points(geo.path);
    expect(path[path.length - 1][0]).toBeCloseTo(600 - TIP_GAP - ARROW_LENGTH);
  });

  it("target to the right: leaves the source's right face CENTRE, arrives on the target's left face CENTRE", () => {
    const source = rect(0, 0);
    const target = rect(600, 0);
    const geo = connectionEdgeGeometry(source, target);

    expect(geo.sourcePosition).toBe(Position.Right);
    // Dot, then the line — both stepped out along the face's own normal, both
    // still on the source's centre axis.
    expect(geo.portX).toBeCloseTo(240 + PORT_OUT);
    expect(geo.portY).toBeCloseTo(centre(source).y);
    expect(points(geo.path)[0]).toEqual([240 + LINE_OUT, centre(source).y]);

    expect(geo.targetPosition).toBe(Position.Left);
    expect(geo.tipX).toBeCloseTo(600 - TIP_GAP);
    expect(geo.tipY).toBeCloseTo(centre(target).y);
  });

  it("target directly above: leaves the source's top face CENTRE, arrives on the target's bottom face CENTRE", () => {
    const source = rect(0, 400);
    const target = rect(0, 0);
    const geo = connectionEdgeGeometry(source, target);

    expect(geo.sourcePosition).toBe(Position.Top);
    expect(geo.portX).toBeCloseTo(centre(source).x);
    expect(geo.portY).toBeCloseTo(400 - PORT_OUT);
    expect(points(geo.path)[0]).toEqual([centre(source).x, 400 - LINE_OUT]);

    expect(geo.targetPosition).toBe(Position.Bottom);
    expect(geo.tipX).toBeCloseTo(centre(target).x);
    expect(geo.tipY).toBeCloseTo(104 + TIP_GAP);
  });

  it.each([
    ["right", rect(0, 0), rect(600, 0)],
    ["left", rect(600, 0), rect(0, 0)],
    ["above", rect(0, 400), rect(0, 0)],
    ["below", rect(0, 0), rect(0, 400)],
    ["diagonal, mostly across", rect(0, 200), rect(700, 0)],
    ["diagonal, mostly up", rect(0, 700), rect(120, 0)],
    ["overlapping boxes", rect(0, 0), rect(40, 20)],
  ])("both ends sit on their node's centre axis (%s)", (_case, source, target) => {
    const geo = connectionEdgeGeometry(source, target);
    const onAxis = (r: NodeRect, x: number, y: number) =>
      Math.abs(x - centre(r).x) < 1e-6 || Math.abs(y - centre(r).y) < 1e-6;
    // The ring is pushed out along the normal, so it stays on the axis it left.
    expect(onAxis(source, geo.portX, geo.portY)).toBe(true);
    expect(onAxis(target, geo.tipX, geo.tipY)).toBe(true);
  });

  it("routes down the axis with clearance, not the one with the bigger delta", () => {
    // 240x104 cards 200 apart on BOTH axes: horizontally they still overlap by
    // 40, vertically they clear by 96. Raw |dx| vs |dy| calls this a tie and
    // may go sideways — straight through the overlap.
    const geo = connectionEdgeGeometry(rect(0, 200), rect(200, 0));
    expect(geo.sourcePosition).toBe(Position.Top);
    expect(geo.targetPosition).toBe(Position.Bottom);
  });

  it("a card down AND well to the right routes sideways — the long way round is the clear one", () => {
    const geo = connectionEdgeGeometry(rect(0, 0), rect(560, 290, 180, 56));
    expect(geo.sourcePosition).toBe(Position.Right);
    expect(geo.targetPosition).toBe(Position.Left);
  });

  it("stops the stroke an arrowhead short of the tip", () => {
    const geo = connectionEdgeGeometry(rect(0, 0), rect(600, 0));
    const path = points(geo.path);
    const end = path[path.length - 1];
    expect(end[0]).toBeCloseTo(geo.tipX - ARROW_LENGTH);
    expect(end[1]).toBeCloseTo(geo.tipY);
  });

  it.each([
    ["left of the target", rect(-800, 0), 0],
    ["right of the target", rect(800, 0), 180],
    ["above the target", rect(0, -500), 90],
    ["below the target", rect(0, 500), -90],
  ])("aims the arrow along the last leg — source %s", (_case, source, angle) => {
    expect(connectionEdgeGeometry(source, rect(0, 0)).arrowAngle).toBeCloseTo(angle);
  });

  it("parallel edges keep BOTH ends on the centres and separate in the corridor", () => {
    const source = rect(0, 0);
    const target = rect(900, 300);
    const a = connectionEdgeGeometry(source, target, 0, 2);
    const b = connectionEdgeGeometry(source, target, 1, 2);

    // Rule 1 holds for every one of them — the ends do not move.
    expect(points(a.path)[0]).toEqual(points(b.path)[0]);
    expect(a.tipX).toBeCloseTo(b.tipX);
    expect(a.tipY).toBeCloseTo(b.tipY);

    // The corridors do, symmetrically about the unshifted midpoint.
    const corridorOf = (path: string) => arcs(path)[0].x;
    expect(corridorOf(b.path) - corridorOf(a.path)).toBeCloseTo(PARALLEL_EDGE_PITCH);
  });

  it("clamps the corridor inside the two turns rather than folding the route back", () => {
    // Six edges at 28 pitch want ±70 of spread; this gap cannot hold it.
    const outermost = connectionEdgeGeometry(rect(0, 0), rect(420, 300), 5, 6);
    const corridorX = arcs(outermost.path)[0].x;
    expect(corridorX).toBeLessThanOrEqual(420 - ARROW_LENGTH - ARC_RADIUS + 0.01);
  });

  it("single edge (count 1) is identical to the no-offset call", () => {
    expect(connectionEdgeGeometry(rect(0, 400), rect(0, 0), 0, 1)).toEqual(
      connectionEdgeGeometry(rect(0, 400), rect(0, 0)),
    );
  });

  it("coincident centres resolve without NaN", () => {
    const geo = connectionEdgeGeometry(rect(0, 0), rect(0, 0));
    expect(geo.path).not.toContain("NaN");
    expect(Number.isFinite(geo.arrowAngle)).toBe(true);
  });
});
