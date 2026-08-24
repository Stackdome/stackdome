// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CanvasControls } from "../canvas-controls";

afterEach(cleanup);

// SidebarProvider's mobile detection needs matchMedia, which jsdom lacks.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

function Harness({
  onAutoLayout = () => {},
  showConnections = true,
}: {
  onAutoLayout?: () => void;
  showConnections?: boolean;
}) {
  return (
    <SidebarProvider>
      <ReactFlowProvider>
        <CanvasControls
          showConnections={showConnections}
          onToggleConnections={() => {}}
          onAutoLayout={onAutoLayout}
        >
          <button type="button">Add resource</button>
        </CanvasControls>
      </ReactFlowProvider>
    </SidebarProvider>
  );
}

describe("CanvasControls", () => {
  // **The grouping is the design, so it is the test.** Three islands sorted by
  // what each acts on — the viewport, the drawing, the stack's contents. The
  // previous assertion ("connections is the panel's last control") described a
  // single bar that no longer exists, and it would still pass against any
  // arrangement that happened to put the toggle last.
  it("sorts the controls into three islands by what each acts on", () => {
    render(<Harness />);
    const row = screen.getByRole("button", { name: "Zoom out" }).closest("div")!.parentElement!;
    const islands = [...row.children];
    expect(islands).toHaveLength(3);

    const labels = islands.map((i) =>
      [...i.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? b.textContent),
    );
    expect(labels[0]).toEqual(["Zoom out", "Reset zoom to 100%", "Zoom in"]);
    expect(labels[1]).toEqual(["Auto layout", "Hide connections"]);
    expect(labels[2]).toEqual(["Add resource"]);
  });

  // The readout is the only route back to 1:1 now that `Fit to view` is gone —
  // so it has to be a button with a name, not a number.
  it("reports the zoom level as the reset control", () => {
    render(<Harness />);
    const readout = screen.getByRole("button", { name: "Reset zoom to 100%" });
    expect(readout).toHaveTextContent("100%");
  });

  // Hover is 4% and selected is 6% (§4). They were both 6%, which made a button
  // under the pointer indistinguishable from the toggle that was on — so the
  // pressed state has to come from a class, not from `:hover`.
  it("gives the connections toggle a resting face only when it is on", () => {
    const { rerender } = render(<Harness />);
    expect(screen.getByRole("button", { name: "Hide connections" }).className).toContain(
      "wash-selected",
    );

    rerender(<Harness showConnections={false} />);
    const off = screen.getByRole("button", { name: "Show connections" });
    expect(off.className).not.toContain("wash-selected");
    expect(off.className).toContain("wash-hover");
  });

  it("auto layout button fires the callback", () => {
    const onAutoLayout = vi.fn();
    render(<Harness onAutoLayout={onAutoLayout} />);
    fireEvent.click(screen.getByRole("button", { name: "Auto layout" }));
    expect(onAutoLayout).toHaveBeenCalled();
  });

  /**
   * **Zen mode is not on this branch, and this spec records that rather than
   * being deleted.**
   *
   * main shipped it — ⌘. or a button here collapsed the editor header and the
   * sidebar together, then refit the graph rather than rearranging it, which is
   * what the assertion below was protecting. The redesigned shell has no
   * collapsed flag to drive, so the button was not ported; `canvas-controls.tsx`
   * carries the three steps to finish it.
   *
   * Skipped, not removed: when the toggle comes back this is the spec that says
   * what it must not do.
   */
  it.skip("entering zen refits the view instead of rearranging the graph", () => {
    vi.useFakeTimers();
    const onAutoLayout = vi.fn();
    render(<Harness onAutoLayout={onAutoLayout} />);
    fireEvent.click(screen.getByRole("button", { name: "Zen mode" }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(onAutoLayout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
