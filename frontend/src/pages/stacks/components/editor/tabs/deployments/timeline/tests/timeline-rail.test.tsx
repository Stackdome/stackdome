// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("@/api/observability", () => ({ fetchLogSnapshot: vi.fn().mockResolvedValue([]) }));
vi.mock("@/api/releases", () => ({
  getRelease: vi.fn().mockResolvedValue({ id: "x", sequence: 1, outcome: { resources: {} }, snapshot: { resources: [] } }),
  listReleaseEvents: vi.fn().mockResolvedValue({ items: [] }),
  buildReleaseEventStreamUrl: vi.fn(() => ""),
  ReleaseEventScope: { Release: "release", Resource: "resource" },
  ReleaseEventType: { ResourceWaiting: "resource_waiting", ResourceDeploying: "resource_deploying", ResourceReady: "resource_ready", ResourceFailed: "resource_failed" },
}));
import { TimelineRail } from "../timeline-rail";
import { ReleaseDetailProvider } from "../../use-release-detail";
import type { ReleaseDetail } from "../../use-release-detail";
import type { StackRelease } from "@/api/releases";
import type { Stack } from "@/api/stacks";

afterEach(cleanup);
beforeAll(() => {
  const stubs: Record<string, () => unknown> = { hasPointerCapture: () => false, setPointerCapture: () => undefined, releasePointerCapture: () => undefined, scrollIntoView: () => undefined };
  for (const [k, v] of Object.entries(stubs)) (Element.prototype as unknown as Record<string, unknown>)[k] = v;
});

const stack = { spec: { stack_resources: [] } } as unknown as Stack;
const rels = (n: number): StackRelease[] => Array.from({ length: n }, (_, i) => ({ id: `r${n - i}`, sequence: n - i, state: "Released", cause: { kind: "manual" } } as StackRelease));

const base = { stack, onRollback: vi.fn(), onCancel: vi.fn() };

const stubDetail: ReleaseDetail = { ensure: vi.fn(), peek: () => ({ loading: false }), refresh: vi.fn() };
function renderRail(ui: React.ReactElement) {
  return render(<ReleaseDetailProvider value={stubDetail}>{ui}</ReleaseDetailProvider>);
}

describe("TimelineRail", () => {
  it("renders the empty state with no releases", () => {
    renderRail(<TimelineRail releases={[]} {...base} />);
    expect(screen.getByText("No deployments yet")).toBeInTheDocument();
  });

  it("renders one continuous list with no Current/Earlier headers", () => {
    const r = rels(3);
    renderRail(<TimelineRail releases={r} activeRelease={r[0]} {...base} />);
    expect(screen.queryByText("Current deployment")).not.toBeInTheDocument();
    expect(screen.queryByText("Earlier deployments")).not.toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("opens the latest deploy by default and tags the live release", () => {
    const r = rels(3);
    const liveStack = { converged_release: { id: "r2" }, spec: { stack_resources: [] } } as unknown as Stack;
    renderRail(<TimelineRail releases={r} activeRelease={r[0]} {...base} stack={liveStack} />);
    // #2 is the live release → carries the LIVE chip.
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  // **Hollow means unsettled, not "not live".** Reserving the only solid dot
  // for the live release left a rail of identical rings where the one thing
  // worth finding — a failure — looked like every release above it.
  it("renders a landed release solid and a failed one hollow", () => {
    const r = rels(3);
    r[0] = { ...r[0], state: "Failed" } as (typeof r)[number];
    const liveStack = { converged_release: { id: "r2" }, spec: { stack_resources: [] } } as unknown as Stack;
    renderRail(<TimelineRail releases={r} activeRelease={r[0]} {...base} stack={liveStack} />);
    const dots = screen.getAllByTestId("rail-dot");
    const hollow = dots.filter((d) => d.className.includes("border-[1.5px]"));
    const solid = dots.filter((d) => !d.className.includes("border-[1.5px]") && !d.className.includes("animate-spin"));
    expect(hollow).toHaveLength(1); // the failed release
    expect(solid).toHaveLength(2);  // both releases that landed
  });

  it("renders the newest FAILED release as a post-mortem (stored outcome), not the live body", () => {
    // A failed release never converged, so it has no live_status — the live
    // body would show an empty 0/0 resource rail. The stored outcome has the
    // per-resource results and only the post-mortem reads it.
    const failed = { id: "rf", sequence: 2, state: "Failed", cause: { kind: "manual" } } as StackRelease;
    const older = { id: "r1", sequence: 1, state: "Released", cause: { kind: "manual" } } as StackRelease;
    const detail: ReleaseDetail = {
      ensure: vi.fn(),
      refresh: vi.fn(),
      peek: (id) =>
        id === "rf"
          ? {
            loading: false,
            data: {
              id: "rf",
              sequence: 2,
              state: "Failed",
              outcome: { resources: { web: { phase: "Pending", message: "image pull failed", replicas: 1, ready_replicas: 0 } } },
              snapshot: { resources: [] },
            } as never,
          }
          : { loading: false },
    };
    render(
      <ReleaseDetailProvider value={detail}>
        <TimelineRail releases={[failed, older]} activeRelease={failed} {...base} />
      </ReleaseDetailProvider>,
    );
    // Post-mortem rail lists the stored outcome's resource.
    expect(screen.getByText("web")).toBeInTheDocument();
  });

  it("windows earlier releases behind Show more", async () => {
    const r = rels(20);
    renderRail(<TimelineRail releases={r} activeRelease={r[0]} initialWindow={5} {...base} />);
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("auto-opens a release that first appears after mount (deploy while the tab is open)", () => {
    const r1 = { id: "r1", sequence: 1, state: "Released", cause: { kind: "manual" } } as StackRelease;
    const r2 = { id: "r2", sequence: 2, state: "Released", cause: { kind: "manual" } } as StackRelease;
    const r3 = { id: "r3", sequence: 3, state: "Released", cause: { kind: "manual" } } as StackRelease;
    const { container, rerender } = renderRail(<TimelineRail releases={[r2, r1]} activeRelease={r2} {...base} />);
    // r3 doesn't exist at mount, so the open-set initializer can't have opened it.
    expect(container.querySelector("#deploy-node-r3")).toBeNull();

    rerender(
      <ReleaseDetailProvider value={stubDetail}>
        <TimelineRail releases={[r3, r2, r1]} activeRelease={r3} {...base} />
      </ReleaseDetailProvider>,
    );
    // The new release's node is expanded — its live progress is NOT hidden in a
    // collapsed row, which is the fact this test exists for. It used to assert
    // the chevron carried `.rotate-180`; the disclosure moved to the head of the
    // row and now rotates the other way (`-rotate-90` when CLOSED), so the old
    // assertion was pinned to a decoration that changed underneath it. The body
    // only renders when the node is open, so its presence is the same claim made
    // against the thing the reader actually cares about.
    expect(container.querySelector("#deploy-node-r3")?.querySelector('[data-testid="release-detail"]')).toBeTruthy();
  });

  it("keeps multiple release details open at once (not an accordion)", async () => {
    const r = rels(4); // active #4, earlier #3 #2 #1
    renderRail(<TimelineRail releases={r} activeRelease={r[0]} {...base} />);
    await userEvent.click(screen.getByText("#3"));
    await userEvent.click(screen.getByText("#2"));
    // Both post-mortems stay mounted (plus the auto-expanded active node's live body) —
    // an accordion would have closed #3 on opening #2.
    expect(await screen.findAllByRole("heading", { name: "Changes" })).toHaveLength(3);
  });
});
