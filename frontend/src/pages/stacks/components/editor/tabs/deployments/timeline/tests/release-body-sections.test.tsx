// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReleaseBodySections } from "../release-body-sections";
import type { SnapshotDiff } from "../../release-snapshot-diff";

afterEach(cleanup);

const emptyDiff: SnapshotDiff = { resources: [], volumes: [], connections: [] };
const diff: SnapshotDiff = {
  resources: [{ name: "web", change: "modified", sections: [{ kind: "configuration", rows: [{ key: "image", kind: "changed", from: "web:1", to: "web:2" }] }] }],
  volumes: [],
  connections: [],
};

function renderSections(props: Partial<React.ComponentProps<typeof ReleaseBodySections>> = {}) {
  return render(
    <ReleaseBodySections diff={diff} hasPrev prevSeq={12} {...props}>
      <div>outcomes-content</div>
    </ReleaseBodySections>,
  );
}

describe("ReleaseBodySections", () => {
  // These were `Outcomes | Changes` tabs; reading either one hid the other. The
  // point of the change is that no click is needed to see both.
  it("shows the diff and the console at the same time, with the change count", () => {
    renderSections();
    expect(screen.getByRole("heading", { name: "Changes" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByText("vs #12")).toBeInTheDocument();
    expect(screen.getByText("outcomes-content")).toBeInTheDocument();
  });

  it("shows the loading placeholder while the previous snapshot resolves", () => {
    renderSections({ loading: true });
    expect(screen.getByText("Loading changes…")).toBeInTheDocument();
    // The console is never behind the placeholder — only the diff is.
    expect(screen.getByText("outcomes-content")).toBeInTheDocument();
  });

  it("reads as initial release when there is no predecessor", () => {
    renderSections({ diff: emptyDiff, hasPrev: false, prevSeq: undefined });
    expect(screen.getByText("Initial release — nothing to compare.")).toBeInTheDocument();
    expect(screen.queryByText(/vs #/)).not.toBeInTheDocument();
  });
});
